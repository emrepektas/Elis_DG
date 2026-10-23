import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walk, spawn, lightAt, duration, arrivalDialogueBeat, KEYS, GIFT, canOpenChest } from '../src/adventure/logic.ts';
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

test('all three island keys and the rainbow chest are reachable inside the expanded shore bounds', () => {
  for (const [x,z] of [...KEYS,GIFT]) {
    const position={...spawn,x,z};
    assert.deepEqual(walk(position,new Set(),0,0,true),position);
  }
  let player={...spawn,x:223,z:-4};
  for(let i=0;i<1200;i++)player=walk(player,new Set(['KeyD','KeyS','ShiftLeft']),0,.05,true);
  assert.equal(player.x,289);assert.equal(player.z,31);
  for(let i=0;i<1200;i++)player=walk(player,new Set(['KeyA','KeyW','ShiftLeft']),0,.05,true);
  assert.equal(player.x,220.5);assert.equal(player.z,-31);
  assert.equal(KEYS.length,3);
  assert.equal(new Set(KEYS.map(([x,z])=>`${x},${z}`)).size,3);
  for(const [x,z] of KEYS)assert.ok(Math.hypot(x-GIFT[0],z-GIFT[1])>10,'A key must require exploring beyond the chest clearing');
});

test('the rainbow chest requires all three distinct key identities', () => {
  for(const incomplete of [[],[0],[1],[2],[0,1],[0,2],[1,2],[0,0,0],[1,1,2],[-1,0,1],[0,1,3]])assert.equal(canOpenChest(incomplete),false);
  for(const complete of [[0,1,2],[2,0,1],[0,1,1,2]])assert.equal(canOpenChest(complete),true);
});

test('arrival dialogue begins after all passengers land and leaves a beat before the island joke',()=>{
 assert.equal(arrivalDialogueBeat(0),8);
 assert.equal(arrivalDialogueBeat(6),8);
 assert.equal(arrivalDialogueBeat(9),10);
 assert.ok(duration.arrival!>arrivalDialogueBeat(15));
});
