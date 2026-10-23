import { useEffect, useRef, useState } from 'react';
import type { FormEvent, TouchEvent } from 'react';
import { unlock } from './crypto';
import type { Scene, Story, Vault } from './types';
import { JourneyAudio } from './audio';
import { AssetImg } from './components/AssetImg';
import { FlowerGame, MatchingGame, PenguinGame } from './components/Activities';
import { Parcel, Voucher } from './components/Gift';

function Boat({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 240 180" fill="none" aria-hidden="true"><path d="m31 109 85 17 96-17-29 38H59Z" fill="currentColor" opacity=".85" /><path d="m116 20 0 100-72-18Z" fill="currentColor" opacity=".65" /><path d="m124 20 0 100 61-19Z" fill="currentColor" /><path d="M17 157q25-10 50 0t50 0 50 0 50 0M55 171q25-8 50 0t50 0 50 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" /></svg>;
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
    setPassword('');
    setBusy(true);
    setError('');
    try {
      const vault = await unlock(secret);
      if (alive.current) onUnlock(vault); else vault.dispose();
    } catch {
      if (alive.current) { setError('Açılamadı. Parolayı ve bağlantını kontrol edip yeniden dene.'); setBusy(false); }
    }
  }
  return <main className="password-world"><div className="gate-moon" aria-hidden="true" /><div className="gate-stars" aria-hidden="true">✧<span>✦</span><i>✧</i></div>
    <div className="gate-content"><Boat className="gate-boat" /><p className="gate-invitation">Biraz deniz, biraz yıldız…</p><h1>Sana küçük bir<br />yolculuk var.</h1><p className="gate-description">Başlamak için sana gönderilen parolayı yaz.</p>
      <form onSubmit={submit}><label htmlFor="password">Parola</label><div className="password-input-wrap"><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} required disabled={busy} aria-describedby={error ? 'unlock-error' : undefined} /><button type="submit" disabled={busy || !password.trim()} aria-label="Yolculuğu aç">{busy ? <span className="loading-ring" /> : <span aria-hidden="true">↗</span>}</button></div><p id="unlock-error" className="gate-error" role="status">{busy ? 'Yolculuk hazırlanıyor…' : error}</p></form>
    </div><div className="gate-water" aria-hidden="true" /><p className="gate-footer">Küçük sürprizler aceleye gelmez.</p>
  </main>;
}

