import type { Story } from './types';

const stopIds = ['coast', 'crew', 'penguin', 'sailing', 'fishing', 'notebook', 'garden', 'gifts'];
const assetId = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
type RecordValue = Record<string, unknown>;
function object(value: unknown): value is RecordValue { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max = 4000): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
function list(value: unknown, min: number, max: number): value is unknown[] { return Array.isArray(value) && value.length >= min && value.length <= max; }
function identifier(value: unknown): value is string { return typeof value === 'string' && assetId.test(value); }
function validUrl(value: unknown): boolean {
  if (!text(value, 2048)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

/** Validate decrypted inputs before rendering or resolving any asset references. */
export function validateStory(value: unknown): asserts value is Story {
  const fail = (): never => { throw new Error('Geçersiz yolculuk içeriği.'); };
  if (!object(value) || value.version !== 3 || !text(value.title, 200) || !text(value.sender, 100) || !text(value.recipient, 100)) fail();
  const story = value as RecordValue;
  const allowed = new Set(['version', 'title', 'sender', 'recipient', 'avatars', 'stops', 'crew', 'stickers', 'notebook', 'flowers', 'motifs', 'note', 'voucher', 'parcel']);
  if (Object.keys(story).some(key => !allowed.has(key))) fail();
  if (!object(story.stops) || Object.keys(story.stops).length !== stopIds.length) fail();
  const journeyStops = story.stops as RecordValue;
  for (const id of stopIds) {
    const stop = journeyStops[id];
    if (!object(stop) || !text(stop.title, 200) || !text(stop.hint, 600) || !text(stop.action, 100)) fail();
  }
  if (!list(story.crew, 2, 2)) fail();
  const crewIds = new Set<string>();
  const models = new Set<string>();
  for (const person of story.crew as unknown[]) {
    if (!object(person) || !identifier(person.id) || !text(person.name, 100) || !['blue', 'stone'].includes(String(person.model)) || crewIds.has(String(person.id))) fail();
    const entry = person as RecordValue;
    crewIds.add(entry.id as string); models.add(entry.model as string);
  }
  if (models.size !== 2 || !list(story.stickers, 1, 64)) fail();
  const stickers = new Set<string>();
  for (const sticker of story.stickers as unknown[]) {
    if (!object(sticker) || !identifier(sticker.id) || !text(sticker.alt, 600) || ![story.sender, story.recipient].includes(sticker.owner) || stickers.has(String(sticker.id))) fail();
    stickers.add((sticker as RecordValue).id as string);
  }
  const avatarModels = new Set(['blue', 'stone', 'penguin', 'capybara', 'child']);
  if (!list(story.avatars, 5, 5)) fail();
  for (const avatar of story.avatars as unknown[]) {
    if (!object(avatar) || !avatarModels.delete(String(avatar.id)) || !text(avatar.name, 100)) fail();
    const entry = avatar as RecordValue;
    if (Object.keys(entry).some(key => !['id', 'name', 'sticker'].includes(key))) fail();
    if (entry.sticker !== undefined && (!identifier(entry.sticker) || !stickers.has(entry.sticker))) fail();
  }
  if (avatarModels.size !== 0) fail();
  if (!list(story.notebook, 3, 3)) fail();
  const shown = new Set<string>();
  for (const page of story.notebook as unknown[]) {
    if (!object(page) || !text(page.title, 200) || typeof page.text !== 'string' || page.text.length > 1000 || !list(page.stickers, 1, 12)) fail();
    for (const id of (page as RecordValue).stickers as unknown[]) {
      if (!identifier(id) || !stickers.has(String(id))) fail();
      shown.add(id as string);
    }
  }
  if (shown.size !== stickers.size || !list(story.flowers, 3, 3)) fail();
  for (const flower of story.flowers as unknown[]) if (!object(flower) || !text(flower.label, 100) || !text(flower.message, 1500)) fail();
  if (!list(story.motifs, 0, 8) || (story.motifs as unknown[]).some(motif => !text(motif, 200))) fail();
  if (!object(story.note) || !['pending', 'ready'].includes(String(story.note.status)) || !list(story.note.paragraphs, 0, 12) || story.note.paragraphs.some(paragraph => !text(paragraph, 5000))) fail();
  const note = story.note as RecordValue;
  if ((note.status === 'pending' && (note.paragraphs as unknown[]).length !== 0) || (note.status === 'ready' && (note.paragraphs as unknown[]).length === 0)) fail();
  if (!object(story.voucher) || !['pending', 'ready'].includes(String(story.voucher.status)) || !text(story.voucher.title, 200) || !text(story.voucher.description, 1500)) fail();
  const voucher = story.voucher as RecordValue;
  if (voucher.assetId !== undefined && !identifier(voucher.assetId)) fail();
  if (voucher.filename !== undefined && (!text(voucher.filename, 240) || /[\\/\r\n]/.test(voucher.filename as string))) fail();
  if (voucher.mime !== undefined && !text(voucher.mime, 100)) fail();
  if (voucher.code !== undefined && !text(voucher.code, 500)) fail();
  if (voucher.redemptionUrl !== undefined && !validUrl(voucher.redemptionUrl)) fail();
  if (voucher.instructions !== undefined && (!list(voucher.instructions, 0, 12) || voucher.instructions.some(instruction => !text(instruction, 1500)))) fail();
  if (voucher.status === 'ready' && !voucher.assetId && !voucher.code && !voucher.redemptionUrl) fail();
  if (voucher.status === 'pending' && (voucher.assetId || voucher.code || voucher.redemptionUrl)) fail();
  if (!object(story.parcel) || !text(story.parcel.hint, 600) || !text(story.parcel.note, 1000)) fail();
}

export function referencedAssets(story: Story): string[] {
  return [...new Set([...story.stickers.map(sticker => sticker.id), ...story.avatars.flatMap(avatar => avatar.sticker ? [avatar.sticker] : []), ...(story.voucher.assetId ? [story.voucher.assetId] : [])])];
}
