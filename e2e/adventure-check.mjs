import { chromium } from 'playwright';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { encryptPackage } from '../scripts/vault-lib.mjs';
import { syntheticPdf } from './pdf-fixture.mjs';
import { readOriginalAsset } from './voucher-original.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),priv=path.resolve(root,'../private');
const story=JSON.parse(await readFile(path.join(priv,'story.json'),'utf8'));
const password=(await readFile(path.join(priv,'access.txt'),'utf8')).trim();
const output=path.join(priv,'qa','third-person');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader'],executablePath:process.env.BROWSER_EXECUTABLE||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1223/chrome-win64/chrome.exe'):undefined)});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),page=await context.newPage();page.setDefaultTimeout(240000);
const failures=[];
page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))failures.push(m.text())});page.on('response',r=>{if(r.status()>=400)failures.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`)});
await page.addInitScript(()=>{const Native=window.AudioContext;window.__audioContexts=[];if(Native)window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioContexts.push(this)}}});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173/Elis_DG/';
const phase=async name=>{await page.locator(`.adventure[data-phase="${name}"]`).waitFor();await page.waitForFunction(phase=>!document.querySelector('canvas')||document.querySelector('canvas').dataset.phase===phase,name);console.log('Checked:',name)};
const shot=name=>page.screenshot({path:path.join(output,`${name}.png`)});
const enter=async(secret=password)=>{await page.getByLabel('Sana gönderilen parola').fill(secret);await page.getByRole('button',{name:'Yolculuğu aç',exact:true}).click()};
const data=()=>page.locator('canvas').evaluate(c=>({...c.dataset}));
async function opening(){await phase('welcome');await page.locator('canvas[data-phase=welcome]').waitFor();assert.ok(Number((await data()).cameraY)>30);await shot('cloud-opening');await page.getByRole('button',{name:'Başlayalım',exact:true}).click();await phase('choose');assert.equal(await page.getByRole('checkbox',{name:/hareket/i}).count(),0)}
async function menu(){if(!await page.locator('.game-menu').count())await page.getByRole('button',{name:'Oyun menüsü',exact:true}).click()}
async function capture(){if(await page.locator('.game-menu').count())await page.locator('.game-menu').getByRole('button',{name:'Devam et',exact:true}).click();if(!await page.evaluate(()=>!!document.pointerLockElement))await page.getByRole('button',{name:'Devam etmek için tıkla',exact:true}).click();await page.waitForFunction(()=>!!document.pointerLockElement)}
async function navigate(x,z){
 await capture();const held=new Set();
 try{for(let i=0;i<300;i++){
  const s=await data(),dx=x-Number(s.playerX),dz=z-Number(s.playerZ),yaw=Number(s.yaw);if(Math.hypot(dx,dz)<1.25)return;
  const right=dx*Math.cos(yaw)-dz*Math.sin(yaw),ahead=-dx*Math.sin(yaw)-dz*Math.cos(yaw);
  const wanted=new Set();if(Math.abs(right)>.4)wanted.add(right>0?'KeyD':'KeyA');if(Math.abs(ahead)>.4)wanted.add(ahead>0?'KeyW':'KeyS');
  for(const key of held)if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key)}for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key)}
  await page.waitForTimeout(100);
 }await shot('walking-failure');throw Error(`Walking did not reach ${x},${z}: ${JSON.stringify(await data())}; locked=${await page.evaluate(()=>!!document.pointerLockElement)}`);}finally{for(const key of held)await page.keyboard.up(key)}
}
async function finishJournal(){
 for(let i=0;i<3;i++){await page.waitForFunction(()=>document.querySelectorAll('.keepsake-stickers img').length===4&&[...document.querySelectorAll('.keepsake-stickers img')].every(i=>i.complete&&i.naturalWidth>0));if(i<2)await page.getByRole('button',{name:'Sonraki defter sayfası'}).click()}
 await page.getByRole('button',{name:'Çiçeği sakla ve devam et',exact:true}).click();
}
async function assistedToGifts(){
 await page.getByRole('button',{name:'Yola çık',exact:true}).click();await phase('coast');await page.waitForFunction(()=>!!document.pointerLockElement);
 // Pointer-lock Escape is browser-owned; headless keyboard injection does not
 // consistently dispatch that browser action. Exercise the same release API.
 await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);
 await page.locator('.game-menu').waitFor();await page.getByRole('checkbox',{name:'Yolu rehberle takip et',exact:true}).check();await page.locator('.game-menu').getByRole('button',{name:'Devam et',exact:true}).click();await phase('fish');await menu();await page.getByRole('button',{name:'Birlikte çekelim',exact:true}).click();
 await phase('notebook');await finishJournal();await phase('garden');await shot('garden-discoveries');
 for(let i=0;i<3;i++){await page.getByRole('dialog',{name:story.flowers[i].label,exact:true}).waitFor();await page.getByRole('button',{name:'Buketimde sakla',exact:true}).click()}
 await phase('gifts');await page.getByRole('dialog',{name:story.title,exact:true}).waitFor();
}
try{
 if(process.argv.includes('--replay-only')||process.argv.includes('--presentation-only')){
  if(process.argv.includes('--replay-only'))await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);await enter();await opening();await phase('choose');await page.waitForTimeout(600);await shot('selection-final');await assistedToGifts();
  if(process.argv.includes('--presentation-only')){
   await page.getByRole('button',{name:'Hediyeni aç',exact:true}).click();await page.locator('.voucher a[download]').waitFor();
   const expected=await readOriginalAsset(path.join(priv,'assets'),story.voucher.assetId);
   for(const viewport of [{width:1440,height:900},{width:390,height:844}]){await page.setViewportSize(viewport);const event=page.waitForEvent('download');await page.locator('.voucher a[download]').click();const downloaded=await event;assert.deepEqual(await readFile(await downloaded.path()),expected);const pop=page.waitForEvent('popup');await page.locator('.voucher a[target="_blank"]').click();const pdf=await pop;await pdf.waitForLoadState();assert.ok(pdf.url().startsWith('blob:'));await pdf.close();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
   await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'Bir sürpriz daha →',exact:true}).click();await page.getByRole('button',{name:'Kutlamaya geç',exact:true}).click();await phase('celebration');await page.waitForTimeout(1500);await shot('celebration-final');await page.waitForTimeout(1500);await shot('celebration-final-dance');
  }
 }else{
 await page.goto(base);assert.ok(!(await page.locator('body').innerText()).includes(story.recipient));await enter('wrong-password');await page.locator('#unlock-error').filter({hasText:'Açılamadı'}).waitFor();await enter();await opening();await phase('choose');await page.locator('canvas[data-phase=choose]').waitFor();
 assert.equal(await page.evaluate(()=>window.__audioContexts.length),0);assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);assert.ok(!(await page.content()).includes(password));
 for(const avatar of story.avatars){await page.getByRole('button',{name:avatar.name,exact:true}).click();assert.equal(await page.locator('.adventure').getAttribute('data-avatar'),avatar.id);await page.waitForTimeout(150)}
 await page.getByRole('button',{name:story.avatars.find(a=>a.id==='capybara').name,exact:true}).click();await shot('selection');
 await page.getByRole('button',{name:'Ayarlar ve yardım',exact:true}).click();await page.getByRole('checkbox',{name:'Ses ve müzik',exact:true}).check();assert.equal(await page.evaluate(()=>window.__audioContexts.at(-1).state),'running');await page.getByRole('checkbox',{name:'Ses ve müzik',exact:true}).uncheck();await page.locator('.game-menu').getByRole('button',{name:'Devam et',exact:true}).click();
 await page.getByRole('button',{name:'Yola çık',exact:true}).click();await phase('coast');await capture();assert.equal((await data()).cameraMode,'follow');
 // Real mouse movement changes the orbit; navigation still goes through the same WASD handlers.
 const yawBefore=Number((await data()).yaw);await page.mouse.move(800,420);await page.waitForTimeout(200);const yawAfter=Number((await data()).yaw);assert.notEqual(yawAfter,yawBefore,'Mouse-look did not respond');
 await navigate(3.5,-4);await shot('coast');await page.keyboard.press('KeyE');await phase('sail');assert.ok(await page.evaluate(()=>!!document.pointerLockElement),'Boarding unnecessarily released the mouse');await shot('boat');
 await phase('fish');await page.keyboard.press('KeyE');await page.getByText('Basılı tut: oltayı sar',{exact:true}).waitFor();await page.keyboard.down('KeyE');await phase('haul');await page.keyboard.up('KeyE');await phase('notebook');await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false,'Reading the notebook kept the mouse captured');await shot('notebook');await finishJournal();
 await page.locator('canvas[data-phase=night]').waitFor();await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.phaseTime)>1.2);assert.ok(Number((await data()).night)>.9);await shot('night-blanket');
 await page.waitForFunction(()=>document.querySelector('canvas').dataset.phase==='night'&&Number(document.querySelector('canvas').dataset.phaseTime)>19);assert.ok(Number((await data()).night)<.2);await shot('dawn');await phase('garden');await page.waitForTimeout(800);assert.equal((await data()).cameraMode,'follow');await shot('garden-arrival');
 for(let i=0;i<3;i++){await navigate(...[[46,1],[51,4],[56,-1]][i]);await page.keyboard.press('KeyE');await page.getByRole('dialog',{name:story.flowers[i].label,exact:true}).waitFor();assert.equal(await page.locator('.adventure').getAttribute('data-bouquet'),String(i+1));assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);await page.getByRole('button',{name:'Buketimde sakla',exact:true}).click();await page.waitForFunction(()=>!!document.pointerLockElement)}
 await shot('carried-bouquet');await navigate(60,-6);await shot('rainbow-clearing');await page.keyboard.press('KeyE');await phase('gifts');await page.getByRole('button',{name:'Hediyeni aç',exact:true}).click();if(story.voucher.status==='pending'){await page.locator('.voucher .pending-label').waitFor();assert.equal(await page.locator('.voucher a').count(),0)}else{await page.locator('.voucher a[download]').waitFor();const actual=await readOriginalAsset(path.join(priv,'assets'),story.voucher.assetId);const savedEvent=page.waitForEvent('download');await page.locator('.voucher a[download]').click();const downloaded=await savedEvent;assert.equal(downloaded.suggestedFilename(),story.voucher.filename);assert.deepEqual(await readFile(await downloaded.path()),actual);const opened=page.waitForEvent('popup');await page.locator('.voucher a[target="_blank"]').click();const pdfPage=await opened;await pdfPage.waitForLoadState();assert.ok(pdfPage.url().startsWith('blob:'));await pdfPage.close()}assert.equal(await page.locator('.mystery-parcel').count(),0);await page.getByRole('button',{name:'Bir sürpriz daha →',exact:true}).click();await page.locator('.mystery-parcel').click();await page.getByText(story.parcel.hint,{exact:true}).waitFor();await shot('gifts');
 if(!process.argv.includes('--motion')){
  await page.getByRole('button',{name:'Kapat',exact:true}).click();await phase('celebration');await page.waitForTimeout(800);await shot('celebration');await page.waitForTimeout(800);await shot('celebration-dance');await menu();await page.getByRole('button',{name:'Hatıralar',exact:true}).click();assert.equal(await page.locator('.collection-notes button').count(),3);await page.getByRole('button',{name:'Sticker defteri',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  for(const size of [{width:1280,height:720},{width:1366,height:768},{width:667,height:375},{width:390,height:844}]){await page.setViewportSize(size);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'Hediyeni yeniden aç',exact:true}).click();await page.getByRole('button',{name:'Kapat',exact:true}).click()}
  await menu();await page.getByRole('button',{name:'Yolculuğu kilitle',exact:true}).click();await page.getByLabel('Sana gönderilen parola').waitFor();assert.equal(await page.evaluate(()=>window.__audioContexts.at(-1).state),'closed');await enter();await opening();await phase('choose');await page.reload();await page.getByLabel('Sana gönderilen parola').waitFor();assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
  const pdf=syntheticPdf(),fixturePassword='synthetic-adventure-password';
  const fixtureStory={...story,note:{status:'ready',paragraphs:Array.from({length:5},()=>('Çiçek, ışık, güven, öğleden sonra. ').repeat(35))},voucher:{status:'ready',title:'Synthetic voucher',description:'Browser test fixture',assetId:'synthetic-original',filename:'different-download-name.pdf'}};
  const svg=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path fill="#aab" d="M0 0h10v10H0z"/></svg>');
  const fixture=await encryptPackage(fixtureStory,[...story.stickers.map(s=>({id:s.id,mime:'image/svg+xml',filename:`${s.id}.svg`,bytes:svg})),{id:'synthetic-original',mime:'application/pdf',filename:'source.pdf',bytes:pdf}],fixturePassword);
  await page.route('**/locked/**',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);if(name==='manifest.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(fixture.manifest)});const bytes=fixture.files.get(name);return bytes?route.fulfill({body:Buffer.from(bytes)}):route.fulfill({status:404})});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await enter(fixturePassword);await opening();await phase('choose');await assistedToGifts();
  await page.locator('.personal-letter p').last().scrollIntoViewIfNeeded();assert.ok(await page.locator('.personal-letter p').last().isVisible());await page.getByRole('button',{name:'Hediyeni aç',exact:true}).click();await page.locator('.voucher a[download]').waitFor();const down=page.waitForEvent('download');await page.locator('.voucher a[download]').click();const saved=await down;assert.equal(saved.suggestedFilename(),'different-download-name.pdf');assert.deepEqual(await readFile(await saved.path()),pdf);
  const popupPromise=page.waitForEvent('popup');await page.locator('.voucher a[target="_blank"]').click();const popup=await popupPromise;await popup.waitForLoadState();assert.ok(popup.url().startsWith('blob:'));await popup.close();
  await page.getByRole('button',{name:'Kapat',exact:true}).click();await phase('celebration');await menu();await page.getByRole('button',{name:'Baştan oyna',exact:true}).click();await opening();await page.getByRole('button',{name:'Yola çık',exact:true}).click();await phase('coast');await page.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await page.locator('.fallback-panel').waitFor();assert.equal(await page.locator('canvas').count(),0);
 }
 }
 if(await page.getByRole('button',{name:'Bir sürpriz daha →',exact:true}).isVisible())await page.getByRole('button',{name:'Bir sürpriz daha →',exact:true}).click();if(await page.locator('.gifts-sheet').count())await page.getByRole('button',{name:'Kutlamaya geç',exact:true}).click();
 await menu();await page.getByRole('button',{name:'Baştan oyna',exact:true}).click();await phase('welcome');await page.getByRole('button',{name:'Başlayalım',exact:true}).click();await phase('choose');assert.equal(await page.locator('.adventure').getAttribute('data-bouquet'),'0');
 if(await page.locator('canvas').count()){await page.locator('canvas[data-phase=choose]').waitFor();const reset=await data();assert.equal(Number(reset.playerX),-7);assert.equal(Number(reset.boatX),5);await page.getByRole('button',{name:'Yola çık',exact:true}).click();await phase('coast');assert.equal(await page.locator('.adventure').getAttribute('data-bouquet'),'0')}
 assert.deepEqual(failures,[]);await writeFile(path.join(output,process.argv.includes('--replay-only')?'replay-result.json':process.argv.includes('--presentation-only')?'presentation-result.json':'result.json'),JSON.stringify(process.argv.includes('--presentation-only')?{passed:true,cloudOpening:true,selectionVisible:true,celebration:true,realVoucherLaptopMobile:true,replayReset:true}:process.argv.includes('--replay-only')?{passed:true,assistedRoute:true,replayReset:true,playerReset:true,boatReset:true,bouquetReset:true}:{passed:true,viewport:'laptop',avatars:5,flowers:3,pointerLock:true,replayReset:true,mouseLook:true,keyboardNavigation:true,nightToDawn:true,notebookStickers:12},null,2));
 console.log(process.argv.includes('--presentation-only')?'PASS: cloud opening, character selection, assisted route, celebration, real voucher opening and exact-byte downloads at laptop/mobile widths, replay reset.':process.argv.includes('--replay-only')?'PASS: assisted route, replay to selection, player/boat/bouquet reset, and a fresh start.':'PASS: five avatars, pointer-lock mouse look, real WASD walking/boarding, sailing, held reeling, original sticker notebook, blanket/night/dawn, landing into follow-camera, garden picking and carried bouquet, rainbow gift, saved notes, replay access, audio consent, refresh lock and exact-byte voucher fixture.');
}catch(error){await shot('failure');await writeFile(path.join(output,'failure.json'),JSON.stringify({message:error.message,data:await data().catch(()=>null),body:await page.locator('body').innerText()},null,2));throw error}finally{await browser.close()}
