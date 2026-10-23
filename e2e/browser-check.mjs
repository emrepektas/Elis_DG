import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.resolve(root, '../private');
const password = (await readFile(path.join(privateRoot, 'access.txt'), 'utf8')).trim();
const story = JSON.parse(await readFile(path.join(privateRoot, 'story.json'), 'utf8'));
const output = path.join(privateRoot, 'qa');
await mkdir(output, { recursive: true });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173/Elis_DG/';
const options = { headless: true };
if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
else if (process.platform === 'win32') options.executablePath = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1223/chrome-win64/chrome.exe');
const browser = await chromium.launch(options);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const failures = [];
page.on('pageerror', error => failures.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
await page.addInitScript(() => {
  const Native = window.AudioContext;
  window.__audioContexts = [];
  if (Native) window.AudioContext = class extends Native { constructor(...args) { super(...args); window.__audioContexts.push(this); } };
});

async function noOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Horizontal document overflow');
}
async function sceneReady(index) {
  await page.locator('#scene-title').filter({ hasText: story.scenes[index].title }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.world-art img,.sticker img,.matching-image img,.traveling-penguin img')].every(image => image.complete && image.naturalWidth > 0));
  await noOverflow();
}
async function next(index) { await page.locator('.scene-navigation .next-button').click(); await sceneReady(index); }

try {
  await page.goto(base);
  await page.getByLabel('Parola', { exact: true }).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes(story.recipient), 'Personal content appears before unlock');
  await page.getByLabel('Parola', { exact: true }).fill('deliberately-incorrect-password');
  await page.getByRole('button', { name: 'Yolculuğu aç' }).click();
  await page.locator('#unlock-error').filter({ hasText: 'Açılamadı' }).waitFor();
  await page.getByLabel('Parola', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Yolculuğu aç' }).click();
  await sceneReady(0);
  assert.equal(await page.evaluate(() => window.__audioContexts.length), 0, 'Audio started without consent');
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0], 'Unexpected persistent browser state');
  assert.ok(!(await page.content()).includes(password), 'Password remains in DOM');
  await page.screenshot({ path: path.join(output, 'desktop-sea.png') });
  await page.getByRole('button', { name: 'Sesi aç', exact: true }).click();
  await page.getByRole('button', { name: 'Sesi duraklat', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__audioContexts.at(-1).state), 'running');
  await page.getByRole('button', { name: 'Sesi duraklat', exact: true }).click();
  await page.getByRole('button', { name: 'Sesi aç', exact: true }).waitFor();

  for (let index = 1; index < story.scenes.length; index++) {
    await next(index);
    const scene = story.scenes[index];
    if (scene.kind === 'penguin') {
      for (const label of story.activities.penguin.steps) await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByText(story.activities.penguin.done, { exact: true }).waitFor();
    }
    if (scene.kind === 'matching') {
      const game = page.locator('.matching-game');
      for (let round = 0; round < story.activities.matching.rounds.length; round++) {
        const item = story.activities.matching.rounds[round];
        if (round === 0) {
          const wrong = item.owner === story.sender ? story.recipient : story.sender;
          await game.getByRole('button', { name: wrong, exact: true }).click();
          await game.getByText(story.activities.matching.tryAgain, { exact: true }).waitFor();
        }
        await game.getByRole('button', { name: item.owner, exact: true }).click();
        await game.getByRole('button', { name: round === story.activities.matching.rounds.length - 1 ? 'Tamamla' : 'Sıradaki sticker', exact: false }).click();
      }
      await game.getByText(story.activities.matching.done, { exact: false }).waitFor();
      await page.screenshot({ path: path.join(output, 'desktop-scrapbook.png') });
    }
    if (scene.kind === 'stats') {
      await page.locator('.notebook-button').click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.ok((await dialog.innerText()).includes(story.stats.period));
      for (const item of story.stats.items) assert.ok((await dialog.innerText()).includes(item.value));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await page.locator('.notebook-button').evaluate(element => element === document.activeElement), true, 'Notebook focus was not restored');
    }
    if (scene.kind === 'flowers') {
      for (const item of story.activities.flowers.items) await page.getByRole('button', { name: item.label, exact: true }).click();
      await page.getByText(story.activities.flowers.done, { exact: true }).waitFor();
      await page.screenshot({ path: path.join(output, 'desktop-garden.png') });
    }
    if (scene.kind === 'letter') {
      await page.locator('.letter-toggle').click();
      assert.equal(await page.locator('.personal-letter p').count(), story.letter.length + 1);
      await page.locator('.letter-signature').scrollIntoViewIfNeeded();
      assert.ok(await page.locator('.letter-signature').isVisible());
    }
    if (scene.kind === 'voucher') {
      await page.locator('.voucher-envelope').click();
      if (story.voucher.status === 'pending') {
        await page.locator('.pending-label').waitFor();
        assert.equal(await page.locator('.voucher a').count(), 0, 'Pending voucher offered a fabricated redemption action');
      } else if (story.voucher.assetId) {
        const downloadPromise = page.waitForEvent('download');
        await page.locator('.voucher a[download]').click();
        const download = await downloadPromise;
        const actual = await readFile(await download.path());
        const expected = await readFile(path.join(privateRoot, 'assets', story.voucher.filename));
        assert.deepEqual(actual, expected, 'Voucher download changed original bytes');
      }
    }
    if (scene.kind === 'parcel') {
      await page.locator('.mystery-parcel').click();
      await page.getByText(story.parcel.hint, { exact: true }).waitFor();
    }
  }
  await page.getByRole('button', { name: /Yeniden yolculuk et/ }).click();
  await sceneReady(0);
  // Every game can be skipped using normal navigation, independent of completion.
  await next(1); await next(2); await next(3);
  await page.locator('.back-button').click(); await sceneReady(2);
  await page.getByRole('button', { name: 'Yolculuğu kilitle', exact: true }).click();
  await page.getByLabel('Parola', { exact: true }).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes(story.recipient));
  assert.equal(await page.evaluate(() => window.__audioContexts.at(-1).state), 'closed', 'Lock did not dispose audio');
  await page.getByLabel('Parola', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Yolculuğu aç' }).click();
  await sceneReady(0);
  await page.reload();
  await page.getByLabel('Parola', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  assert.deepEqual(failures, [], 'Browser errors or failed HTTP requests');
  console.log('PASS: 15 scenes, all games, skip/back/replay, stats/focus, letter scrolling, voucher state, parcel, audio consent/disposal, refresh lock, no browser errors.');
} finally { await browser.close(); }
