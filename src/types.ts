export type Chapter = 'sea' | 'book' | 'garden';
export type SceneKind = 'welcome' | 'crew' | 'penguin' | 'shore' | 'book-entry' | 'birthday' | 'matching' | 'cozy' | 'stats' | 'promise' | 'flowers' | 'letter' | 'voucher' | 'parcel' | 'final';
export interface Scene { id: number; chapter: Chapter; kind: SceneKind; title: string; subtitle?: string; paragraphs: string[]; stickers: string[]; background: string; aside?: string; actionLabel?: string }
export interface Story {
  title: string; recipient: string; sender: string;
  chapterNames: Record<Chapter, string>;
  scenes: Scene[]; letter: string[]; assetAlts: Record<string, string>;
  activities: {
    penguin: { intro: string; steps: string[]; done: string };
    matching: { intro: string; rounds: { asset: string; owner: string; alt: string }[]; correct: string; tryAgain: string; done: string };
    flowers: { intro: string; items: { label: string; message: string }[]; done: string };
  };
  stats: { title: string; period: string; items: { value: string; label: string }[]; footnote: string };
  voucher: { status: 'pending' | 'ready'; title: string; description: string; assetId?: string; filename?: string; mime?: string; code?: string; redemptionUrl?: string; instructions?: string[] };
  parcel: { hint: string; note: string };
}
export interface AssetData { bytes: Uint8Array; mime: string; filename: string }
export interface Vault { story: Story; assetUrl(id: string): Promise<string>; assetBytes(id: string): Promise<AssetData>; dispose(): void }
