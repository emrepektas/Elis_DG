import { useEffect, useRef, useState } from 'react';
import type { Story, Vault } from '../types';
import { AssetImg } from './AssetImg';

export function PenguinGame({ story, vault }: { story: Story; vault: Vault }) {
  const game = story.activities.penguin;
  const asset = story.scenes.find(scene => scene.kind === 'penguin')?.stickers[0];
  const [step, setStep] = useState(0);
  return <section className="activity penguin-game" aria-label="Küçük yolculuk">
    <p>{game.intro}</p>
    <div className="penguin-path"><span className="path-line" />{game.steps.map((label, index) => <button key={label} className={`waypoint ${index < step ? 'visited' : ''}`} disabled={index !== step} onClick={() => setStep(s => s + 1)} aria-label={label}>
      <span className="waypoint-star" aria-hidden="true">✦</span><span>{label}</span>
    </button>)}<div className="traveling-penguin" style={{ left: `${Math.min(step, game.steps.length - 1) / Math.max(1, game.steps.length - 1) * 72 + 4}%` }}>{asset ? <AssetImg vault={vault} id={asset} alt={story.assetAlts[asset]} /> : null}</div></div>
    <p className="activity-feedback" role="status">{step >= game.steps.length ? game.done : `${Math.min(step + 1, game.steps.length)}. durağa dokun.`}</p>
  </section>;
}

export function MatchingGame({ story, vault }: { story: Story; vault: Vault }) {
  const game = story.activities.matching;
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [matched, setMatched] = useState(false);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const completion = useRef<HTMLParagraphElement>(null);
  const item = game.rounds[round];
  const done = round >= game.rounds.length;
  useEffect(() => {
    if (round === 0) return;
    if (done) completion.current?.focus();
    else firstChoice.current?.focus();
  }, [round, done]);
  const choose = (owner: string) => {
    if (owner === item.owner) { setFeedback(game.correct); setMatched(true); }
    else setFeedback(game.tryAgain);
  };
  return <section className="activity matching-game" aria-label="Sticker eşleştirme">
    <p>{game.intro}</p>
    {!done ? <><div className="matching-image"><AssetImg vault={vault} id={item.asset} alt={item.alt} /></div>
      <p className="round-label">{round + 1} / {game.rounds.length}</p>
      <div className="owner-options">{[story.sender, story.recipient].map((owner, index) => <button ref={index === 0 ? firstChoice : undefined} key={owner} disabled={matched} onClick={() => choose(owner)}>{owner}</button>)}</div>
      <p className="activity-feedback" role="status">{feedback || 'Bu sticker kimin?'}</p>
      {matched ? <button className="text-button" onClick={() => { setRound(r => r + 1); setFeedback(''); setMatched(false); }}>{round === game.rounds.length - 1 ? 'Tamamla' : 'Sıradaki sticker'} <span aria-hidden="true">↗</span></button> : null}
    </> : <p ref={completion} tabIndex={-1} className="activity-done" role="status"><span aria-hidden="true">✧</span> {game.done}</p>}
  </section>;
}

export function FlowerGame({ story }: { story: Story }) {
  const game = story.activities.flowers;
  const [picked, setPicked] = useState<number[]>([]);
  return <section className="activity flower-game" aria-label="Çiçek bahçesi"><p>{game.intro}</p>
    <div className="flower-bed">{game.items.map((item, index) => <button key={item.label} className={`flower-pick ${picked.includes(index) ? 'picked' : ''}`} aria-expanded={picked.includes(index)} onClick={() => setPicked(p => p.includes(index) ? p : [...p, index])}>
      <svg viewBox="0 0 100 132" aria-hidden="true"><path className="stem" d="M50 125 Q42 86 50 52 M48 106 Q17 103 23 87 Q41 83 48 106 M48 90 Q77 88 79 69 Q56 69 48 90" />{[0,60,120,180,240,300].map(deg => <ellipse key={deg} cx="50" cy="26" rx="14" ry="23" transform={`rotate(${deg} 50 45)`} />)}<circle cx="50" cy="45" r="11" /></svg>
      <span>{item.label}</span>
    </button>)}</div>
    <div className="flower-messages" aria-live="polite">{picked.map(index => <p key={index}><strong>{game.items[index].label}.</strong> {game.items[index].message}</p>)}{picked.length === game.items.length ? <p className="activity-done">{game.done}</p> : null}</div>
  </section>;
}
