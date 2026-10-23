import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react';
import { unlock } from './crypto';
import type { Vault } from './types';
const Adventure=lazy(()=>import('./adventure/Adventure'));
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

export default function App() {
 const [vault,setVault]=useState<Vault>();
 useEffect(()=>()=>vault?.dispose(),[vault]);
 return vault?<Suspense fallback={<main className="password-world"><p>Yolculuk hazırlanıyor…</p></main>}><Adventure vault={vault} lock={()=>setVault(undefined)}/></Suspense>:<PasswordGate onUnlock={setVault}/>;
}
