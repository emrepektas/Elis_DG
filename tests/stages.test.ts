import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currentStage,stageProgress} from '../src/adventure/stages.ts';
import type {Story} from '../src/types.ts';

const dialogue:NonNullable<Story['dialogue']>=['coast','sail','sail','haul','bedtime','arrival','garden','garden'].map(phase=>({phase,start:0,end:1,speaker:'blue',text:'Fixture'}));
test('stage jumps consume only earlier dialogue and leave destination discoveries playable',()=>{
 assert.deepEqual(stageProgress('welcome',dialogue),{keys:[],readLines:[]});
 assert.deepEqual(stageProgress('sail',dialogue),{keys:[],readLines:[0]});
 assert.deepEqual(stageProgress('bedtime',dialogue),{keys:[],readLines:[0,1,2,3]});
 assert.deepEqual(stageProgress('garden',dialogue),{keys:[],readLines:[0,1,2,3,4,5]});
 assert.deepEqual(stageProgress('celebration',dialogue),{keys:[0,1,2],readLines:[0,1,2,3,4,5,6,7]});
 const first=stageProgress('garden',dialogue);first.keys.push(2);first.readLines.push(7);
 assert.deepEqual(stageProgress('garden',dialogue).keys,[]);
 assert.equal(stageProgress('garden',dialogue).readLines.includes(7),false);
});
test('stage highlight includes the intermediate scenes in the correct chapter',()=>{
 assert.equal(currentStage('choose'),'welcome');
 assert.equal(currentStage('notebook'),'sail');
 assert.equal(currentStage('arrival'),'bedtime');
 assert.equal(currentStage('gifts'),'garden');
 assert.equal(currentStage('celebration'),'celebration');
});
