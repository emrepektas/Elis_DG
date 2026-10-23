import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error The packager is an executable native JavaScript module.
import { encryptPackage, ITERATIONS } from '../scripts/vault-lib.mjs';
import { unlock } from '../src/crypto.ts';

const password = 'synthetic-test-password-not-a-real-secret';
const exactBytes = Uint8Array.from([0, 1, 2, 255, 195, 177, 0, 27, 128]);
const fixture = await encryptPackage({ title: 'Synthetic fixture', scenes: [] }, [{ id: 'fixture', mime: 'application/pdf', filename: 'original.pdf', bytes: exactBytes }], password);
const originalFetch = globalThis.fetch;
function serve(manifest = fixture.manifest, alter?: (bytes: Uint8Array) => Uint8Array) {
  const requests: string[] = [];
  globalThis.fetch = (async (url: string) => {
    requests.push(String(url));
    if (String(url) === '/test/locked/manifest.json') return Response.json(manifest);
    const file = fixture.files.get(String(url).split('/').at(-1));
    return file ? new Response((alter ? alter(file.slice()) : file.slice()).buffer as ArrayBuffer) : new Response(null, { status: 404 });
  }) as typeof fetch;
  return requests;
}

test('native browser decryption roundtrips original bytes and caches concurrent requests', async () => {
  const requests = serve();
  try {
    const vault = await unlock(password, '/test/');
    assert.equal(vault.story.title, 'Synthetic fixture');
    const [one, two] = await Promise.all([vault.assetBytes('fixture'), vault.assetBytes('fixture')]);
    assert.deepEqual(one.bytes, exactBytes);
    assert.equal(one.mime, 'application/pdf');
    assert.equal(one.filename, 'original.pdf');
    assert.equal(requests.length, 3);
    one.bytes[0] = 90;
    assert.deepEqual(two.bytes, exactBytes);
    const [firstUrl, secondUrl] = await Promise.all([vault.assetUrl('fixture'), vault.assetUrl('fixture')]);
    assert.equal(firstUrl, secondUrl);
    assert.ok(firstUrl.startsWith('blob:'));
    assert.deepEqual(new Uint8Array(await (await originalFetch(firstUrl)).arrayBuffer()), exactBytes);
    vault.dispose();
    await assert.rejects(originalFetch(firstUrl));
    await assert.rejects(vault.assetBytes('fixture'));
    await assert.rejects(vault.assetUrl('fixture'));
  } finally { globalThis.fetch = originalFetch; }
});

test('wrong password is rejected', async () => {
  serve();
  try { await assert.rejects(unlock('wrong-password', '/test/')); }
  finally { globalThis.fetch = originalFetch; }
});

test('modified ciphertext fails authenticated decryption', async () => {
  serve(fixture.manifest, bytes => { bytes[0] ^= 1; return bytes; });
  try { await assert.rejects(unlock(password, '/test/')); }
  finally { globalThis.fetch = originalFetch; }
});

test('asset tampering is rejected even after a successful unlock', async () => {
  serve();
  try {
    const vault = await unlock(password, '/test/');
    serve(fixture.manifest, bytes => { bytes[bytes.length - 1] ^= 1; return bytes; });
    await assert.rejects(vault.assetBytes('fixture'));
    vault.dispose();
  } finally { globalThis.fetch = originalFetch; }
});

test('manifest traversal and weakened KDF are rejected before fetching ciphertext', async () => {
  for (const manifest of [
    { ...fixture.manifest, payload: { ...fixture.manifest.payload, path: '../private/story.json' } },
    { ...fixture.manifest, kdf: { ...fixture.manifest.kdf, iterations: 1 } },
    { ...fixture.manifest, kdf: { ...fixture.manifest.kdf, salt: 'AA==' } },
  ]) {
    const requests = serve(manifest);
    try { await assert.rejects(unlock(password, '/test/')); assert.equal(requests.length, 1); }
    finally { globalThis.fetch = originalFetch; }
  }
});

test('package metadata and opaque filenames disclose no private text or filenames', async () => {
  assert.equal(fixture.manifest.kdf.iterations, ITERATIONS);
  assert.equal(Buffer.from(fixture.manifest.kdf.salt, 'base64').length, 16);
  assert.equal(Buffer.from(fixture.manifest.payload.iv, 'base64').length, 12);
  const metadata = JSON.stringify(fixture.manifest);
  for (const privateValue of ['fixture', 'original.pdf', 'Synthetic', password]) assert.ok(!metadata.includes(privateValue));
  for (const [filename, bytes] of fixture.files) {
    assert.match(filename, /^[a-f0-9]{32}\.bin$/);
    assert.ok(!new TextDecoder().decode(bytes).includes('Synthetic fixture'));
  }
  const other = await encryptPackage({ title: 'Synthetic fixture', scenes: [] }, [], password);
  assert.notEqual(other.manifest.kdf.salt, fixture.manifest.kdf.salt);
  assert.notEqual(other.manifest.payload.iv, fixture.manifest.payload.iv);
});

test('unknown IDs do not fetch arbitrary files', async () => {
  const requests = serve();
  try {
    const vault = await unlock(password, '/test/');
    await assert.rejects(vault.assetBytes('../private/access.txt'));
    await assert.rejects(vault.assetBytes('__proto__'));
    assert.equal(requests.length, 2);
    vault.dispose();
  } finally { globalThis.fetch = originalFetch; }
});
