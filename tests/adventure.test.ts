import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walk, spawn, lightAt, duration } from '../src/adventure/logic.ts';
test('third-person movement follows camera heading, diagonal speed is normalized, and boundaries retain a walkable dock', () => {
  const forward = walk(spawn, new Set(['KeyW']), 0, .05, false);
  assert.ok(forward.z < spawn.z && forward.x === spawn.x);
  const turned = walk(spawn, new Set(['KeyW']), Math.PI / 2, .05, false);
  assert.ok(turned.x < spawn.x);
  const diagonal = walk(spawn, new Set(['KeyW','KeyD']), 0, .05, false);
  assert.ok(Math.abs(Math.hypot(diagonal.x-spawn.x,diagonal.z-spawn.z) - (spawn.z-forward.z)) < 1e-10);
  let dock = { ...spawn, x: 3, z: -4 };
  for(let i=0;i<200;i++) dock=walk(dock,new Set(['KeyD']),0,.05,false);
  assert.equal(dock.x,5.3); assert.ok(dock.z >= -5.2 && dock.z <= -2.8);
});
test('overnight passage reaches full darkness and returns to daylight before landing', () => {
  assert.equal(lightAt('bedtime',0),0); assert.equal(lightAt('bedtime',duration.bedtime!),1);
  assert.equal(lightAt('night',0),1); assert.equal(lightAt('night',duration.night!),0);
  assert.equal(lightAt('garden',0),0);
});

test('the shore blocks walking into water without snapping the player onto the pier', () => {
  let player={...spawn,x:1.95,z:6};
  for(let i=0;i<20;i++)player=walk(player,new Set(['KeyD']),0,.05,false);
  assert.equal(player.x,2);assert.equal(player.z,6);
  for(let i=0;i<80;i++)player=walk(player,new Set(['KeyW']),0,.05,false);
  assert.ok(player.z < -3.1 && player.z > -4.9);
  player=walk(player,new Set(['KeyD']),0,.05,false);
  assert.ok(player.x>2);
});
