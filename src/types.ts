export const stops = ['coast', 'crew', 'penguin', 'sailing', 'fishing', 'notebook', 'garden', 'gifts'] as const;
export type Stop = typeof stops[number];
export interface Story {
  version: 2;
  title: string; recipient: string; sender: string;
  stops: Record<Stop, { title: string; hint: string; action: string }>;
  crew: { id: string; name: string; model: 'blue' | 'stone' }[];
  stickers: { id: string; alt: string; owner: string }[];
  notebook: { title: string; text: string; stickers: string[] }[];
  flowers: { label: string; message: string }[];
  motifs: string[];
  note: { status: 'pending' | 'ready'; paragraphs: string[] };
  voucher: { status: 'pending' | 'ready'; title: string; description: string; assetId?: string; filename?: string; mime?: string; code?: string; redemptionUrl?: string; instructions?: string[] };
  parcel: { hint: string; note: string };
}
export interface AssetData { bytes: Uint8Array; mime: string; filename: string }
export interface Vault { story: Story; assetUrl(id: string): Promise<string>; assetBytes(id: string): Promise<AssetData>; dispose(): void }
export interface JourneyState {
  stop: Stop;
  unlocked: number;
  crew: string[];
  penguin: boolean;
  sailed: boolean;
  fishing: 'idle' | 'cast' | 'bite' | 'caught';
  page: number;
  flowerLifted: boolean;
  flowers: number[];
  noteOpened: boolean;
}
export type JourneyAction =
  | { type: 'visit'; stop: Stop } | { type: 'begin' }
  | { type: 'board'; id: string } | { type: 'crew-ready' }
  | { type: 'penguin-done' } | { type: 'sail-done' }
  | { type: 'cast' } | { type: 'bite' } | { type: 'reel' } | { type: 'fish-assist' }
  | { type: 'page'; page: number } | { type: 'lift-flower' }
  | { type: 'bloom'; index: number } | { type: 'open-note' }
  | { type: 'garden-done' } | { type: 'replay' };
export interface Controls { left: boolean; right: boolean; forward: boolean; jump: boolean }
export interface WorldProps {
  story: Story; state: JourneyState;
  dispatch: (action: JourneyAction) => void;
  controls: React.MutableRefObject<Controls>;
  reducedMotion: boolean; paused: boolean; blocked?: boolean;
  onReady?: () => void; onFailure: () => void;
}
