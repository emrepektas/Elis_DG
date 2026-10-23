export type Phase = 'welcome' | 'descent' | 'choose' | 'coast' | 'board' | 'sail' | 'fish' | 'haul' | 'notebook' | 'bedtime' | 'night' | 'arrival' | 'garden' | 'gifts' | 'celebration';
export type Point = [number, number];
export const KEYS: Point[] = [[233, 12], [253, -18], [272, 13]];
export const FLOWERS = KEYS;
export const canOpenChest = (collected: number[]) => KEYS.every((_, i) => collected.includes(i));
export const GIFT: Point = [278, -6];
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
  let x = Math.min(garden ? 289 : 5.3, Math.max(garden ? 220.5 : -13, w.x + dx));
  const z = Math.min(garden ? 31 : w.x > 2 ? -3.1 : 9, Math.max(garden ? -31 : w.x > 2 ? -4.9 : -9, w.z + dz));
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
export const duration: Partial<Record<Phase, number>> = { descent:5.5, board: 2, haul: 1.8, bedtime: 5, night: 20, arrival: 12 };
export function lightAt(phase: Phase, t: number): number {
  if (phase === 'bedtime') return smooth(t / 5);
  if (phase === 'night') return 1 - smooth((t - 14) / 6);
  return 0;
}

const voyageClamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export const GATES = [[9,-5.3],[14,-2.6],[19,-5]] as const;
export const ROCKS = [[7.8,-1.5],[11.5,-4],[13,-5.6],[16.7,-1.3],[18,-4],[20.6,-7]] as const;
export interface VoyageState { x:number; z:number; velocity:number; speed:number; elapsed:number; checkpoint:number; gates:number; bump:number; cooldown:number }
export const voyageStart=():VoyageState=>({x:5,z:-4,velocity:0,speed:.24,elapsed:0,checkpoint:0,gates:0,bump:0,cooldown:0});
/** Soft impacts slow forward progress and push away; checkpoints never discard the route. */
export function sailStep(v:VoyageState,keys:Set<string>,dt:number,assist:boolean):VoyageState{
 const n={...v},t=n.elapsed+=dt;
 n.cooldown=Math.max(0,n.cooldown-dt); n.bump=Math.max(0,n.bump-dt);
 const target=GATES.find(g=>g[0]>n.x+.3);
 const steer=assist?voyageClamp(((target?.[1]??-4)-n.z)*1.7,-1,1):Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 n.velocity+=(steer*3.5+Math.sin(t*1.55)*.15-n.velocity*5)*dt;
 n.z=voyageClamp(n.z+n.velocity*dt,-7.4,-.6);
 const desired=keys.has('KeyS')?.13:keys.has('KeyW')?.34:assist?.30:.245;
 n.speed+=(desired-n.speed)*dt*3.5;
 n.x=Math.min(22,n.x+n.speed*dt);
 if(n.cooldown===0){for(const [x,z] of ROCKS){if(Math.hypot((x-n.x)*1.3,z-n.z)<.78){n.velocity=(n.z>z?1:-1)*1.6;n.speed=.04;n.bump=.75;n.cooldown=2.2;break;}}}
 GATES.forEach(([x,z],i)=>{if(v.x<x&&n.x>=x){n.checkpoint=i+1;if(Math.abs(n.z-z)<1.1)n.gates|=1<<i;}});
 return n;
}
