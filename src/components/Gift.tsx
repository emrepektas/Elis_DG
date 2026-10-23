import { useState } from 'react';
import type { Story } from '../types';

export function Parcel({ story }: { story: Story }) {
  const [opened, setOpened] = useState(false);
  return <section className="parcel-area"><button className={`mystery-parcel ${opened ? 'opened' : ''}`} aria-expanded={opened} onClick={() => setOpened(o => !o)}><span className="parcel-lid" /><span className="parcel-ribbon" /><span className="parcel-question">?</span><span className="parcel-tag">{opened ? 'İpucunu sakla' : 'Bir ipucu aç'}</span></button>
    {opened ? <div className="parcel-note"><p>{story.parcel.hint}</p><p>{story.parcel.note}</p></div> : null}
  </section>;
}
