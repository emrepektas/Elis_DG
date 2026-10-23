import { useEffect, useState } from 'react';
import type { Story, Vault } from '../types';

export function Voucher({ story, vault }: { story: Story; vault: Vault }) {
  const voucher = story.voucher;
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState(false);
  const [attempt, retry] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!revealed || voucher.status !== 'ready' || !voucher.assetId) return;
    let alive = true;
    setError(false);
    void vault.assetUrl(voucher.assetId).then(value => { if (alive) setUrl(value); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [revealed, voucher.status, voucher.assetId, vault, attempt]);
  return <section className={`voucher ${revealed ? 'revealed' : ''}`}>
    {!revealed ? <button className="voucher-envelope" onClick={() => setRevealed(true)} aria-label="Hediyeni aç"><span className="envelope-flap" /><span className="wax-seal" aria-hidden="true">✿</span><span>Hediyeni aç</span></button> : <div className="voucher-content"><span className="voucher-flower" aria-hidden="true">✿</span><h2>{voucher.title}</h2><p>{voucher.description}</p>
      {voucher.status === 'pending' ? <p className="pending-label">Hazırlık sürüyor · Kupon henüz eklenmedi.</p> : <>
        {voucher.assetId ? url ? <div className="voucher-links"><a href={url} target="_blank" rel="noopener noreferrer" className="primary-button">Kuponu aç <span aria-hidden="true">↗</span></a><a href={url} download={voucher.filename || 'kupon'} className="text-button">Orijinalini indir <span aria-hidden="true">↓</span></a></div> : error ? <div role="status"><p>Kupon yüklenemedi.</p><button onClick={() => retry(a => a + 1)}>Yeniden dene</button></div> : <p role="status">Kupon hazırlanıyor…</p> : null}
        {voucher.code ? <div className="redemption-code"><span>Kupon kodu</span><code>{voucher.code}</code></div> : null}
        {voucher.redemptionUrl && /^https?:\/\//i.test(voucher.redemptionUrl) ? <a className="text-button" href={voucher.redemptionUrl} target="_blank" rel="noopener noreferrer">Kupon bağlantısını aç ↗</a> : null}
        {voucher.instructions?.map(text => <p key={text}>{text}</p>)}
      </>}
    </div>}
  </section>;
}

export function Parcel({ story }: { story: Story }) {
  const [opened, setOpened] = useState(false);
  return <section className="parcel-area"><button className={`mystery-parcel ${opened ? 'opened' : ''}`} aria-expanded={opened} onClick={() => setOpened(o => !o)}><span className="parcel-lid" /><span className="parcel-ribbon" /><span className="parcel-question">?</span><span className="parcel-tag">{opened ? 'İpucunu sakla' : 'Bir ipucu aç'}</span></button>
    {opened ? <div className="parcel-note"><p>{story.parcel.hint}</p><p>{story.parcel.note}</p></div> : null}
  </section>;
}
