import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GATES, ROCKS, VOYAGE_END, sailStep, voyageStart, type VoyageState } from '../src/adventure/logic.ts';

const none = new Set<string>();
function simulate(state: VoyageState, seconds: number, hz: number, keys = none, assist = false): VoyageState {
  let next = state;
  for (let frame = 0; frame < Math.round(seconds * hz); frame++) next = sailStep(next, keys, 1 / hz, assist);
  return next;
}

test('steering stays in the navigable channel and a soft collision never loses route progress', () => {
  for (const key of ['KeyA', 'KeyD']) {
    let state = voyageStart();
    for (let frame = 0; frame < 90 * 60; frame++) {
      const previous = state;
      state = sailStep(state, new Set([key]), 1 / 60, false);
      assert.ok(state.z >= -7.4 && state.z <= -.6);
      assert.ok(state.x >= previous.x && state.x <= VOYAGE_END);
      assert.ok(Number.isFinite(state.velocity));
    }
    assert.equal(state.x, VOYAGE_END);
  }
});

test('rock contact slows the boat, pushes away, and provides a brief impact cooldown', () => {
  const [x, z] = ROCKS[0];
  const before = { ...voyageStart(), x, z: z + .1, checkpoint: 2, gates: 3 };
  const hit = sailStep(before, none, 1 / 60, false);
  assert.equal(hit.speed, .24);
  assert.ok(hit.velocity > 0);
  assert.ok(hit.bump > 0 && hit.cooldown > 2);
  assert.equal(hit.checkpoint, 2);
  assert.equal(hit.gates, 3);
  assert.ok(hit.x >= before.x);
  const recovering = sailStep(hit, none, 1 / 60, false);
  assert.ok(recovering.cooldown < hit.cooldown);
  assert.ok(recovering.bump < hit.bump);
  assert.ok(recovering.speed > hit.speed);
});

test('checkpoint passage records success once and missed gates do not block the journey', () => {
  for (const [index, [x, z]] of GATES.entries()) {
    const passed = sailStep({ ...voyageStart(), x: x - .001, z, gates: 1 }, none, .05, false);
    assert.equal(passed.checkpoint, index + 1);
    assert.ok(passed.gates & (1 << index));
    const after = sailStep(passed, none, .05, false);
    assert.equal(after.gates, passed.gates);
    const missed = sailStep({ ...voyageStart(), x: x - .001, z: -.6 }, none, .05, false);
    assert.equal(missed.checkpoint, index + 1);
    assert.equal(missed.gates, 0);
  }
});

test('assisted sailing reaches the island through all three checkpoints at common frame rates', () => {
  const results = [30, 60, 120].map(hz => simulate(voyageStart(), 90, hz, none, true));
  for (const state of results) {
    assert.equal(state.x, VOYAGE_END);
    assert.equal(state.checkpoint, 3);
    assert.equal(state.gates, 7);
  }
  assert.ok(Math.max(...results.map(state => state.z)) - Math.min(...results.map(state => state.z)) < .05);
});

test('forward and brake inputs change travel speed without freezing the crossing', () => {
  const fast = simulate(voyageStart(), 5, 60, new Set(['KeyW']));
  const neutral = simulate(voyageStart(), 5, 60);
  const slow = simulate(voyageStart(), 5, 60, new Set(['KeyS']));
  assert.ok(fast.x > neutral.x && neutral.x > slow.x);
  assert.ok(slow.x > voyageStart().x);
});

test('the longer course covers six times the old distance at a useful cruising speed',()=>{const state=simulate(voyageStart(),10,60,none,true);assert.ok(state.x-voyageStart().x>15);assert.equal(VOYAGE_END-voyageStart().x,102);assert.ok(GATES[1][0]-GATES[0][0]>=30);});
