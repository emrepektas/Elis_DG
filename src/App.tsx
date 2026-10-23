import { Component, Suspense, lazy, useEffect, useReducer, useRef, useState } from 'react';
import type { FormEvent, ReactNode, MutableRefObject } from 'react';
import { unlock } from './crypto';
import { initialState, journeyReducer } from './engine';
import { stops } from './types';
import type { Controls, Story, Vault, JourneyAction } from './types';
import { JourneyAudio } from './audio';
import { AssetImg } from './components/AssetImg';
import { Parcel, Voucher } from './components/Gift';

const World = lazy(() => import('./world/World'));
const icons = ['⌂', '⚑', '♟', '≈', '⌁', '▤', '✿', '◇'];
const clearControls = (): Controls => ({ left: false, right: false, forward: false, jump: false });

class WorldBoundary extends Component<{ children: ReactNode; failed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.failed(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function LittleBoat() {
  return <svg viewBox="0 0 240 180" fill="none" aria-hidden="true"><path d="M30 115q85 18 180 0l-27 34H58Z" fill="#254968"/><path d="M38 113q79 13 164 0" stroke="#fff3d7" strokeWidth="8" strokeLinecap="round"/><path d="M119 25v94" stroke="#9c7654" strokeWidth="5"/><path d="M127 31q34 25 54 65l-54-3Z" fill="#ed655c"/><path d="M36 162q25-8 50 0t50 0 50 0" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round"/></svg>;
}

function PasswordGate({ onUnlock }: { onUnlock: (vault: Vault) => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const secret = password;
    setPassword(''); setBusy(true); setError('');
    try {
      const vault = await unlock(secret);
      if (alive.current) onUnlock(vault); else vault.dispose();
    } catch {
      if (alive.current) { setError('Açılamadı. Parolayı ve bağlantını kontrol edip yeniden dene.'); setBusy(false); }
    }
  }
  return <main className="password-world"><div className="gate-sun"/><div className="gate-island"/>
    <div className="gate-content"><div className="gate-boat"><LittleBoat/></div><p className="eyebrow">Bir deniz yolculuğu</p><h1>Hadi açalım.</h1><form onSubmit={submit}><label htmlFor="password">Sana gönderilen parola</label><div className="password-input-wrap"><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} required disabled={busy} aria-describedby="unlock-error"/><button type="submit" disabled={busy || !password.trim()} aria-label="Yolculuğu aç">{busy ? '…' : '→'}</button></div><p id="unlock-error" className="gate-error" role="status">{busy ? 'Açılıyor…' : error}</p></form></div>
    <div className="gate-water" aria-hidden="true"/>
  </main>;
}

function Sheet({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog className={`journey-sheet ${className}`} ref={dialog} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="sheet-heading"><h2>{title}</h2><button autoFocus onClick={onClose} aria-label="Kapat" className="icon-button">×</button></div>{children}</dialog>;
}

function Notebook({ story, vault, page, dispatch, onClose }: { story: Story; vault: Vault; page: number; dispatch: (action: JourneyAction) => void; onClose: () => void }) {
  const active = story.notebook[Math.min(page, story.notebook.length - 1)];
  const last = page >= story.notebook.length - 1;
  return <Sheet title={active.title} onClose={onClose} className="notebook-sheet"><div className="book-spine" aria-hidden="true"/><div className="notebook-page" key={page}><p>{active.text}</p><div className="keepsake-stickers">{active.stickers.map((id, index) => <button className="keepsake-sticker" aria-label={story.stickers.find(s => s.id === id)?.alt || 'Sticker'} key={`${id}-${index}`} onClick={e => { e.currentTarget.classList.remove('sticker-pop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('sticker-pop'); }}><AssetImg vault={vault} id={id} alt={story.stickers.find(s => s.id === id)?.alt || ''}/></button>)}</div></div><div className="book-navigation"><button className="icon-button" disabled={page === 0} aria-label="Önceki defter sayfası" onClick={() => dispatch({ type: 'page', page: page - 1 })}>←</button><span>{page + 1} / {story.notebook.length}</span>{last ? <button className="primary-button flower-lift" onClick={() => { dispatch({ type: 'lift-flower' }); onClose(); }}>✿ Çiçeği kaldır</button> : <button className="primary-button" aria-label="Sonraki defter sayfası" onClick={() => dispatch({ type: 'page', page: page + 1 })}>Çevir →</button>}</div></Sheet>;
}

function HoldButton({ direction, label, children, controls }: { direction: keyof Controls; label: string; children: ReactNode; controls: MutableRefObject<Controls> }) {
  function release() { controls.current[direction] = false; }
  return <button className={`hold-button hold-${direction}`} aria-label={label} onPointerDown={e => { e.preventDefault(); if (e.pointerType !== 'touch') e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); controls.current[direction] = true; }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); controls.current[direction] = true; } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } }} onBlur={release}>{children}</button>;
}

function FallbackScenery() {
  return <div className="fallback-scenery" aria-hidden="true"><svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#b5e5f2"/><stop offset="1" stopColor="#e6f7e8"/></linearGradient><linearGradient id="sea" x2="0" y2="1"><stop stopColor="#5bd1d4"/><stop offset="1" stopColor="#26b4bb"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h1200v800H0z"/><circle cx="930" cy="150" r="56" fill="#fff2bd"/><path fill="#fff" opacity=".8" d="M120 160q20-35 60-5 36-34 67 4 38-8 45 22H108q-12-13 12-21M650 96q24-32 52-9 32-25 59 11 31-5 39 17H635q-3-16 15-19"/><path fill="url(#sea)" d="M0 310h1200v490H0z"/><ellipse cx="170" cy="525" rx="280" ry="120" fill="#e7d5a5"/><ellipse cx="1030" cy="400" rx="190" ry="90" fill="#d8e9ab"/><ellipse cx="1030" cy="380" rx="160" ry="75" fill="#93c899"/><path d="M270 510h150v28H270z" fill="#b28a62"/><path d="m580 470 130 8-26 36h-82z" fill="#294d68"/><path d="M643 367v112" stroke="#9d7655" strokeWidth="5"/><path d="m650 374 58 82h-58z" fill="#ec6b60"/>{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${40 + i % 6 * 210} ${380 + Math.floor(i / 6) * 115}q12-5 24 0t24 0`} stroke="#c6fff0" strokeWidth="3" fill="none" opacity=".65"/>)}</svg></div>;
}

function Journey({ vault, lock }: { vault: Vault; lock: () => void }) {
  const { story } = vault;
  const [state, dispatch] = useReducer(journeyReducer, initialState);
  const controls = useRef<Controls>(clearControls());
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<'notebook' | 'note' | 'gifts'>();
  const [map, setMap] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [sound, setSound] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audio = useRef<JourneyAudio | undefined>(undefined);
  const stageTitle = story.stops[state.stop];
  const game = state.stop === 'penguin' || state.stop === 'sailing';
  const gameCompleted = state.stop === 'penguin' ? state.penguin : state.stop === 'sailing' && state.sailed;
  useEffect(() => () => audio.current?.dispose(), []);
  useEffect(() => {
    controls.current = clearControls();
    document.getElementById('stop-title')?.focus({ preventScroll: true });
  }, [state.stop]);
  useEffect(() => { controls.current = clearControls(); }, [dialog, map]);
  useEffect(() => {
    if (state.stop !== 'fishing' || state.fishing !== 'cast') return;
    const timer = setTimeout(() => dispatch({ type: 'bite' }), 2100);
    return () => clearTimeout(timer);
  }, [state.fishing, state.stop]);
  useEffect(() => {
    const visibility = () => { setHidden(document.hidden); controls.current = clearControls(); if (document.hidden) void audio.current?.pause(); else if (sound) void audio.current?.play().catch(() => setSound(false)); };
    const blur = () => { controls.current = clearControls(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); };
  }, [sound]);
  useEffect(() => {
    if (!game || gameCompleted || dialog || map) return;
    const keys: Record<string, keyof Controls> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'forward', w: 'forward', W: 'forward', ' ': 'jump' };
    const down = (e: KeyboardEvent) => { if (e.altKey || e.ctrlKey || e.metaKey) return; if ((e.target as HTMLElement).closest('input,textarea,dialog,.hold-button')) return; const key = keys[e.key]; if (key) { if (e.key === ' ' && (e.target as HTMLElement).closest('button,a')) return; e.preventDefault(); controls.current[key] = true; } };
    const up = (e: KeyboardEvent) => { const key = keys[e.key]; if (key) controls.current[key] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { controls.current = clearControls(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [game, gameCompleted, dialog, map]);
  async function toggleAudio() {
    if (audioBusy) return;
    setAudioBusy(true);
    try { audio.current ??= new JourneyAudio(); if (sound) await audio.current.pause(); else await audio.current.play(); setSound(!sound); setAudioError(''); }
    catch { setAudioError('Bu tarayıcıda ses açılamadı. Yolculuğa devam edebilirsin.'); }
    finally { setAudioBusy(false); }
  }
  const allCrew = story.crew.every(member => state.crew.includes(member.id));
  useEffect(() => {
    const notebook = () => setDialog('notebook');
    const note = () => setDialog('note');
    const gifts = () => setDialog('gifts');
    window.addEventListener('world-notebook', notebook); window.addEventListener('world-note', note);
    window.addEventListener('world-gift', gifts); window.addEventListener('world-parcel', gifts);
    return () => { window.removeEventListener('world-notebook', notebook); window.removeEventListener('world-note', note); window.removeEventListener('world-gift', gifts); window.removeEventListener('world-parcel', gifts); };
  }, []);
  return <div data-stop={state.stop} data-unlocked={state.unlocked} data-crew-count={state.crew.length} data-flowers-count={state.flowers.length} data-fishing={state.fishing} className={`journey stop-${state.stop} ${reducedMotion ? 'reduce-motion' : ''} ${paused || hidden ? 'ambient-paused' : ''}`}>
    <a className="skip-link" href="#journey-controls">Kontrollere geç</a>
    <div className="world-stage" aria-label="Üç boyutlu deniz yolculuğu" data-testid="world-stage"><FallbackScenery/>{!failed ? <WorldBoundary failed={() => setFailed(true)}><Suspense fallback={null}><World story={story} state={state} dispatch={dispatch} controls={controls} reducedMotion={reducedMotion} paused={paused || hidden || !!dialog || map} blocked={hidden || !!dialog || map} onReady={() => setReady(true)} onFailure={() => setFailed(true)}/></Suspense></WorldBoundary> : null}</div>
    <header className="journey-header"><button className="map-button" aria-expanded={map} onClick={e => { e.currentTarget.focus(); setMap(!map); }}><span aria-hidden="true">⌁</span> Harita</button><div className="header-actions"><button className="utility-button" disabled={audioBusy} aria-label={sound ? 'Sesi duraklat' : 'Sesi aç'} aria-pressed={sound} onClick={() => void toggleAudio()} title={sound ? 'Sesi duraklat' : 'Sesi aç'}><span aria-hidden="true">{sound ? '♫' : '♪'}</span><span className="utility-label">{sound ? 'Ses açık' : 'Ses kapalı'}</span></button><button className="utility-button" aria-label="Ortam hareketini duraklat" aria-pressed={paused} onClick={() => setPaused(!paused)} title="Ortam hareketini duraklat"><span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span><span className="utility-label">Ortam</span></button><button className="utility-button" aria-label="Azaltılmış hareket" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)} title="Azaltılmış hareket"><span aria-hidden="true">◌</span><span className="utility-label">Sade hareket</span></button><button className="utility-button" onClick={() => setFailed(v => !v)} aria-label={failed ? '3D görünümü aç' : '2B görünümü aç'}>◈</button><button className="utility-button" onClick={lock} aria-label="Yolculuğu kilitle">↪</button></div></header>
    {audioError ? <p className="audio-error" role="status">{audioError}</p> : null}
    {!ready && !failed ? <span className="world-loading" role="status">Deniz hazırlanıyor…</span> : null}
    {failed ? <p className="fallback-notice" role="status">3D görünüm açılamadı. Aşağıdaki kontrollerle devam edebilirsin.</p> : null}
    <main className="journey-hud" id="journey-controls"><div className="stop-caption"><p className="eyebrow">{String(stops.indexOf(state.stop) + 1).padStart(2, '0')} / {String(stops.length).padStart(2, '0')}</p><h1 id="stop-title" tabIndex={-1}>{stageTitle.title}</h1>{stageTitle.hint ? <p className="stop-hint">{stageTitle.hint}</p> : null}</div>
      <div className="action-tray" aria-label="Yolculuk kontrolleri">
        {state.stop === 'coast' ? <button className="primary-button" onClick={() => dispatch({ type: 'begin' })}>{stageTitle.action} →</button> : null}
        {state.stop === 'crew' ? <><div className="crew-choices">{story.crew.map(member => <button className="crew-choice" key={member.id} disabled={state.crew.includes(member.id)} onClick={() => dispatch({ type: 'board', id: member.id })}><span className={`crew-portrait portrait-${member.model}`} aria-hidden="true"/><span>{member.name}</span><span>{state.crew.includes(member.id) ? '✓' : '+'}</span></button>)}</div>{allCrew ? <button className="primary-button" onClick={() => dispatch({ type: 'crew-ready' })}>{stageTitle.action} →</button> : <p className="control-hint">Kıyıdaki arkadaşlara dokun.</p>}</> : null}
        {game && !gameCompleted ? <><div className="game-controls" hidden={failed}><HoldButton direction="left" label="Sola git" controls={controls}>←</HoldButton><HoldButton direction="forward" label="İleri git" controls={controls}>↑</HoldButton><HoldButton direction="right" label="Sağa git" controls={controls}>→</HoldButton>{state.stop === 'penguin' ? <HoldButton direction="jump" label="Zıpla" controls={controls}>Zıpla</HoldButton> : null}</div><p className="control-hint">{state.stop === 'penguin' ? '↑ ile ilerle, boşluk tuşuyla zıpla.' : '↑ basılı tut; ← → ile yön ver.'}</p><button className="text-button assist-button" onClick={() => dispatch({ type: state.stop === 'penguin' ? 'penguin-done' : 'sail-done' })}>Birlikte geçelim →</button></> : null}
        {gameCompleted ? <button className="primary-button" onClick={() => dispatch({ type: 'visit', stop: state.stop === 'penguin' ? 'sailing' : 'fishing' })}>✓ Devam edelim</button> : null}
        {state.stop === 'fishing' ? <>{state.fishing === 'idle' ? <button className="primary-button" onClick={() => dispatch({ type: 'cast' })}>{stageTitle.action}</button> : state.fishing === 'cast' ? <p className="fishing-status" role="status">Şamandıraya bakalım…</p> : state.fishing === 'bite' ? <button className="primary-button reel-button" onClick={() => dispatch({ type: 'reel' })}>Çek! ↑</button> : <button className="primary-button" onClick={() => dispatch({ type: 'visit', stop: 'notebook' })}>Defteri aç →</button>}</> : null}
        {state.stop === 'fishing' && state.fishing !== 'caught' ? <button className="text-button assist-button" onClick={() => dispatch({ type: 'fish-assist' })}>Birlikte çekelim →</button> : null}
        {state.stop === 'notebook' ? <button className="primary-button" onClick={e => { e.currentTarget.focus(); setDialog('notebook'); }}>{stageTitle.action} ↗</button> : null}
        {state.stop === 'garden' ? <><div className="garden-choices">{story.flowers.map((flower, index) => <button key={index} aria-expanded={state.flowers.includes(index)} className={`flower-choice flower-${index} ${state.flowers.includes(index) ? 'bloomed' : ''}`} onClick={() => dispatch({ type: 'bloom', index })}><span aria-hidden="true">✿</span>{flower.label}</button>)}<button className="note-choice" onClick={() => { dispatch({ type: 'open-note' }); setDialog('note'); }}>✉ Notu aç</button></div>{state.flowers.length > 0 ? <div className="flower-messages" role="status">{state.flowers.map(index => <p key={index}>{story.flowers[index]?.message}</p>)}</div> : null}{state.flowers.length >= story.flowers.length && state.noteOpened ? <button className="primary-button" onClick={() => dispatch({ type: 'garden-done' })}>{stageTitle.action} →</button> : null}</> : null}
        {state.stop === 'gifts' ? <><button className="primary-button" onClick={e => { e.currentTarget.focus(); setDialog('gifts'); }}>{stageTitle.action} ↗</button><button className="text-button" onClick={() => dispatch({ type: 'replay' })}>Yeniden yola çık ↺</button></> : null}
      </div>
    </main>
    <nav className="route-dots" aria-label="Yolculuk durakları">{stops.map((stop, index) => <button key={stop} disabled={index > state.unlocked} aria-label={story.stops[stop].title} aria-current={stop === state.stop ? 'step' : undefined} onClick={() => dispatch({ type: 'visit', stop })}><span aria-hidden="true">{icons[index]}</span></button>)}</nav>
    {map ? <Sheet title="Harita" onClose={() => setMap(false)} className="map-sheet"><ol className="map-stops">{stops.map((stop, index) => <li key={stop}><button disabled={index > state.unlocked} aria-current={stop === state.stop ? 'step' : undefined} onClick={() => { dispatch({ type: 'visit', stop }); setMap(false); }}><span className="map-stop-icon" aria-hidden="true">{icons[index]}</span><span>{story.stops[stop].title}</span><span aria-hidden="true">{index > state.unlocked ? '·' : stop === state.stop ? '●' : '→'}</span></button></li>)}</ol></Sheet> : null}
    {dialog === 'notebook' ? <Notebook story={story} vault={vault} page={state.page} dispatch={dispatch} onClose={() => setDialog(undefined)}/> : null}
    {dialog === 'note' ? <Sheet title={story.title} onClose={() => setDialog(undefined)} className="note-sheet">{story.note.status === 'ready' ? <article className="personal-letter">{story.note.paragraphs.map((text, index) => <p key={index}>{text}</p>)}</article> : <p className="pending-label">Kişisel not henüz eklenmedi.</p>}</Sheet> : null}
    {dialog === 'gifts' ? <Sheet title={story.stops.gifts.title} onClose={() => setDialog(undefined)} className="gifts-sheet"><Voucher story={story} vault={vault}/><Parcel story={story}/><p className="birthday-signoff">{story.title}<span>{story.sender}</span></p><button className="text-button" onClick={() => { setDialog(undefined); dispatch({ type: 'replay' }); }}>Yeniden yola çık ↺</button></Sheet> : null}
  </div>;
}

export default function App() {
  const [vault, setVault] = useState<Vault>();
  useEffect(() => () => vault?.dispose(), [vault]);
  return vault ? <Journey vault={vault} lock={() => setVault(undefined)}/> : <PasswordGate onUnlock={setVault}/>;
}
