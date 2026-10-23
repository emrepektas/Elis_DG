import { webcrypto, randomBytes } from 'node:crypto';

export const ITERATIONS = 600_000;
export const opaquePattern = /^[a-f0-9]{32}\.bin$/;
export async function makeKey(password, salt) {
  const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptPackage(story, assets, password) {
  const salt = randomBytes(16);
  const key = await makeKey(password, salt);
  const files = new Map();
  const usedNonces = new Set();
  async function add(bytes) {
    let iv;
    do { iv = randomBytes(12); } while (usedNonces.has(iv.toString('hex')));
    usedNonces.add(iv.toString('hex'));
    let filename;
    do { filename = `${randomBytes(16).toString('hex')}.bin`; } while (files.has(filename));
    files.set(filename, new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)));
    return { path: filename, iv: iv.toString('base64') };
  }
  const assetMap = Object.create(null);
  for (const asset of assets) {
    if (!asset.id || Object.hasOwn(assetMap, asset.id)) throw new Error('Asset identifiers must be unique.');
    if (!asset.filename || /[\\/\r\n]/.test(asset.filename)) throw new Error('Invalid asset filename.');
    assetMap[asset.id] = { ...await add(asset.bytes), mime: asset.mime, filename: asset.filename };
  }
  const payload = await add(new TextEncoder().encode(JSON.stringify({ story, assetMap })));
  return {
    files,
    manifest: { version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: salt.toString('base64') }, payload },
  };
}
