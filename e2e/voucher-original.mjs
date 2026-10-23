import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readOriginalAsset(directory, assetId) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = entries.filter(entry => entry.isFile() && path.parse(entry.name).name === assetId);
  if (matches.length !== 1) throw new Error('Expected exactly one original file for the voucher asset identifier.');
  return readFile(path.join(directory, matches[0].name));
}
