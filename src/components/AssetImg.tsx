import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Vault } from '../types';

export function AssetImg({ vault, id, alt, className = '', background = false }: { vault: Vault; id: string; alt: string; className?: string; background?: boolean }) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let alive = true;
    setUrl(undefined);
    setError(false);
    void vault.assetUrl(id).then(value => { if (alive) setUrl(value); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [vault, id, attempt]);
  if (error) {
    const notice = <div className={`asset-error ${background ? 'background-error' : ''}`} role="status"><span>{background ? 'Arka plan yüklenemedi.' : 'Görsel yüklenemedi.'}</span><button onClick={() => retry(a => a + 1)}>Yeniden dene</button></div>;
    return background ? createPortal(notice, document.body) : notice;
  }
  return url ? <img className={className} src={url} alt={alt} draggable={false} onError={() => setError(true)} /> : <span className={`asset-loading ${className}`} aria-label="Görsel yükleniyor" />;
}
