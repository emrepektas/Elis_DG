import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { encryptPackage } from './vault-lib.mjs';
import { referencedAssets, validateStory } from '../src/story-schema.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.resolve(root, '../private');
const story = JSON.parse(await readFile(path.join(privateRoot, 'story.json'), 'utf8'));
validateStory(story);
if (story.stickers.length !== 12) throw new Error('The personal journey must preserve all 12 unique stickers.');
const referenced = referencedAssets(story);
const types = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const entries = await readdir(path.join(privateRoot, 'assets'), { withFileTypes: true });
const assets = [];
for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isFile() || !referenced.includes(path.parse(entry.name).name)) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!types[ext]) throw new Error(`Unsupported asset extension: ${ext}`);
  assets.push({ id: path.parse(entry.name).name, filename: entry.name, mime: types[ext], bytes: await readFile(path.join(privateRoot, 'assets', entry.name)) });
}
const known = new Set(assets.map(a => a.id));
if (known.size !== assets.length) throw new Error('Referenced asset identifiers must be unique.');
for (const id of referenced) if (!known.has(id)) throw new Error(`Missing referenced asset: ${id}`);
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