function StatsDialog({ story, onClose }: { story: Story; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="stats-dialog" aria-labelledby="stats-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="notebook-binding" aria-hidden="true" /><button className="dialog-close" onClick={onClose} aria-label="Defteri kapat">×</button><span className="small-flower" aria-hidden="true">✿</span><h2 id="stats-title">{story.stats.title}</h2><p>{story.stats.period}</p><dl>{story.stats.items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl><p className="stats-footnote">{story.stats.footnote}</p><button className="text-button" onClick={onClose}>Yolculuğa dön ↗</button></dialog>;
}

function Letter({ story }: { story: Story }) {
  const [open, setOpen] = useState(false);
  return <div className={`letter-wrapper ${open ? 'letter-open' : ''}`}><button className="letter-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}><span aria-hidden="true">{open ? '−' : '✉'}</span>{open ? 'Mektubu katla' : 'Sana bir mektup var'}</button>{open ? <article className="personal-letter">{story.letter.map((paragraph, i) => <p className={i === 0 ? 'letter-salutation' : undefined} key={i}>{paragraph}</p>)}<p className="letter-signature">{story.sender}</p></article> : <div className="folded-letter" aria-hidden="true"><span>✿</span></div>}</div>;
}

function SceneContent({ scene, story, vault, onStats, navigate }: { scene: Scene; story: Story; vault: Vault; onStats: () => void; navigate: (index: number) => void }) {
  const interactive = ['penguin', 'matching', 'flowers'].includes(scene.kind);
  return <>
    <div className="narrative"><span className="chapter-kicker">{story.chapterNames[scene.chapter]}</span><h1 tabIndex={-1} id="scene-title">{scene.title}</h1>{scene.subtitle ? <p className="scene-subtitle">{scene.subtitle}</p> : null}<div className="scene-prose">{scene.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div>
      {scene.kind === 'penguin' ? <PenguinGame story={story} vault={vault} /> : null}
      {scene.kind === 'matching' ? <MatchingGame story={story} vault={vault} /> : null}
      {scene.kind === 'flowers' ? <FlowerGame story={story} /> : null}
      {scene.kind === 'stats' ? <button className="notebook-button" onClick={onStats}><span className="mini-notebook" aria-hidden="true">✧</span><span>{scene.actionLabel || 'Küçük defteri aç'}<small>İstersen bir göz at.</small></span><span aria-hidden="true">↗</span></button> : null}
      {scene.kind === 'letter' ? <Letter story={story} /> : null}
      {scene.kind === 'voucher' ? <Voucher story={story} vault={vault} /> : null}
      {scene.kind === 'parcel' ? <Parcel story={story} /> : null}
      {scene.kind === 'final' ? <div className="final-actions"><button className="primary-button" onClick={() => navigate(story.scenes.findIndex(s => s.kind === 'voucher'))}>Kuponuna dön <span aria-hidden="true">↗</span></button><button className="text-button" onClick={() => navigate(0)}>Yeniden yolculuk et <span aria-hidden="true">↺</span></button></div> : null}
      {scene.aside ? <p className="scene-aside">{scene.aside}</p> : null}
    </div>
    {scene.stickers.length > 0 ? <div className={`sticker-stage sticker-stage-${scene.kind} ${interactive ? 'activity-stickers' : ''}`}><span className="stage-spark spark-one" aria-hidden="true">✧</span><span className="stage-spark spark-two" aria-hidden="true">✦</span>{scene.stickers.map((id, i) => <div className={`sticker sticker-${i + 1}`} key={`${id}-${i}`}><AssetImg vault={vault} id={id} alt={story.assetAlts[id] || ''} /><span className="sticker-shadow" aria-hidden="true" /></div>)}{scene.kind === 'crew' ? <Boat className="crew-boat" /> : null}</div> : null}
  </>;
}

function Journey({ vault, lock }: { vault: Vault; lock: () => void }) {
  const { story } = vault;
  const [index, setIndex] = useState(0);
  const [stats, showStats] = useState(false);
  const [sound, setSound] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audio = useRef<JourneyAudio | undefined>(undefined);
  const touch = useRef<{ x: number; y: number } | undefined>(undefined);
  const scene = story.scenes[index];
  const main = useRef<HTMLElement>(null);
  useEffect(() => () => audio.current?.dispose(), []);
  useEffect(() => {
    const next = story.scenes[index + 1]?.background;
    if (next) void vault.assetUrl(next).catch(() => { /* The visible asset offers retry if unavailable. */ });
    main.current?.scrollTo({ top: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.getElementById('scene-title')?.focus({ preventScroll: true });
  }, [index, story, vault]);
  function navigate(next: number) { if (next >= 0 && next < story.scenes.length) setIndex(next); }
  async function toggleAudio() {
    if (audioBusy) return;
    setAudioBusy(true);
    try {
      audio.current ??= new JourneyAudio();
      if (sound) await audio.current.pause(); else await audio.current.play();
      setSound(s => !s);
      setAudioError('');
    } catch { setAudioError('Ses açılamadı. Yeniden deneyebilirsin.'); }
    finally { setAudioBusy(false); }
  }
  function touchEnd(event: TouchEvent) {
    if (!touch.current) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    touch.current = undefined;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 45) navigate(index + (dx < 0 ? 1 : -1));
  }
  return <div className={`journey world-${scene.chapter} kind-${scene.kind}`}>
    <div className="world-art" key={scene.background}><AssetImg vault={vault} id={scene.background} alt="" className="painted-background" background /></div><div className="world-veil" />
    <a href="#journey-content" className="skip-link">İçeriğe geç</a>
    <header className="journey-header"><button className="journey-brand" onClick={() => navigate(0)} aria-label="Başlangıca dön"><Boat /><span>{story.title}</span></button><div className="header-actions"><button className="sound-button" disabled={audioBusy} onClick={() => void toggleAudio()} aria-pressed={sound}><span aria-hidden="true">{sound ? '♫' : '♪'}</span><span>{sound ? 'Sesi duraklat' : 'Sesi aç'}</span></button><button className="lock-button" onClick={lock} aria-label="Yolculuğu kilitle" title="Yolculuğu kilitle"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg></button></div></header>
    {audioError ? <p className="audio-error" role="status">{audioError}</p> : null}
    <main ref={main} id="journey-content" className="journey-main" aria-labelledby="scene-title" onTouchStart={e => { if (!(e.target as HTMLElement).closest('button,a,input,dialog')) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={touchEnd} onKeyDown={e => { if ((e.target as HTMLElement).closest('button,a,input,dialog')) return; if (e.key === 'ArrowRight') { e.preventDefault(); navigate(index + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(index - 1); } }}>
      <div className={`scene-layout scene-layout-${scene.kind}`} key={scene.id}><SceneContent scene={scene} story={story} vault={vault} onStats={() => showStats(true)} navigate={navigate} /></div>
    </main>
    <footer className="journey-footer"><div className="journey-progress" aria-label={`${index + 1} / ${story.scenes.length}`}><div className="chapter-progress">{(['sea', 'book', 'garden'] as const).map(chapter => <span key={chapter} className={scene.chapter === chapter ? 'current' : ''}>{story.chapterNames[chapter]}</span>)}</div><div className="progress-track"><span style={{ width: `${(index + 1) / story.scenes.length * 100}%` }} /></div><span className="page-count">{String(index + 1).padStart(2, '0')}<span> / {String(story.scenes.length).padStart(2, '0')}</span></span></div>
      <nav className="scene-navigation" aria-label="Sayfalar"><button className="back-button" onClick={() => navigate(index - 1)} disabled={index === 0} aria-label="Önceki sayfa">←</button>{index < story.scenes.length - 1 ? <button className="next-button" onClick={() => navigate(index + 1)}>{['penguin','matching','flowers'].includes(scene.kind) ? 'Devam et / atla' : ['welcome','book-entry','promise'].includes(scene.kind) && scene.actionLabel ? scene.actionLabel : 'Devam et'}<span aria-hidden="true">→</span></button> : <button className="next-button" onClick={() => navigate(0)}>Başa dön <span aria-hidden="true">↺</span></button>}</nav>
    </footer>
    {stats ? <StatsDialog story={story} onClose={() => showStats(false)} /> : null}
  </div>;
}

export default function App() {
  const [vault, setVault] = useState<Vault>();
  useEffect(() => () => vault?.dispose(), [vault]);
  return vault ? <Journey vault={vault} lock={() => setVault(undefined)} /> : <PasswordGate onUnlock={setVault} />;
}
