import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { opaquePattern, ITERATIONS } from './vault-lib.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function audit(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'locked', 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.kdf?.iterations !== ITERATIONS || manifest.kdf.name !== 'PBKDF2' || manifest.kdf.hash !== 'SHA-256') throw new Error('Unexpected encryption metadata.');
  if (Buffer.from(manifest.kdf.salt, 'base64').length !== 16 || Buffer.from(manifest.payload.iv, 'base64').length !== 12 || !opaquePattern.test(manifest.payload.path)) throw new Error('Invalid encryption metadata.');
  const names = await readdir(path.join(directory, 'locked'));
  if (!names.includes(manifest.payload.path)) throw new Error('Missing encrypted story.');
  if (names.some(name => name !== 'manifest.json' && !opaquePattern.test(name))) throw new Error('Nonopaque published filename.');
  let privateStory;
  let password = '';
  try { privateStory = JSON.parse(await readFile(path.resolve(root, '../private/story.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { password = (await readFile(path.resolve(root, '../private/access.txt'), 'utf8')).trim(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const markers = [];
  const privateNames = privateStory ? [privateStory.sender, privateStory.recipient] : [];
  if (privateStory) {
    if(privateStory.welcomeTitle)markers.push(privateStory.welcomeTitle);
    markers.push(privateStory.title, ...Object.values(privateStory.stops).flatMap(stop => [stop.title, stop.hint]).filter(value => value.length > 20),
      ...privateStory.note.paragraphs.filter(p => p.length > 20), privateStory.parcel.hint,
      ...privateStory.flowers.map(flower => flower.message), ...privateStory.stickers.map(sticker => sticker.id),
      ...privateStory.crew.map(person => person.name), ...(privateStory.avatars??[]).map(person=>person.name), ...privateStory.motifs);
    if (privateStory.voucher.code) markers.push(privateStory.voucher.code);
    if (privateStory.voucher.redemptionUrl) markers.push(privateStory.voucher.redemptionUrl);
    if (privateStory.voucher.filename) markers.push(privateStory.voucher.filename);
  }
  if (password) markers.push(password);
  async function scan(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const target = path.join(folder, entry.name);
      if (entry.isDirectory()) { await scan(target); continue; }
      if (/\.(zip|pdf|map|png|jpe?g|webp|gif|mp3|ogg|wav)$/i.test(entry.name) || /access|story\.json|chat/i.test(entry.name)) throw new Error('Private or unsupported plaintext artifact.');
      if (!/\.(html|js|ts|tsx|css|json|txt|svg)$/i.test(entry.name)) continue;
      const text = await readFile(target, 'utf8');
      if (markers.some(marker => marker && text.toLocaleLowerCase('tr').includes(marker.toLocaleLowerCase('tr')))) throw new Error('Personal plaintext found in published application files.');
      for (const name of privateNames) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu').test(text)) throw new Error('Personal name found in published application files.');
      }
    }
  }
  await scan(directory);
  await scan(path.join(root, 'src'));
  console.log('Publication audit passed: opaque encrypted assets and no known personal plaintext.');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await audit(path.resolve(root, process.argv[2] || 'dist'));
