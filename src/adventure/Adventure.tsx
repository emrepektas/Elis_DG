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
const actionLabels:Record<string,string>={board:'Tekneye bin',cast:'Oltayı at',reel:'Basılı tut: oltayı sar',book:'Defteri aç',gift:'Hediyeyi aç','flowers-needed':'Önce çiçeklere bakalım'};
const phaseLabel:Partial<Record<Phase,string>>={board:'Açılıyoruz',haul:'Bir defter!',bedtime:'İyi geceler',night:'',arrival:'Günaydın'};
export default function Adventure({vault,lock}:{vault:Vault;lock:()=>void}){
 const{story}=vault;
 const[phase,setPhase]=useState<Phase>('choose'),[avatar,setAvatar]=useState<AvatarId>('blue'),[flowers,setFlowers]=useState<number[]>([]);
 const[status,setStatus]=useState<Status>(emptyStatus),[locked,setLocked]=useState(false),[failed,setFailed]=useState(false),[assist,setAssist]=useState(false);
 const[journal,setJournal]=useState(false),[page,setPage]=useState(0),[note,setNote]=useState<number>(),[gift,setGift]=useState(false),[collection,setCollection]=useState(false);
 const[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[paused,setPaused]=useState(false),[hidden,setHidden]=useState(document.hidden),[skip,setSkip]=useState(0);
 const[sound,setSound]=useState(false),[audioError,setAudioError]=useState(''),[lockError,setLockError]=useState('');
 const audio=useRef<JourneyAudio|undefined>(undefined),input=useRef<Input>({keys:new Set(),yaw:0,pitch:.05,press:0});
 const root=useRef<HTMLDivElement>(null);
 const modal=journal||note!==undefined||gift||collection;
 const controllable=['coast','sail','fish','garden','notebook'].includes(phase);
 const blocked=hidden||modal||(controllable&&!locked&&!assist&&!failed);
 useEffect(()=>()=>audio.current?.dispose(),[]);
 useEffect(()=>{if(phase==='notebook')setJournal(true);if(phase==='gifts')setGift(true)},[phase]);
 useEffect(()=>{if(modal||phase==='choose'){input.current.keys.clear();document.exitPointerLock?.()}},[modal,phase]);
 useEffect(()=>{
  const change=()=>{const captured=document.pointerLockElement===root.current?.querySelector('canvas');setLocked(captured);if(!captured)input.current.keys.clear()};
  const move=(e:MouseEvent)=>{if(document.pointerLockElement){input.current.yaw-=e.movementX*.0024;input.current.pitch=Math.max(-.2,Math.min(.65,input.current.pitch-e.movementY*.0022))}};
  const down=(e:KeyboardEvent)=>{if(modal||!document.pointerLockElement||e.altKey||e.ctrlKey||e.metaKey)return;if(cinematic(phase)){if(e.code==='Space'&&!e.repeat){e.preventDefault();setSkip(n=>n+1)}return}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyE'].includes(e.code)){e.preventDefault();input.current.keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)input.current.press++;if(e.code!=='KeyE')setAssist(false)}};
  const up=(e:KeyboardEvent)=>input.current.keys.delete(e.code);
  const visibility=()=>{setHidden(document.hidden);input.current.keys.clear();if(document.hidden)void audio.current?.pause();else if(sound)void audio.current?.play().catch(()=>setSound(false))};
  const blur=()=>input.current.keys.clear();
  document.addEventListener('pointerlockchange',change);document.addEventListener('mousemove',move);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('pointerlockchange',change);document.removeEventListener('mousemove',move);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility)};
 },[modal,sound,phase]);
 function recapture(){
  (document.querySelector('dialog[open]') as HTMLDialogElement|null)?.close();
  void root.current?.querySelector('canvas')?.requestPointerLock?.()?.catch?.(()=>{});
 }
 async function capture(){
  if(modal||cinematic(phase)||failed)return;
  try{const canvas=root.current?.querySelector('canvas');if(!canvas?.requestPointerLock)throw Error();await canvas.requestPointerLock();setLockError('')}
  catch{setLockError('Fare kontrolü açılamadı. Tarayıcıda yeniden deneyebilir veya rehberi açabilirsin.')}
 }
 function interact(action:string){
  if(action==='board')setPhase('board');
  if(action==='book')setJournal(true);
  if(action==='gift'){setPhase('gifts');setGift(true)}
  const match=/^(flower|note)-(\d)$/.exec(action);
  if(match){const index=Number(match[2]);setFlowers(old=>old.includes(index)?old:[...old,index]);setNote(index)}
 }
 async function toggleAudio(){try{audio.current??=new JourneyAudio();if(sound)await audio.current.pause();else await audio.current.play();setSound(s=>!s);setAudioError('')}catch{setAudioError('Ses açılamadı. Yolculuğa devam edebilirsin.')}}
 function replay(){document.exitPointerLock?.();setFlowers([]);setPage(0);setJournal(false);setNote(undefined);setGift(false);setCollection(false);setAssist(false);setStatus(emptyStatus);setPhase('choose');input.current={keys:new Set(),yaw:0,pitch:.05,press:0}}
 function fallbackNext(){const next:Partial<Record<Phase,Phase>>={coast:'board',board:'sail',sail:'fish',fish:'haul',haul:'notebook',bedtime:'night',night:'arrival',arrival:'garden'};if(next[phase])setPhase(next[phase]!)}
 useEffect(()=>{if(failed&&cinematic(phase)){const timer=setTimeout(()=>fallbackNext(),500);return()=>clearTimeout(timer)}},[failed,phase]);
 const currentPage=story.notebook[page];
 const action=status.action;
 const picked=/^(flower|note)-(\d)$/.exec(action);
 const target=phase==='coast'?[3.8,-4]:FLOWERS.find((_,i)=>!flowers.includes(i))??GIFT;
 const compass=Math.atan2(-(target[0]-status.x),-(target[1]-status.z))-status.yaw;
 return <div ref={root} className={`adventure ${cinematic(phase)?'in-cinema':''} ${reduced?'reduce-motion':''}`} data-phase={phase} data-avatar={avatar} data-bouquet={flowers.length}>
  <div className="adventure-world" onClick={()=>{if(phase==='choose')return;if(locked)input.current.press++;else void capture()}}>
   {!failed?<Boundary failed={()=>setFailed(true)}><Suspense fallback={<p className="world-loading">Dünya hazırlanıyor…</p>}><World phase={phase} avatar={avatar} story={story} flowers={flowers} input={input} blocked={blocked} motion={!reduced&&!paused&&!hidden} reduced={reduced} skip={skip} assist={assist} onPhase={setPhase} onStatus={setStatus} onInteract={interact} onFailure={()=>setFailed(true)}/></Suspense></Boundary>:<div className="adventure-fallback"/>}
  </div>
  <header className="journey-header"><button className="map-button" onClick={e=>{e.currentTarget.focus();setCollection(true)}} aria-label="Hatıralar">✿ Hatıralar</button><div className="header-actions"><button className="utility-button" onClick={()=>void toggleAudio()} aria-label={sound?'Sesi duraklat':'Sesi aç'} aria-pressed={sound}>{sound?'♫':'♪'}</button><button className="utility-button" aria-label="Ortam hareketini duraklat" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>Ⅱ</button><button className="utility-button" aria-label="Azaltılmış hareket" aria-pressed={reduced} onClick={()=>setReduced(v=>!v)}>◌</button><button className="utility-button" aria-label="Yolculuğu kilitle" onClick={()=>{document.exitPointerLock?.();lock()}}>↪</button></div></header>
  {audioError&&<p className="audio-error" role="status">{audioError}</p>}
  {phase==='choose'?<section className="character-select"><p>Birini seç.</p><h1>{story.title}</h1><div className="avatar-choices">{story.avatars.map(person=><button key={person.id} className={avatar===person.id?'selected':''} aria-pressed={avatar===person.id} onClick={()=>setAvatar(person.id)}>{person.name}</button>)}</div><button className="primary-button" onClick={()=>{setPhase('coast');void capture()}}>Yola çık</button><small className="start-controls">WASD · fareyle bak · E ile etkileşim · Esc ile fareyi bırak</small></section>:null}
  {controllable&&!locked&&!assist&&!modal&&!failed?<div className="resume-panel"><button className="primary-button" onClick={()=>void capture()}>Devam etmek için tıkla</button><p>WASD · fareyle bak · E ile etkileşime gir<br/>Esc ile fareyi bırak</p>{lockError&&<p role="status">{lockError}</p>}<button className="text-button" onClick={()=>setAssist(true)}>Rehberle yürü</button></div>:null}
  {(phase==='coast'||phase==='garden')&&!modal?<><div className="walking-goal"><span className="compass-arrow" style={{transform:`rotate(${-compass}rad)`}}>↑</span><span>{phase==='coast'?'İskeleye doğru':flowers.length<3?'Çiçeklerin peşinden':'Gökkuşağına doğru'}</span></div><div className="bouquet-counter" aria-label={`${flowers.length} çiçek toplandı`}>{[0,1,2].map(i=><span key={i} className={flowers.length>i?'collected':''}>✿</span>)}</div></>:null}
  {phase==='sail'?<div className="boat-instructions"><span>Biraz açılalım.</span><small>W ile hızlan · A / D ile dümen</small></div>:null}
  {action&&locked&&!modal?<div className="interact-prompt"><kbd>E</kbd><span>{picked?(picked[1]==='flower'?'Çiçeği al':'Notu yeniden oku'):actionLabels[action]}</span>{action==='reel'?<div className="reel-track"><span style={{width:`${status.reel*100}%`}}/></div>:null}</div>:null}
  {phase==='fish'&&status.fish==='waiting'?<div className="interact-prompt waiting"><span>Bir şey takıldı…</span></div>:null}
  {cinematic(phase)?<><div className={`cinema-title cinema-${phase}`}><p>{phase==='night'?story.motifs[status.night>.5?0:1]:phaseLabel[phase]}</p></div><button className="cinema-skip" onClick={()=>setSkip(s=>s+1)}>Geç</button></>:null}
  {phase==='garden'&&flowers.length===3&&!gift?<p className="rainbow-hint">Hepsi sende. Biraz daha ileride…</p>:null}
  {controllable&&!modal&&!locked?<button className="guide-toggle" aria-pressed={assist} onClick={()=>setAssist(v=>!v)}>{assist?'Rehberi durdur':'Rehberle yürü'}</button>:null}
  {phase==='fish'&&!locked?<button className="assist-button text-button fishing-assist" onClick={()=>setPhase('haul')}>Birlikte çekelim</button>:null}
  {failed?<div className="fallback-panel"><p>3D görünüm açılamadı. Yolculuğa buradan devam edebilirsin.</p>{phase==='choose'?null:phase==='garden'?<>{story.flowers.map((flower,i)=><button key={i} onClick={()=>interact(`flower-${i}`)}>{flower.label}</button>)}{flowers.length===3&&<button onClick={()=>interact('gift')}>Gökkuşağındaki hediyeye git</button>}</>:phase==='notebook'?<button onClick={()=>setJournal(true)}>Defteri aç</button>:<button onClick={fallbackNext}>Devam et</button>}</div>:null}
  {journal?<Sheet title={currentPage.title} className="notebook-sheet" onClose={()=>setJournal(false)}><div className="notebook-page" key={page}><p>{currentPage.text}</p><div className="keepsake-stickers">{currentPage.stickers.map(id=><button className="keepsake-sticker" key={id} onClick={e=>{if(reduced||paused)return;e.currentTarget.animate([{transform:'rotate(-5deg) scale(1)'},{transform:'rotate(7deg) scale(1.15)'},{transform:'rotate(-5deg) scale(1)'}],{duration:450})}}><AssetImg vault={vault} id={id} alt={story.stickers.find(s=>s.id===id)?.alt??''}/></button>)}</div></div><div className="book-navigation"><button className="icon-button" aria-label="Önceki defter sayfası" disabled={page===0} onClick={()=>setPage(n=>n-1)}>←</button><span>{page+1} / 3</span>{page<2?<button className="primary-button" aria-label="Sonraki defter sayfası" onClick={()=>setPage(n=>n+1)}>Çevir</button>:<button className="primary-button" onClick={()=>{setJournal(false);if(phase==='notebook'){setPhase('bedtime');recapture()}}}>{phase==='notebook'?'Çiçeği sakla ve devam et':'Defteri kapat'}</button>}</div></Sheet>:null}
  {note!==undefined?<Sheet title={story.flowers[note].label} className="flower-note-sheet" onClose={()=>setNote(undefined)}><span className="note-flower">✿</span><p>{story.flowers[note].message}</p><button className="primary-button" onClick={()=>{setNote(undefined);recapture()}}>Buketimde sakla</button></Sheet>:null}
  {collection?<Sheet title="Hatıralar" onClose={()=>setCollection(false)}><div className="collection-notes">{flowers.map(i=><button key={i} onClick={()=>{setCollection(false);setNote(i)}}>✿ {story.flowers[i].label}</button>)}</div>{!['choose','coast','board','sail','fish','haul'].includes(phase)&&<button className="primary-button" onClick={()=>{setCollection(false);setJournal(true)}}>Sticker defteri</button>}<button className="text-button" onClick={replay}>Baştan oyna</button></Sheet>:null}
  {gift?<Sheet title={story.title} className="gifts-sheet" onClose={()=>setGift(false)}>{story.note.status==='ready'?<article className="personal-letter">{story.note.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</article>:<p className="pending-label">Kişisel not henüz eklenmedi.</p>}<Voucher story={story} vault={vault}/><Parcel story={story}/><p className="birthday-signoff">{story.title}<span>{story.sender}</span></p><button className="text-button" onClick={replay}>Yeniden yola çık</button></Sheet>:null}
  {phase==='gifts'&&!gift?<div className="final-actions"><button className="primary-button" onClick={()=>setGift(true)}>Hediyene dön</button><button className="text-button" onClick={replay}>Yeniden oyna</button></div>:null}
 </div>;
}


