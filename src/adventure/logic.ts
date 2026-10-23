export type Phase = 'welcome' | 'descent' | 'choose' | 'coast' | 'board' | 'sail' | 'fish' | 'haul' | 'notebook' | 'bedtime' | 'night' | 'arrival' | 'garden' | 'gifts' | 'celebration';
export type Point = [number, number];
export const FLOWERS: Point[] = [[46, 1], [51, 4], [56, -1]];
export const GIFT: Point = [60, -6];
export interface Walker { x: number; z: number; y: number; vy: number; facing: number; walking: boolean }
export const spawn: Walker = { x: -7, z: 6, y: 0, vy: 0, facing: Math.PI, walking: false };
export function walk(w: Walker, keys: Set<string>, yaw: number, delta: number, garden: boolean): Walker {
  const dt = Math.max(0, Math.min(delta, .05));
  let right = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  let ahead = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const len = Math.hypot(right, ahead); if (len > 0) { right /= len; ahead /= len; }
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 2.65;
  const dx = (right * Math.cos(yaw) - ahead * Math.sin(yaw)) * dt * speed;
  const dz = (-right * Math.sin(yaw) - ahead * Math.cos(yaw)) * dt * speed;
  let x = Math.min(garden ? 63 : 5.3, Math.max(garden ? 40.5 : -13, w.x + dx));
  const z = Math.min(garden ? 13 : w.x > 2 ? -3.1 : 9, Math.max(garden ? -13 : w.x > 2 ? -4.9 : -9, w.z + dz));
  // Enter the pier from its mouth; walking towards another part of the shore
  // stops at the bank instead of teleporting sideways onto the planks.
  if(!garden && x>2 && (z < -4.9 || z > -3.1)) x=2;
  let vy = w.vy, y = w.y;
  if (keys.has('Space') && y === 0 && vy === 0) vy = 4.1;
  vy -= 12 * dt; y += vy * dt; if (y < 0) { y = 0; vy = 0; }
  return { x, z, y, vy, walking: len > 0, facing: len > 0 ? Math.atan2(dx, dz) : w.facing };
}
export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const smooth = (p: number) => { const x = Math.min(1, Math.max(0, p)); return x * x * (3 - 2 * x); };
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const cinematic = (phase: Phase) => ['descent','board','haul','bedtime','night','arrival'].includes(phase);
export const duration: Partial<Record<Phase, number>> = { descent:5.5, board: 2, haul: 1.8, bedtime: 3.5, night: 8, arrival: 4 };
export function lightAt(phase: Phase, t: number): number {
  if (phase === 'bedtime') return smooth(t / 3.5);
  if (phase === 'night') return 1 - smooth((t - 4.4) / 3.6);
  return 0;
}
