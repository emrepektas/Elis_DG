import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { encryptPackage } from './vault-lib.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.resolve(root, '../private');
const story = JSON.parse(await readFile(path.join(privateRoot, 'story.json'), 'utf8'));
if (!Array.isArray(story.scenes) || story.scenes.length !== 15) throw new Error('The journey must contain 15 scenes.');
if (!story.sender || !story.recipient || !story.voucher || !story.activities) throw new Error('Incomplete story.');
const types = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const entries = await readdir(path.join(privateRoot, 'assets'), { withFileTypes: true });
const assets = [];
for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!types[ext]) throw new Error(`Unsupported asset extension: ${ext}`);
  assets.push({ id: path.parse(entry.name).name, filename: entry.name, mime: types[ext], bytes: await readFile(path.join(privateRoot, 'assets', entry.name)) });
}
const known = new Set(assets.map(a => a.id));
const referenced = [
  ...story.scenes.flatMap(s => [s.background, ...s.stickers]),
  ...story.activities.matching.rounds.map(r => r.asset),
  ...(story.voucher.assetId ? [story.voucher.assetId] : []),
];
for (const id of referenced) if (!known.has(id)) throw new Error(`Missing referenced asset: ${id}`);
for (const round of story.activities.matching.rounds) {
  if (typeof round.alt !== 'string' || !round.alt.trim()) throw new Error('Matching images need neutral visual descriptions.');
  if ([story.sender, story.recipient].some(name => round.alt.toLocaleLowerCase('tr').includes(name.toLocaleLowerCase('tr')))) throw new Error('Matching image descriptions must not reveal their owner.');
}
if (story.voucher.status === 'ready' && !story.voucher.assetId && !story.voucher.code && !story.voucher.redemptionUrl) throw new Error('A ready voucher needs its redeemable material.');
if (story.voucher.redemptionUrl && !/^https:\/\//.test(story.voucher.redemptionUrl)) throw new Error('Voucher links must use HTTPS.');
const passwordPath = path.join(privateRoot, 'access.txt');
let password;
try { password = (await readFile(passwordPath, 'utf8')).trim(); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  password = randomBytes(24).toString('base64url');
  await writeFile(passwordPath, `${password}\n`, { flag: 'wx', mode: 0o600 });
}
if (password.length < 24) throw new Error('Use a strong password with at least 24 characters.');
const encrypted = await encryptPackage(story, assets, password);
const output = path.join(root, 'public', 'locked');
await mkdir(output, { recursive: true });
// Remove only recognized previous generated files; keep unrelated author files untouched.
for (const entry of await readdir(output)) {
  if (entry === 'manifest.json' || /^[a-f0-9]{32}\.bin$/.test(entry)) await rm(path.join(output, entry));
}
for (const [filename, bytes] of encrypted.files) await writeFile(path.join(output, filename), bytes);
await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(encrypted.manifest, null, 2)}\n`);
console.log(`Encrypted ${assets.length} assets and one story. Password retained in the local private folder.`);
