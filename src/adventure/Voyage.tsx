import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Pole } from '../world/models';
import { GATES, GIFT, ROCKS, type VoyageState } from './logic';
import { PinkRibbon } from './StoryCallbacks';
export { voyageStart, sailStep } from './logic';
export function VoyageMarkers({active,motion,progress}:{active:boolean;motion:boolean;progress:React.MutableRefObject<VoyageState>}){
 const buoys=useRef<THREE.Group>(null),waves=useRef<THREE.Group>(null),largeWave=useRef<THREE.Group>(null);
 useFrame(({clock})=>{if(!largeWave.current)return;const t=motion?clock.elapsedTime:0;const proximity=1-THREE.MathUtils.smoothstep(Math.abs(progress.current.x-103),0,12);largeWave.current.position.y=.05+proximity*.22+Math.sin(t*2.2)*.07;largeWave.current.scale.y=.5+proximity*.65;largeWave.current.rotation.z=Math.sin(t*1.4)*.025;largeWave.current.userData.nearBoat=proximity;});
 useFrame(({clock})=>{const t=motion?clock.elapsedTime:0;buoys.current?.children.forEach((g,i)=>{g.position.y=Math.sin(t*2+i)*.08;g.rotation.z=Math.sin(t*1.3+i)*.08;const won=!!(progress.current.gates&(1<<Math.floor(i/2)));g.scale.setScalar(won?.8:1);});waves.current?.children.forEach((g,i)=>{g.position.y=-.04+Math.sin(t*1.8+i)*.035;g.scale.z=.7+Math.sin(t*1.8+i)*.3;});});
 return <group visible={active}>
 <group ref={buoys}>{GATES.flatMap(([x,z],i)=>[-1,1].map(side=><group key={`${i}-${side}`} position={[x,0,z+side*1.6]}><Ball at={[0,.08,0]} scale={[.2,.28,.2]} color={side<0?'#f48776':'#8ad6b1'}/><Pole from={[0,.2,0]} to={[0,1,0]} color="#fff2d5" radius={.025}/><mesh position={[0,.88,0]}><sphereGeometry args={[.12,10,6]}/><meshStandardMaterial color="#ffe7a4" emissive="#e7bf57" emissiveIntensity={.4}/></mesh></group>))}</group>
 {ROCKS.map(([x,z],i)=><group key={i} position={[x,-.03,z]}><mesh scale={[.48,.35,.55]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#849c9a" roughness={1}/></mesh><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.65,.71,28]}/><meshBasicMaterial color="#edffeb" transparent opacity={.6} side={THREE.DoubleSide}/></mesh></group>)}
 <group ref={waves}>{Array.from({length:9},(_,i)=><mesh key={i} position={[11+i*10,0,-4]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.075,6]}/><meshBasicMaterial color="#e1fff2" transparent opacity={.25} side={THREE.DoubleSide}/></mesh>)}</group>
 <group ref={largeWave} name="notebook-accident-wave" position={[103,0,-4]} rotation={[0,Math.PI/2,0]}>
   <mesh scale={[4.5,.65,.55]}><sphereGeometry args={[1,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#66cdd3" transparent opacity={.8} roughness={.35}/></mesh>
   {Array.from({length:13},(_,i)=><Ball key={i} at={[(i-6)*.65,.48,0]} scale={[.45,.15,.17]} color="#e6fff2"/>)}
 </group>
 </group>;
}
export function FruitFlies({motion,party=false,invitation=false}:{motion:boolean;party?:boolean;invitation?:boolean}){
 const group=useRef<THREE.Group>(null),invitationTime=useRef(0);
 useFrame(({clock},delta)=>{
  invitationTime.current=invitation?invitationTime.current+(motion?Math.min(delta,.05):0):0;
  group.current?.children.forEach((fly,i)=>{
   const t=motion?clock.elapsedTime:0,phase=t*1.8+i*2;
   const carrier=invitation&&!party&&i===0;
   const travel=carrier?(motion?THREE.MathUtils.smoothstep(invitationTime.current,0,8):1):0;
   const x=Math.sin(phase)*(party?2.3:.4)+(GIFT[0]-221.8)*travel;
   const y=(party?1.4:carrier?1.5:.35)+Math.sin(t*2.1+i)*(party?.55:.14)+Math.sin(travel*Math.PI)*1.2;
   const z=Math.sin(party?phase*2:t*1.5+i*2)*(party?1.1:.35)+(GIFT[1]+2.6)*travel;
   fly.position.set(x,y,z);
   fly.rotation.y=carrier?-Math.PI/2:t*2+i;
   fly.userData.invitationProgress=travel;
   fly.children.filter(child=>child.name==='fly-wing').forEach((wing,j)=>wing.rotation.z=(j?1:-1)*(.5+Math.sin(t*45)*.45));
  });
 });
 return <group name={party?'party-fruit-flies':'arrival-fruit-flies'} position={party?[GIFT[0],.1,GIFT[1]]:[221.8,.06,-2.6]}>
  {!party&&<><Ball at={[0,.04,0]} scale={[.2,.15,.19]} color="#edb15a"/><Ball at={[.28,.02,.12]} scale={[.14,.13,.15]} color="#e58b72"/></>}
  <group ref={group}>{Array.from({length:5},(_,i)=><group key={i} name={i===0?'ribbon-carrying-fruit-fly':undefined}>
   <Ball at={[0,0,0]} scale={party?[.075,.055,.095]:[.045,.035,.065]} color="#66503d"/>
   <group name="fly-wing"><Ball at={[-.045,.035,0]} scale={[.06,.008,.035]} color="#e2f4f1"/></group>
   <group name="fly-wing"><Ball at={[.045,.035,0]} scale={[.06,.008,.035]} color="#e2f4f1"/></group>
   {party&&<group position={[0,-.025,.1]}><PinkRibbon scale={.4}/></group>}
   {!party&&i===0&&invitation&&<group name="carried-party-ribbon" position={[0,-.16,0]}><PinkRibbon scale={.8}/></group>}
  </group>)}</group>
 </group>;
}
