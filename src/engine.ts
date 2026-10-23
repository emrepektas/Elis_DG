import { stops } from './types.ts';
import type { Controls, JourneyAction, JourneyState, Stop } from './types';

export const initialState: JourneyState = {
  stop: 'coast', unlocked: 0, crew: [], penguin: false, sailed: false,
  fishing: 'idle', page: 0, flowerLifted: false, flowers: [], noteOpened: false,
};
function arrive(state: JourneyState, stop: Stop): JourneyState {
  return { ...state, stop, unlocked: Math.max(state.unlocked, stops.indexOf(stop)) };
}
export function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case 'visit': return stops.indexOf(action.stop) <= state.unlocked ? { ...state, stop: action.stop } : state;
    case 'begin': return state.stop === 'coast' ? arrive(state, 'crew') : state;
    case 'board': return state.stop === 'crew' && !state.crew.includes(action.id) ? { ...state, crew: [...state.crew, action.id] } : state;
    case 'crew-ready': return state.stop === 'crew' && state.crew.length >= 2 ? arrive(state, 'penguin') : state;
    case 'penguin-done': return state.stop === 'penguin' ? arrive({ ...state, penguin: true }, 'sailing') : state;
    case 'sail-done': return state.stop === 'sailing' ? arrive({ ...state, sailed: true }, 'fishing') : state;
    case 'cast': return state.stop === 'fishing' && state.fishing === 'idle' ? { ...state, fishing: 'cast' } : state;
    case 'bite': return state.stop === 'fishing' && state.fishing === 'cast' ? { ...state, fishing: 'bite' } : state;
    case 'reel': return state.stop === 'fishing' && state.fishing === 'bite' ? arrive({ ...state, fishing: 'caught' }, 'notebook') : state;
    case 'fish-assist': return state.stop === 'fishing' ? arrive({ ...state, fishing: 'caught' }, 'notebook') : state;
    case 'page': return state.stop === 'notebook' ? { ...state, page: Math.max(0, Math.floor(action.page)) } : state;
    case 'lift-flower': return state.stop === 'notebook' ? arrive({ ...state, flowerLifted: true }, 'garden') : state;
    case 'bloom': return state.stop === 'garden' && action.index >= 0 && action.index < 3 && !state.flowers.includes(action.index) ? { ...state, flowers: [...state.flowers, action.index] } : state;
    case 'open-note': return state.stop === 'garden' ? { ...state, noteOpened: true } : state;
    case 'garden-done': return state.stop === 'garden' && state.flowers.length === 3 && state.noteOpened ? arrive(state, 'gifts') : state;
    case 'replay': return { ...initialState, crew: [], flowers: [] };
  }
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export interface SailState { x: number; progress: number; gate: number; done: boolean }
export const sailStart: SailState = { x: 0, progress: 0, gate: 0, done: false };
export const sailGates = [{ progress: .23, x: -1.45 }, { progress: .49, x: 1.45 }, { progress: .76, x: -.7 }];
/** Normalized route, with gentle gates that wait rather than punish a missed turn. */
export function stepSail(previous: SailState, controls: Controls, delta: number): SailState {
  if (previous.done) return previous;
  const dt = clamp(delta, 0, .05);
  const x = clamp(previous.x + (Number(controls.right) - Number(controls.left)) * dt * 2.4, -2.7, 2.7);
  let progress = Math.min(1, previous.progress + (controls.forward ? dt * .095 : 0));
  let gate = previous.gate;
  const nextGate = sailGates[gate];
  if (nextGate && progress >= nextGate.progress) {
    if (Math.abs(x - nextGate.x) <= 1.05) gate += 1;
    else progress = nextGate.progress;
  }
  return { x, progress, gate, done: progress >= 1 && gate === sailGates.length };
}

export interface PenguinState { distance: number; y: number; vy: number; checkpoint: number; grounded: boolean; jumpHeld: boolean; done: boolean }
export const penguinStart: PenguinState = { distance: 0, y: 0, vy: 0, checkpoint: 0, grounded: true, jumpHeld: false, done: false };
export const pierGaps = [[2.1, 2.55], [4.4, 4.85]] as const;
/** Short, forgiving pier: missed jumps return to the last safe landing. */
export function stepPenguin(previous: PenguinState, controls: Controls, delta: number): PenguinState {
  if (previous.done) return previous;
  const dt = clamp(delta, 0, .05);
  const direction = Number(controls.forward || controls.right) - Number(controls.left);
  const distance = clamp(previous.distance + direction * dt * 1.8, 0, 7);
  let vy = previous.vy;
  if (controls.jump && !previous.jumpHeld && previous.grounded) vy = 3.8;
  vy -= 8 * dt;
  let y = previous.y + vy * dt;
  const gap = pierGaps.some(([start, end]) => distance > start && distance < end);
  let grounded = false;
  if (y <= 0 && previous.y >= -.04 && !gap) { y = 0; vy = 0; grounded = true; }
  if (y < -.8) return { ...penguinStart, distance: previous.checkpoint, checkpoint: previous.checkpoint, jumpHeld: controls.jump };
  const checkpoint = grounded && distance > 5.1 ? 5.1 : grounded && distance > 2.85 ? 2.85 : previous.checkpoint;
  return { distance, y, vy, checkpoint, grounded, jumpHeld: controls.jump, done: distance >= 7 && grounded };
}
