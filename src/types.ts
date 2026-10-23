export const stops = ['coast', 'crew', 'penguin', 'sailing', 'fishing', 'notebook', 'garden', 'gifts'] as const;
export type Stop = typeof stops[number];
export interface Story {
  version: 3;
  avatars: { id: 'blue' | 'stone' | 'penguin' | 'capybara' | 'child'; name: string; sticker?: string }[];
  title: string; recipient: string; sender: string;
  welcomeTitle?: string;
  dialogue?: {phase:string;start:number;end:number;speaker: 'blue' | 'stone' | 'penguin' | 'capybara' | 'child';text:string;cue?:string;trigger?:'keys-complete'|'chest'|'wave-near';gesture?:'point'|'laugh'|'reach'|'book'|'sleep'|'wave'}[];
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
