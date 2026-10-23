import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)), privateRoot=path.resolve(root,'../private');
const story=JSON.parse(await readFile(path.join(privateRoot,'story.json'),'utf8'));
const password=(await readFile(path.join(privateRoot,'access.txt'),'utf8')).trim();
const output=path.join(privateRoot,'qa','miniature');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader'],executablePath:process.env.BROWSER_EXECUTABLE||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1223/chrome-win64/chrome.exe'):undefined)});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference'});
page.setDefaultTimeout(60000);const failures=[];
page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))failures.push(m.text())});
try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:4173/Elis_DG/');
  await page.getByLabel('Sana gönderilen parola').fill(password);await page.getByRole('button',{name:'Yolculuğu aç',exact:true}).click();
  await page.locator('canvas[data-webgl="ready"]').waitFor();
  await page.getByRole('button',{name:new RegExp(story.stops.coast.action)}).click();
  for(const member of story.crew){await page.locator('.crew-choices').getByRole('button',{name:new RegExp(member.name)}).click();await page.waitForTimeout(2300)}
  await page.screenshot({path:path.join(output,'normal-motion-boarded.png')});
  await page.getByRole('button',{name:new RegExp(story.stops.crew.action)}).click();
  await page.locator('.journey[data-stop="penguin"]').waitFor();
  // Ambient pause must not disable the user's game controls.
  await page.getByRole('button',{name:'Ortam hareketini duraklat',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Ortam hareketini duraklat',exact:true}).getAttribute('aria-pressed'),'true');
  const cdp=await page.context().newCDPSession(page);
  const center=async(name,id)=>{const b=await page.getByRole('button',{name,exact:true}).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2,id,radiusX:5,radiusY:5,force:1}};
  const f=await center('İleri git',0), j=await center('Zıpla',1);
  const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const distance=()=>page.locator('canvas').getAttribute('data-penguin-distance').then(Number);
  await send('touchStart',[f]);await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.penguinDistance)>.4);
  await send('touchCancel',[]);await page.waitForTimeout(250);const d=await distance();await page.waitForTimeout(400);
  assert.ok(Math.abs(await distance()-d)<.1,'Actual touch cancellation left movement held');
  await send('touchStart',[f]);
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.penguinDistance)>1.2);
  await send('touchStart',[f,j]);
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.penguinDistance)>2.9);
  await send('touchEnd',[]); await send('touchStart',[f]);
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.penguinDistance)>3.6);
  await send('touchStart',[f,j]);
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.penguinDistance)>5.2);
  await send('touchEnd',[]); await send('touchStart',[f]);
  await page.locator('.journey[data-stop="sailing"]').waitFor();await send('touchEnd',[]);
  await page.getByRole('button',{name:'Ortam hareketini duraklat',exact:true}).click();
  // Normal camera travel and reeling animation complete without shader exceptions.
  await page.locator('.assist-button').click();
  await page.getByRole('button',{name:story.stops.fishing.action,exact:true}).click();
  await page.getByRole('button',{name:/Çek!/}).click();await page.locator('.journey[data-stop="notebook"]').waitFor();
  await page.waitForTimeout(1900);await page.screenshot({path:path.join(output,'normal-motion-reeled-book.png')});
  const frames=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last=performance.now();function tick(now){times.push(now-last);last=now;if(times.length<40)requestAnimationFrame(tick);else resolve({meanFrameMs:times.slice(1).reduce((a,b)=>a+b,0)/39,samples:39})}requestAnimationFrame(tick)}));
  await writeFile(path.join(output,'software-renderer-frame-sample.json'),JSON.stringify(frames,null,2));
  assert.deepEqual(failures,[]);console.log('PASS: normal-motion boarding/reeling, actual simultaneous touch movement+jumps, touch cancellation, ambient pause preserves controls, no shader errors.');console.log(frames);
}finally{await browser.close()}
