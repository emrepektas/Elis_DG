import type { Story } from '../types';
import type { Phase } from './logic';

export const STAGES = [
 {phase:'welcome',label:'Başlangıç'},
 {phase:'sail',label:'Tekne yolculuğu'},
 {phase:'bedtime',label:'Gece yolculuğu'},
 {phase:'garden',label:'Adada anahtar avı'},
 {phase:'celebration',label:'Kutlama'},
] as const;
export type Stage = typeof STAGES[number]['phase'];
const sequence:Phase[]=['welcome','descent','choose','coast','board','sail','overboard','fish','haul','drying','notebook','bedtime','night','arrival','garden','treasure','gifts','celebration'];
export function currentStage(phase:Phase):Stage {
 return [...STAGES].reverse().find(stage=>sequence.indexOf(stage.phase)<=sequence.indexOf(phase))!.phase;
}
export function stageProgress(stage:Stage,dialogue:NonNullable<Story['dialogue']>) {
 const start=sequence.indexOf(stage);
 return {
  keys:stage==='celebration'?[0,1,2]:[],
  readLines:dialogue.flatMap((line,index)=>sequence.indexOf(line.phase as Phase)<start?[index]:[]),
 };
}
