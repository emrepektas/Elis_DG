import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, journeyReducer as reduce, stepPenguin, stepSail, penguinStart, sailStart, sailGates } from '../src/engine.ts';
import type { Controls, JourneyState } from '../src/types.ts';

const idle: Controls = { left: false, right: false, forward: false, jump: false };
function crew(): JourneyState {
  let state = reduce(initialState, { type: 'begin' });
  state = reduce(state, { type: 'board', id: 'first' });
  state = reduce(state, { type: 'board', id: 'second' });
  return reduce(state, { type: 'crew-ready' });
}
test('journey unlocks in order and duplicate boarding cannot advance it', () => {
  assert.equal(reduce(initialState, { type: 'visit', stop: 'gifts' }), initialState);
  let state = reduce(initialState, { type: 'begin' });
  state = reduce(state, { type: 'board', id: 'first' });
  state = reduce(state, { type: 'board', id: 'first' });
  assert.equal(state.crew.length, 1);
  assert.equal(reduce(state, { type: 'crew-ready' }).stop, 'crew');
  assert.equal(crew().stop, 'penguin');
});
test('fishing requires a cast and bite; discoveries survive map revisits and replay clears them', () => {
  let state = reduce(reduce(crew(), { type: 'penguin-done' }), { type: 'sail-done' });
  assert.equal(reduce(state, { type: 'fish-assist' }).stop, 'notebook');
  assert.equal(reduce(state, { type: 'reel' }), state);
  state = reduce(state, { type: 'cast' });
  state = reduce(state, { type: 'bite' });
  state = reduce(state, { type: 'reel' });
  assert.equal(state.stop, 'notebook');
  assert.equal(state.fishing, 'caught');
  state = reduce(state, { type: 'lift-flower' });
  assert.equal(reduce(state, { type: 'garden-done' }), state);
  for (const index of [0, 1, 1, 2, -1, 3]) state = reduce(state, { type: 'bloom', index });
  assert.deepEqual(state.flowers, [0, 1, 2]);
  state = reduce(state, { type: 'open-note' });
  state = reduce(state, { type: 'garden-done' });
  assert.equal(state.stop, 'gifts');
  state = reduce(state, { type: 'visit', stop: 'crew' });
  assert.equal(state.flowers.length, 3);
  assert.equal(state.fishing, 'caught');
  assert.equal(reduce(state, { type: 'visit', stop: 'gifts' }).stop, 'gifts');
  assert.deepEqual(reduce(state, { type: 'replay' }), initialState);
});
test('boat waits at a missed buoy, is bounded, and can be steered back without restarting', () => {
  let boat = { ...sailStart, x: 2.7 };
  for (let i = 0; i < 500; i++) boat = stepSail(boat, { ...idle, forward: true, right: true }, 1 / 60);
  assert.equal(boat.gate, 0);
  assert.equal(boat.progress, sailGates[0].progress);
  assert.equal(boat.x, 2.7);
  for (let i = 0; i < 90; i++) boat = stepSail(boat, { ...idle, left: true }, 1 / 60);
  for (let i = 0; i < 1000 && !boat.done; i++) {
    const target = sailGates[boat.gate]?.x ?? 0;
    boat = stepSail(boat, { ...idle, forward: true, left: boat.x > target + .1, right: boat.x < target - .1 }, 1 / 60);
  }
  assert.equal(boat.done, true);
  assert.equal(boat.gate, 3);
});
test('sailing is frame-rate independent and a suspended tab cannot teleport the boat', () => {
  let a = { ...sailStart }, b = { ...sailStart };
  for (let i = 0; i < 120; i++) a = stepSail(a, { ...idle, forward: true }, 1 / 60);
  for (let i = 0; i < 60; i++) b = stepSail(b, { ...idle, forward: true }, 1 / 30);
  assert.ok(Math.abs(a.progress - b.progress) < 1e-10);
  assert.ok(stepSail(sailStart, { ...idle, forward: true }, 20).progress < .01);
});
test('penguin falls to a safe checkpoint and can finish through two actual jumps', () => {
  let bird = { ...penguinStart };
  for (let i = 0; i < 120; i++) bird = stepPenguin(bird, { ...idle, forward: true }, 1 / 60);
  assert.ok(bird.distance < 2.1, 'Missed gap should recover onto the pier');
  bird = { ...penguinStart };
  for (let i = 0; i < 600 && !bird.done; i++) {
    const jump = (bird.distance > 1.5 && bird.distance < 1.65) || (bird.distance > 3.8 && bird.distance < 3.95);
    bird = stepPenguin(bird, { ...idle, forward: true, jump }, 1 / 60);
  }
  assert.equal(bird.done, true);
  assert.ok(bird.checkpoint >= 5);
});
