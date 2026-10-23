import type { AssetData, Story, Vault } from './types';

const ITERATIONS = 600_000;
const opaquePath = /^[a-f0-9]{32}\.bin$/;
interface Entry { path: string; iv: string; mime: string; filename: string }
interface Manifest { version: number; kdf: { name: string; hash: string; iterations: number; salt: string }; payload: { path: string; iv: string } }
function buffer(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer as ArrayBuffer; }
function from64(value: string, size: number): Uint8Array {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Geçersiz paket.');
  const result = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  if (result.length !== size) throw new Error('Geçersiz paket.');
  return result;
}
function checkPath(path: string): void {
  if (typeof path !== 'string' || !opaquePath.test(path)) throw new Error('Geçersiz dosya yolu.');
}
async function checkedFetch(url: string): Promise<Response> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new Error('Dosya alınamadı. Bağlantını kontrol edip yeniden dene.');
  return response;
}

export async function unlock(password: string, baseUrl = import.meta.env?.BASE_URL ?? '/Elis_DG/'): Promise<Vault> {
  const base = `${baseUrl.replace(/\/$/, '')}/locked/`;
  const manifest = await (await checkedFetch(`${base}manifest.json`)).json() as Manifest;
  if (manifest.version !== 1 || manifest.kdf?.name !== 'PBKDF2' || manifest.kdf.hash !== 'SHA-256' || manifest.kdf.iterations !== ITERATIONS) throw new Error('Bu paket desteklenmiyor.');
  checkPath(manifest.payload?.path);
  const material = await crypto.subtle.importKey('raw', buffer(new TextEncoder().encode(password)), 'PBKDF2', false, ['deriveKey']);
  let key: CryptoKey | null = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: buffer(from64(manifest.kdf.salt, 16)), iterations: ITERATIONS }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  let active = true;
  const ensureActive = () => { if (!active) throw new Error('Yolculuk kapatıldı.'); };
  async function decrypt(entry: { path: string; iv: string }): Promise<Uint8Array> {
    ensureActive(); checkPath(entry.path);
    const iv = from64(entry.iv, 12);
    const encrypted = await (await checkedFetch(`${base}${entry.path}`)).arrayBuffer();
    ensureActive();
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buffer(iv) }, key!, encrypted);
    ensureActive();
    return new Uint8Array(decrypted);
  }
  const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await decrypt(manifest.payload))) as { story: Story; assetMap: Record<string, Entry> };
  if (!payload.story || !Array.isArray(payload.story.scenes) || !payload.assetMap || typeof payload.assetMap !== 'object') throw new Error('Eksik yolculuk paketi.');
  for (const entry of Object.values(payload.assetMap)) {
    checkPath(entry.path); from64(entry.iv, 12);
    if (typeof entry.mime !== 'string' || typeof entry.filename !== 'string' || /[\\/\r\n]/.test(entry.filename)) throw new Error('Geçersiz dosya bilgisi.');
  }
  const bytesCache = new Map<string, Promise<AssetData>>();
  const urlCache = new Map<string, Promise<string>>();
  const urls = new Set<string>();
  async function assetBytes(id: string): Promise<AssetData> {
    ensureActive();
    if (!Object.hasOwn(payload.assetMap, id)) throw new Error('Dosya bulunamadı.');
    let pending = bytesCache.get(id);
    if (!pending) {
      const entry = payload.assetMap[id];
      pending = decrypt(entry).then(bytes => ({ bytes, mime: entry.mime, filename: entry.filename }));
      bytesCache.set(id, pending);
      void pending.catch(() => bytesCache.delete(id));
    }
    const data = await pending;
    ensureActive();
    return { ...data, bytes: data.bytes.slice() };
  }
  return {
    story: payload.story,
    assetBytes,
    async assetUrl(id) {
      ensureActive();
      let pending = urlCache.get(id);
      if (!pending) {
        pending = assetBytes(id).then(data => {
          ensureActive();
          const url = URL.createObjectURL(new Blob([buffer(data.bytes)], { type: data.mime }));
          urls.add(url); return url;
        });
        urlCache.set(id, pending);
        void pending.catch(() => urlCache.delete(id));
      }
      const url = await pending; ensureActive(); return url;
    },
    dispose() { active = false; key = null; urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); urlCache.clear(); bytesCache.clear(); },
  };
}
