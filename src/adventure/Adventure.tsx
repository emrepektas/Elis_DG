import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Vault } from '../types';
import { JourneyAudio } from '../audio';
import { AssetImg } from '../components/AssetImg';
import { Voucher, Parcel } from '../components/Gift';
import type { AvatarId } from './Avatars';
import { cinematic, FLOWERS, GIFT, type Phase } from './logic';
import type { Input, Status } from './World';
const World=lazy(()=>import('./World'));
class Boundary extends Component<{children:ReactNode;failed:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(){this.props.failed()}render(){return this.state.failed?null:this.props.children}}
function Sheet({title,children,onClose,className=''}:{title:string;children:ReactNode;onClose:()=>void;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{ref.current?.close();if(previous?.isConnected)previous.focus()}},[]);
 return <dialog ref={ref} className={`journey-sheet ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose()}}><div className="sheet-heading"><h2>{title}</h2><button autoFocus className="icon-button" aria-label="Kapat" onClick={onClose}>×</button></div>{children}</dialog>;
}
const emptyStatus:Status={action:'',fish:'idle',reel:0,progress:0,night:0,x:-7,z:6,yaw:0,time:0};
const actionLabels:Record<string,string>={board:'Tekneye bin',cast:'Oltayı at',reel:'Basılı tut: oltayı sar',book:'Defteri aç',gift:'Hediyeyi aç','flowers-needed':'Önce üç notlu çiçeği topla'};
const phaseLabel:Partial<Record<Phase,string>>={board:'Açılıyoruz',haul:'Bir defter!',bedtime:'İyi geceler',arrival:'Günaydın'};
export default function Adventure({vault,lock}:{vault:Vault;lock:()=>void}){
 const{story}=vault;
 const[phase,setPhase]=useState<Phase>('welcome'),[avatar,setAvatar]=useState<AvatarId>('blue'),[flowers,setFlowers]=useState<number[]>([]);
 const[status,setStatus]=useState<Status>(emptyStatus),[locked,setLocked]=useState(false),[failed,setFailed]=useState(false),[assist,setAssist]=useState(false);
 const[journal,setJournal]=useState(false),[page,setPage]=useState(0),[note,setNote]=useState<number>(),[gift,setGift]=useState(false),[collection,setCollection]=useState(false),[menu,setMenu]=useState(false);
 const[reduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[hidden,setHidden]=useState(document.hidden),[skip,setSkip]=useState(0);
 const[sound,setSound]=useState(false),[audioError,setAudioError]=useState(''),[lockError,setLockError]=useState('');
 const audio=useRef<JourneyAudio|undefined>(undefined),input=useRef<Input>({keys:new Set(),yaw:0,pitch:.05,press:0});
 const root=useRef<HTMLDivElement>(null),hadCapture=useRef(false);
 const modal=journal||note!==undefined||gift||collection||menu;
 const controllable=['coast','sail','fish','garden','notebook'].includes(phase);
 const modalNow=useRef(modal),controllableNow=useRef(controllable);modalNow.current=modal;controllableNow.current=controllable;
 const blocked=hidden||modal||(controllable&&!locked&&!assist&&!failed);
 useEffect(()=>()=>audio.current?.dispose(),[]);
 useEffect(()=>{if(phase==='notebook')setJournal(true);if(phase==='gifts')setGift(true)},[phase]);
 useEffect(()=>{if(modal||['welcome','choose','celebration'].includes(phase)){input.current.keys.clear();document.exitPointerLock?.()}},[modal,phase]);
 useEffect(()=>{
  const change=()=>{const captured=document.pointerLockElement===root.current?.querySelector('canvas');setLocked(captured);if(!captured){input.current.keys.clear();if(hadCapture.current&&!modalNow.current&&controllableNow.current)setMenu(true)}hadCapture.current=captured};
  const move=(e:MouseEvent)=>{if(document.pointerLockElement){input.current.yaw-=e.movementX*.0024;input.current.pitch=Math.max(-.2,Math.min(.65,input.current.pitch-e.movementY*.0022))}};
  const down=(e:KeyboardEvent)=>{if(modal||!document.pointerLockElement||e.altKey||e.ctrlKey||e.metaKey)return;if(cinematic(phase)){if(e.code==='Space'&&!e.repeat){e.preventDefault();setSkip(n=>n+1)}return}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyE'].includes(e.code)){e.preventDefault();input.current.keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)input.current.press++;if(e.code!=='KeyE')setAssist(false)}};
  const up=(e:KeyboardEvent)=>input.current.keys.delete(e.code);
  const visibility=()=>{setHidden(document.hidden);input.current.keys.clear();if(document.hidden)void audio.current?.pause();else if(sound)void audio.current?.play().catch(()=>setSound(false))};
  const blur=()=>input.current.keys.clear();
  document.addEventListener('pointerlockchange',change);document.addEventListener('mousemove',move);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('pointerlockchange',change);document.removeEventListener('mousemove',move);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility)};
 },[modal,sound,phase]);
 function recapture(){(document.querySelector('dialog[open]') as HTMLDialogElement|null)?.close();void root.current?.querySelector('canvas')?.requestPointerLock?.()?.catch?.(()=>{})}
 async function capture(){if(modal||cinematic(phase)||failed)return;try{const canvas=root.current?.querySelector('canvas');if(!canvas?.requestPointerLock)throw Error();await canvas.requestPointerLock();setLockError('')}catch{setLockError('Fare kontrolü açılamadı. Menüden rehberi açabilirsin.')}}
 function interact(action:string){if(action==='board')setPhase('board');if(action==='book')setJournal(true);if(action==='gift'){setPhase('gifts');setGift(true)}const match=/^(flower|note)-(\d)$/.exec(action);if(match){const index=Number(match[2]);setFlowers(old=>old.includes(index)?old:[...old,index]);setNote(index)}}
 async function toggleAudio(){try{audio.current??=new JourneyAudio();if(sound)await audio.current.pause();else await audio.current.play();setSound(s=>!s);setAudioError('')}catch{setAudioError('Ses açılamadı. Yolculuğa devam edebilirsin.')}}
 function replay(){document.exitPointerLock?.();setFlowers([]);setPage(0);setJournal(false);setNote(undefined);setGift(false);setCollection(false);setMenu(false);setAssist(false);setStatus(emptyStatus);setPhase('welcome');input.current={keys:new Set(),yaw:0,pitch:.05,press:0}}
 function closeMenu(){setMenu(false);if(controllable&&!assist)recapture()}
 function fallbackNext(){const next:Partial<Record<Phase,Phase>>={descent:'choose',coast:'board',board:'sail',sail:'fish',fish:'haul',haul:'notebook',bedtime:'night',night:'arrival',arrival:'garden'};if(next[phase])setPhase(next[phase]!)}
 useEffect(()=>{if(failed&&cinematic(phase)){const timer=setTimeout(()=>fallbackNext(),500);return()=>clearTimeout(timer)}},[failed,phase]);
 const currentPage=story.notebook[page],action=status.action,picked=/^(flower|note)-(\d)$/.exec(action);
 const target=phase==='coast'?[3.8,-4]:FLOWERS.find((_,i)=>!flowers.includes(i))??GIFT;
 const compass=Math.atan2(-(target[0]-status.x),-(target[1]-status.z))-status.yaw;
 const discoveredBook=!['welcome','descent','choose','coast','board','sail','fish','haul'].includes(phase);
 function finishGift(){setGift(false);setPhase('celebration')}
 return <div ref={root} className={`adventure ${cinematic(phase)?'in-cinema':''} ${reduced?'reduce-motion':''}`} data-phase={phase} data-avatar={avatar} data-bouquet={flowers.length}>
  <div className="adventure-world" onClick={()=>{if(['welcome','descent','choose','celebration'].includes(phase))return;if(locked)input.current.press++;else void capture()}}>
   {!failed?<Boundary failed={()=>setFailed(true)}><Suspense fallback={<p className="world-loading">Dünya hazırlanıyor…</p>}><World phase={phase} avatar={avatar} story={story} flowers={flowers} input={input} blocked={blocked} motion={!reduced&&!hidden} reduced={reduced} skip={skip} assist={assist} onPhase={setPhase} onAvatar={setAvatar} onStatus={setStatus} onInteract={interact} onFailure={()=>setFailed(true)}/></Suspense></Boundary>:<div className="adventure-fallback"/>}
  </div>
  {!['welcome','choose','descent'].includes(phase)&&<header className="journey-header clean-header"><button className="menu-button" aria-label="Oyun menüsü" onClick={()=>setMenu(true)}>☰ <span>Menü</span></button></header>}
  {audioError&&<p className="audio-error" role="status">{audioError}</p>}
  {phase==='welcome'&&<section className="welcome-screen"><p className="welcome-kicker">Sana küçük bir yolculuk.</p><h1>{story.welcomeTitle??story.title}</h1><button className="primary-button" onClick={()=>setPhase('descent')}>Başlayalım <span aria-hidden="true">↓</span></button></section>}
  {phase==='choose'&&<section className="character-select game-selection"><div className="selection-heading"><p>Bir yol arkadaşı seç</p><h1>Kiminle yola çıkıyoruz?</h1></div><div className="selection-bottom"><div className="avatar-choices" role="group" aria-label="Karakterler">{story.avatars.map((person,index)=><button key={person.id} className={avatar===person.id?'selected':''} aria-pressed={avatar===person.id} onClick={()=>setAvatar(person.id)}><span className="choice-number" aria-hidden="true">{avatar===person.id?'✓':`0${index+1}`}</span>{person.name}</button>)}</div><div className="control-lesson"><span><kbd>W A S D</kbd> Yürü</span><span><kbd>Fare</kbd> Etrafına bak</span><span><kbd>E</kbd> Etkileşim</span><span><kbd>Esc</kbd> Menü</span></div><div className="selection-actions"><button className="text-button" onClick={()=>setMenu(true)}>Ayarlar ve yardım</button><button className="primary-button" onClick={()=>{setPhase('coast');void capture()}}>Yola çık <span aria-hidden="true">→</span></button></div></div></section>}
  {controllable&&!locked&&!assist&&!modal&&!failed&&<div className="resume-panel"><button className="primary-button" onClick={()=>void capture()}>Devam etmek için tıkla</button><p>WASD ile yürü · Fareyle bak · E ile etkileşime gir</p>{lockError&&<p role="status">{lockError}</p>}</div>}
  {(phase==='coast'||phase==='garden')&&!modal&&<div className="walking-goal"><span className="compass-arrow" style={{transform:`rotate(${-compass}rad)`}}>↑</span><span>{phase==='coast'?'İskeledeki tekneye bin':flowers.length<3?'Üzerinde not olan üç çiçeği bul':'Gökkuşağındaki hediyeyi aç'}</span></div>}
  {phase==='garden'&&!modal&&<div className="bouquet-counter" key={flowers.length} aria-label={`${flowers.length} çiçek toplandı`}><div className="bouquet-blooms">{[0,1,2].map(i=><span key={i} className={flowers.includes(i)?'collected':''}>✿</span>)}</div><div><strong>Buketin</strong><small>{flowers.length} / 3 çiçek</small></div></div>}
  {phase==='sail'&&<div className="boat-instructions"><span>Biraz açılalım.</span><small>W / S · Hız &nbsp; A / D · Dümen</small></div>}
  {action&&locked&&!modal&&<div className="interact-prompt"><kbd>E</kbd><span>{picked?(picked[1]==='flower'?'Notlu çiçeği al':'Notu yeniden oku'):actionLabels[action]}</span>{action==='reel'&&<div className="reel-track"><span style={{width:`${status.reel*100}%`}}/></div>}</div>}
  {phase==='fish'&&status.fish==='waiting'&&<div className="interact-prompt waiting"><span>Bir şey takıldı…</span></div>}
  {cinematic(phase)&&<>{phase!=='descent'&&<div className={`cinema-title cinema-${phase}`}><p>{phase==='night'?story.motifs[status.night>.5?0:1]:phaseLabel[phase]}</p></div>}<button className="cinema-skip" onClick={()=>setSkip(s=>s+1)}>Geç</button></>}
  {phase==='celebration'&&!gift&&<section className="celebration-screen"><h1>{story.title}</h1><p>— {story.sender}</p><button className="primary-button" onClick={()=>setGift(true)}>Hediyeni yeniden aç</button></section>}
  {failed&&!['welcome','choose','celebration'].includes(phase)&&<div className="fallback-panel"><p>3D görünüm açılamadı. Yolculuğa buradan devam edebilirsin.</p>{phase==='garden'?<>{story.flowers.map((flower,i)=><button key={i} onClick={()=>interact(`flower-${i}`)}>{flower.label}</button>)}{flowers.length===3&&<button onClick={()=>interact('gift')}>Gökkuşağındaki hediyeye git</button>}</>:phase==='notebook'?<button onClick={()=>setJournal(true)}>Defteri aç</button>:phase==='gifts'?<button onClick={()=>setGift(true)}>Hediyeni aç</button>:<button onClick={fallbackNext}>Devam et</button>}</div>}
  {menu&&<Sheet title="Oyun menüsü" className="game-menu" onClose={closeMenu}><div className="menu-settings"><label><span>Ses ve müzik</span><input type="checkbox" checked={sound} onChange={()=>void toggleAudio()}/></label><label><span>Yolu rehberle takip et</span><input type="checkbox" checked={assist} onChange={e=>setAssist(e.target.checked)}/></label></div><p className="menu-controls">WASD · Yürü &nbsp; Fare · Bak<br/>E · Etkileşim &nbsp; Shift · Koş &nbsp; Boşluk · Zıpla<br/>Esc · Menü</p><div className="menu-links">{discoveredBook&&<button onClick={()=>{setMenu(false);setCollection(true)}}>Hatıralar</button>}{phase==='fish'&&<button onClick={()=>{setMenu(false);setPhase('haul')}}>Birlikte çekelim</button>}<button onClick={replay}>Baştan oyna</button><button onClick={()=>{document.exitPointerLock?.();lock()}}>Yolculuğu kilitle</button></div><button className="primary-button" onClick={closeMenu}>Devam et</button></Sheet>}
  {journal&&<Sheet title={currentPage.title} className="notebook-sheet" onClose={()=>setJournal(false)}><div className="notebook-page" key={page}><p>{currentPage.text}</p><div className="keepsake-stickers">{currentPage.stickers.map(id=><button className="keepsake-sticker" key={id} onClick={e=>{if(reduced)return;e.currentTarget.animate([{transform:'rotate(-5deg) scale(1)'},{transform:'rotate(7deg) scale(1.15)'},{transform:'rotate(-5deg) scale(1)'}],{duration:450})}}><AssetImg vault={vault} id={id} alt={story.stickers.find(s=>s.id===id)?.alt??''}/></button>)}</div></div><div className="book-navigation"><button className="icon-button" aria-label="Önceki defter sayfası" disabled={page===0} onClick={()=>setPage(n=>n-1)}>←</button><span>{page+1} / 3</span>{page<2?<button className="primary-button" aria-label="Sonraki defter sayfası" onClick={()=>setPage(n=>n+1)}>Çevir</button>:<button className="primary-button" onClick={()=>{setJournal(false);if(phase==='notebook'){setPhase('bedtime');recapture()}}}>{phase==='notebook'?'Çiçeği sakla ve devam et':'Defteri kapat'}</button>}</div></Sheet>}
  {note!==undefined&&<Sheet title={story.flowers[note].label} className="flower-note-sheet" onClose={()=>setNote(undefined)}><span className="note-flower">✿</span><p>{story.flowers[note].message}</p><small className="picked-count">Buketinde {flowers.length} / 3 çiçek</small><button className="primary-button" onClick={()=>{setNote(undefined);recapture()}}>Buketimde sakla</button></Sheet>}
  {collection&&<Sheet title="Hatıralar" onClose={()=>setCollection(false)}><div className="collection-notes">{flowers.map(i=><button key={i} onClick={()=>{setCollection(false);setNote(i)}}>✿ {story.flowers[i].label}</button>)}</div>{discoveredBook&&<button className="primary-button" onClick={()=>{setCollection(false);setJournal(true)}}>Sticker defteri</button>}</Sheet>}
  {gift&&<Sheet title={story.title} className="gifts-sheet" onClose={finishGift}>{story.note.status==='ready'?<article className="personal-letter">{story.note.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</article>:<p className="pending-label">Kişisel not henüz eklenmedi.</p>}<Voucher story={story} vault={vault}/><Parcel story={story}/><button className="primary-button gift-finish" onClick={finishGift}>{phase==='celebration'?'Kutlamaya dön':'Kutlamaya geç'} <span aria-hidden="true">✦</span></button></Sheet>}
 </div>;
}
