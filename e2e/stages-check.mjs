import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:'C:/Users/emrep/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:760}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173/Elis_DG/';
async function jump(label,phase){
 await page.getByRole('button',{name:'Oyun menüsü',exact:true}).click();
 await page.getByRole('navigation',{name:'Bölüme git'}).getByRole('button',{name:label,exact:true}).click();
 await page.locator(`.adventure[data-phase="${phase}"]`).waitFor();
 await page.locator(`canvas[data-phase="${phase}"]`).waitFor();
 assert.equal(await page.locator('.game-menu[open]').count(),0);
}
try{
 await page.goto(base);
 await page.getByLabel('Sana gönderilen parola').fill((await readFile(new URL('../../private/access.txt',import.meta.url),'utf8')).trim());
 await page.getByRole('button',{name:'Yolculuğu aç',exact:true}).click();
 await page.locator('.welcome-screen').waitFor();
 await page.getByRole('button',{name:'Oyun menüsü',exact:true}).click();
 assert.equal(await page.getByRole('navigation',{name:'Bölüme git'}).getByRole('button').count(),5);
 await page.getByLabel('Yolu rehberle takip et').check();
 await page.getByRole('navigation',{name:'Bölüme git'}).getByRole('button',{name:'Tekne yolculuğu',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('canvas')?.dataset.boatX)>6);
 await jump('Tekne yolculuğu','sail');
 assert.ok(Number(await page.locator('canvas').getAttribute('data-boat-x'))<6);
 assert.equal(await page.locator('canvas').getAttribute('data-gates'),'0');
 await jump('Kutlama','celebration');
 assert.equal(await page.locator('.adventure').getAttribute('data-keys'),'3');
 await page.getByRole('button',{name:'Hediyeni yeniden aç',exact:true}).click();
 await page.locator('.personal-letter').waitFor();
 assert.equal(await page.locator('.voucher,[download]').count(),0);
 await page.keyboard.press('Escape');await page.locator('.mystery-parcel').waitFor();await page.keyboard.press('Escape');
 await jump('Adada anahtar avı','garden');
 assert.equal(await page.locator('.adventure').getAttribute('data-keys'),'0');
 assert.equal(Number(await page.locator('canvas').getAttribute('data-player-x')),223);
 await page.locator('.dialogue-cinematic').waitFor();
 await jump('Gece yolculuğu','bedtime');
 assert.equal(Number(await page.locator('canvas').getAttribute('data-boat-x')),107);
 await page.locator('.dialogue-cinematic').waitFor();
 await jump('Başlangıç','welcome');await page.locator('.welcome-screen').waitFor();
 assert.equal(await page.locator('.adventure').getAttribute('data-keys'),'0');
 await page.getByRole('button',{name:'Oyun menüsü',exact:true}).click();
 assert.equal(await page.getByLabel('Yolu rehberle takip et').isChecked(),false);
 await page.screenshot({path:new URL('../../private/qa/stage-menu.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1').replaceAll('%20',' ')});
 assert.deepEqual(errors,[]);
 console.log('PASS: all five stage jumps, same-stage reset, correct boat/island spawns, key reset, letter access and no voucher.');
}finally{await browser.close()}
