import { chromium, webkit } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { encryptPackage } from '../scripts/vault-lib.mjs';
import { readOriginalAsset } from './voucher-original.mjs';
import { syntheticPdf } from './pdf-fixture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.resolve(root, '../private');
const password = (await readFile(path.join(privateRoot, 'access.txt'), 'utf8')).trim();
const story = JSON.parse(await readFile(path.join(privateRoot, 'story.json'), 'utf8'));
const output = path.join(privateRoot, 'qa', 'miniature');
await mkdir(output, { recursive: true });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/Elis_DG/';
const browserType = process.env.BROWSER === 'webkit' ? webkit : chromium;
const options = { headless: true };
if (browserType === chromium) {
  options.args = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'];
  if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
  else if (process.platform === 'win32') options.executablePath = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1223/chrome-win64/chrome.exe');
}
const browser = await browserType.launch(options);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(60000);
const failures = [], metrics = {};
page.on('pageerror', error => failures.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
await page.addInitScript(() => {
  const Native = window.AudioContext;
  window.__audioContexts = [];
  if (Native) window.AudioContext = class extends Native { constructor(...args) { super(...args); window.__audioContexts.push(this); } };
});
async function stop(name) { await page.locator(`.journey[data-stop="${name}"]`).waitFor(); await noOverflow(); console.log('Checked stop:', name); }
async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow'); }
async function enter(secret = password) {
  await page.getByLabel('Sana gönderilen parola').fill(secret);
  await page.getByRole('button', { name: 'Yolculuğu aç', exact: true }).click();
}
async function screenshot(name) { await page.screenshot({ path: path.join(output, `${browserType.name()}-${name}.png`) }); }
async function hotspot(id) {
  await page.waitForFunction(key => {
    const c = document.querySelector('canvas');
    return c?.dataset.hotspots && JSON.parse(c.dataset.hotspots)[key];
  }, id);
  const point = await page.locator('canvas').evaluate((canvas, key) => {
    const p = JSON.parse(canvas.dataset.hotspots)[key], r = canvas.getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }, id);
  assert.ok(point.x > 0 && point.x < 2000 && point.y > 0, `Unreachable hotspot ${id}`);
  await page.mouse.click(point.x, point.y);
}
async function metric(label) {
  // Renderer counters update after a frame; allow the new stop to render first.
  await page.waitForTimeout(400);
  metrics[label] = await page.locator('canvas').evaluate(canvas => ({ calls: Number(canvas.dataset.renderCalls), triangles: Number(canvas.dataset.triangles), width: canvas.width, height: canvas.height }));
}
async function gameProgress(attribute, amount) {
  await page.waitForFunction(({ attribute, amount }) => Number(document.querySelector('canvas')?.getAttribute(attribute)) >= amount, { attribute, amount });
}
async function quickToGifts() {
  await page.getByRole('button', { name: new RegExp(story.stops.coast.action) }).click();
  for (const member of story.crew) await page.locator('.crew-choices').getByRole('button', { name: new RegExp(member.name) }).click();
  await page.getByRole('button', { name: new RegExp(story.stops.crew.action) }).click();
  await page.locator('.assist-button').click(); await page.locator('.assist-button').click();
  await page.getByRole('button', { name: /Birlikte çekelim/ }).click();
  await page.locator('.action-tray').getByRole('button', { name: /Defteri aç/ }).click();
  await page.getByRole('button', { name: 'Sonraki defter sayfası' }).click();
  await page.getByRole('button', { name: 'Sonraki defter sayfası' }).click();
  await page.getByRole('button', { name: /Çiçeği kaldır/ }).click();
  for (const flower of story.flowers) await page.getByRole('button', { name: flower.label, exact: true }).click();
  await page.getByRole('button', { name: /Notu aç/ }).click(); await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(story.stops.garden.action) }).click();
  await stop('gifts');
}
try {
  await page.goto(base);
  assert.ok(!(await page.locator('body').innerText()).includes(story.recipient));
  await enter('deliberately-incorrect');
  await page.locator('#unlock-error').filter({ hasText: 'Açılamadı' }).waitFor();
  await enter(); await stop('coast');
  await page.locator('canvas[data-webgl="ready"]').waitFor();
  assert.equal(await page.evaluate(() => window.__audioContexts.length), 0, 'Audio autoplayed');
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  assert.ok(!(await page.content()).includes(password), 'Password remains in DOM');
  assert.equal(await page.getByRole('button', { name: 'Azaltılmış hareket', exact: true }).getAttribute('aria-pressed'), 'true');
  await metric('coast'); await screenshot('coast-laptop');
  if (await page.evaluate(() => !!window.AudioContext)) {
    await page.getByRole('button', { name: 'Sesi aç', exact: true }).click();
    await page.getByRole('button', { name: 'Sesi duraklat', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__audioContexts.at(-1).state), 'running');
    await page.getByRole('button', { name: 'Sesi duraklat', exact: true }).click();
  }
  await page.getByRole('button', { name: /Hadi gidelim/ }).click(); await stop('crew');
  // These are real raycast clicks, not calls to the reducer or DOM crew alternatives.
  for (let i = 0; i < story.crew.length; i++) {
    await hotspot(`crew-${i}`);
    await page.waitForFunction(count => document.querySelector('.journey').dataset.crewCount === String(count), i + 1);
  }
  await page.getByRole('button', { name: new RegExp(story.stops.crew.action) }).click(); await stop('penguin');
  // Real pier movement and jumps. Hold/release keyboard; two physical gaps must be crossed.
  await page.locator('#stop-title').focus();
  await page.keyboard.down('ArrowUp'); await gameProgress('data-penguin-distance', 1.3);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space'); await page.keyboard.down('ArrowUp');
  await gameProgress('data-penguin-distance', 2.8); await page.keyboard.up('Space');
  await gameProgress('data-penguin-distance', 3.6); await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space'); await page.keyboard.down('ArrowUp');
  await gameProgress('data-penguin-distance', 5.2); await page.keyboard.up('Space');
  await stop('sailing'); await page.keyboard.up('ArrowUp');
  await screenshot('sailing-laptop');
  // Pointer capture and cancel must release a held control.
  const forward = page.getByRole('button', { name: 'İleri git', exact: true });
  const buttonRect = await forward.boundingBox();
  await page.mouse.move(buttonRect.x + buttonRect.width / 2, buttonRect.y + buttonRect.height / 2);
  await page.mouse.down();
  await forward.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  await page.mouse.up();
  const beforeCancel = Number(await page.locator('canvas').getAttribute('data-route-progress'));
  await page.waitForTimeout(600);
  const afterCancel = Number(await page.locator('canvas').getAttribute('data-route-progress'));
  assert.ok(afterCancel - beforeCancel < .025, 'Pointer cancellation left a control held');
  await page.locator('#stop-title').focus();
  await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => Number(document.querySelector('canvas').dataset.routeX) < -1.4); await page.keyboard.up('ArrowLeft');
  await gameProgress('data-route-progress', .24);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => Number(document.querySelector('canvas').dataset.routeX) > 1.4); await page.keyboard.up('ArrowRight');
  await gameProgress('data-route-progress', .50);
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => Number(document.querySelector('canvas').dataset.routeX) < -.65); await page.keyboard.up('ArrowLeft');
  await gameProgress('data-route-progress', .77);
  await stop('fishing'); await page.keyboard.up('ArrowUp');
  await metric('fishing'); await screenshot('fishing-laptop');
  await hotspot('cast');
  await page.waitForFunction(() => document.querySelector('.journey').dataset.fishing === 'bite');
  await hotspot('reel'); await stop('notebook');
  await hotspot('notebook');
  await page.getByRole('dialog').waitFor();
  for (let i = 0; i < story.notebook.length; i++) {
    const images = page.locator('.keepsake-stickers img');
    await page.waitForFunction(() => document.querySelectorAll('.keepsake-stickers img').length === 4 && [...document.querySelectorAll('.keepsake-stickers img')].every(img => img.complete && img.naturalWidth > 0));
    assert.equal(await images.count(), story.notebook[i].stickers.length);
    if (i === 0) { await screenshot('notebook-laptop'); await page.locator('.keepsake-sticker').first().click(); }
    if (i < story.notebook.length - 1) await page.getByRole('button', { name: 'Sonraki defter sayfası' }).click();
  }
  await page.getByRole('button', { name: 'Önceki defter sayfası' }).click();
  await page.getByRole('button', { name: 'Sonraki defter sayfası' }).click();
  await page.getByRole('button', { name: /Çiçeği kaldır/ }).click(); await stop('garden');
  await metric('garden'); await screenshot('garden-laptop');
  for (let i = 0; i < 3; i++) { await hotspot(`flower-${i}`); await page.waitForFunction(count => document.querySelector('.journey').dataset.flowersCount === String(count), i + 1); }
  await hotspot('note'); await page.getByRole('dialog').waitFor();
  await page.locator('.pending-label').filter({ hasText: 'Kişisel not' }).waitFor();
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: new RegExp(story.stops.garden.action) }).click(); await stop('gifts');
  await hotspot('gift'); await page.getByRole('button', { name: 'Hediyeni aç', exact: true }).click();
  await page.locator('.pending-label').filter({ hasText: 'Kupon henüz' }).waitFor();
  assert.equal(await page.locator('.voucher a').count(), 0, 'Pending voucher fabricated a download');
  await page.locator('.mystery-parcel').click(); await page.getByText(story.parcel.hint, { exact: true }).waitFor();
  await screenshot('gifts-laptop');
  await page.keyboard.press('Escape');
  // Backward map visits preserve every discovery.
  await page.locator('.route-dots button').nth(5).click(); await stop('notebook');
  await page.locator('.action-tray').getByRole('button', { name: /Defteri aç/ }).click();
  assert.ok((await page.getByRole('dialog').innerText()).includes(story.notebook.at(-1).title));
  await page.keyboard.press('Escape');
  await page.locator('.route-dots button').nth(7).click(); await stop('gifts');
  for (const index of [2, 3]) {
    await page.locator('.route-dots button').nth(index).click();
    assert.equal(await page.locator('.game-controls').count(), 0, 'Completed game offered unresponsive controls');
    await page.getByRole('button', { name: /✓ Devam edelim/ }).click();
  }
  await page.locator('.route-dots button').nth(7).click(); await stop('gifts');
  for (const [width, height] of [[390,844],[360,640],[667,375],[1440,900]]) {
    await page.setViewportSize({ width, height }); await noOverflow();
    await page.getByRole('button', { name: /Harita/ }).click();
    const map = page.getByRole('dialog'); await map.waitFor();
    await page.getByRole('button', { name: 'Kapat', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /Harita/ }).evaluate(el => document.activeElement === el), true, 'Map focus not restored');
    await screenshot(`gifts-${width}x${height}`);
  }
  await page.locator('.route-dots button').nth(0).click(); await stop('coast');
  await page.setViewportSize({ width: 1440, height: 900 }); await screenshot('coast-desktop');
  // A lost WebGL context must leave state and accessible activity alternatives usable.
  await page.locator('canvas').evaluate(el => el.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await page.locator('.fallback-notice').waitFor(); assert.equal(await page.locator('canvas').count(), 0);
  await page.locator('.route-dots button').nth(7).click(); await stop('gifts');
  await page.locator('.action-tray').getByRole('button', { name: /Yeniden yola çık/ }).click(); await stop('coast');
  assert.equal(await page.locator('.journey').getAttribute('data-crew-count'), '0');
  await quickToGifts(); // all assist/skip paths also work with no canvas
  await page.getByRole('button', { name: 'Yolculuğu kilitle', exact: true }).click();
  await page.getByLabel('Sana gönderilen parola').waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes(story.recipient));
  if (await page.evaluate(() => window.__audioContexts.length)) assert.equal(await page.evaluate(() => window.__audioContexts.at(-1).state), 'closed');
  await enter(); await stop('coast'); await page.reload(); await page.getByLabel('Sana gönderilen parola').waitFor();
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0,0]);

  // Full v2 fixture: ready voucher download keeps source bytes despite a different download filename.
  const fixtureDirectory = path.join(output, 'voucher-fixture'); await mkdir(fixtureDirectory, { recursive: true });
  const originalName = 'synthetic-original.pdf', downloadName = 'different-download-name.pdf';
  const originalBytes = syntheticPdf();
  await writeFile(path.join(fixtureDirectory, originalName), originalBytes);
  const fixturePassword = 'synthetic-voucher-test-password';
  const fixtureStory = { ...story, note: { status: 'ready', paragraphs: Array.from({ length: 6 }, () => 'Türkçe karakter testi: Çiçek, ışık, güven, öğleden sonra. '.repeat(5)) }, voucher: { status: 'ready', title: 'Test voucher', description: 'Synthetic browser-only fixture.', assetId: 'synthetic-original', filename: downloadName } };
  const imageBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path fill="#9bc" d="M0 0h10v10H0z"/></svg>');
  const fixture = await encryptPackage(fixtureStory, [ ...story.stickers.map(s => ({ id: s.id, mime:'image/svg+xml', filename: `${s.id}.svg`, bytes: imageBytes })), { id: 'synthetic-original', filename: originalName, mime: 'application/pdf', bytes: originalBytes } ], fixturePassword);
  await page.route('**/locked/**', route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1);
    if (name === 'manifest.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture.manifest) });
    const bytes = fixture.files.get(name);
    return bytes ? route.fulfill({ contentType: 'application/octet-stream', body: Buffer.from(bytes) }) : route.fulfill({ status:404 });
  });
  await enter(fixturePassword); await stop('coast');
  await page.getByRole('button', { name: '2B görünümü aç', exact: true }).click();
  await quickToGifts();
  await page.setViewportSize({ width:360, height:640 });
  await page.locator('.route-dots button').nth(6).click();
  await page.getByRole('button', { name: /Notu aç/ }).click();
  await page.locator('.personal-letter p').last().scrollIntoViewIfNeeded();
  assert.ok(await page.locator('.personal-letter p').last().isVisible());
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.locator('.route-dots button').nth(7).click();
  await page.locator('.action-tray .primary-button').click();
  await page.getByRole('button', { name:'Hediyeni aç', exact:true }).click();
  await page.locator('.voucher a[download]').waitFor();
  const downloadPromise = page.waitForEvent('download'); await page.locator('.voucher a[download]').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), downloadName);
  assert.deepEqual(await readFile(await download.path()), await readOriginalAsset(fixtureDirectory, 'synthetic-original'));
  const openLink = page.locator('.voucher a[target="_blank"]');
  assert.ok((await openLink.getAttribute('href')).startsWith('blob:'));
  const openDownload = browserType === webkit && process.platform === 'win32' ? page.waitForEvent('download') : undefined;
  const popupPromise = page.waitForEvent('popup'); await openLink.click();
  const popup = await popupPromise; await popup.waitForLoadState();
  if (openDownload) {
    const opened = await openDownload;
    assert.deepEqual(await readFile(await opened.path()), originalBytes, 'Opening the voucher changed its bytes');
    metrics.pdfAccess = 'Windows WebKit delivered the PDF open action as an exact-byte download. Physical Safari opening of the real voucher remains pending.';
  } else assert.ok(popup.url().startsWith('blob:'), 'Voucher did not open its decrypted browser URL');
  await popup.close();
  assert.deepEqual(failures, [], 'Browser errors/failed requests');
  await writeFile(path.join(output, `${browserType.name()}-metrics.json`), JSON.stringify(metrics,null,2));
  console.log('PASS: actual 3D crew/fishing/notebook/flowers/gift clicks, penguin jumps, steered buoy route, cancelled touch controls, all assists, notebook pages/12stickers, map revisit/focus, mobile/landscape/desktop, context loss, pending inputs, long note, exact original voucher download/open, audio and refresh lock.');
  console.log(JSON.stringify(metrics));
} finally { await browser.close(); }
