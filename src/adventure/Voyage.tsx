import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Pole } from '../world/models';
import { GATES, ROCKS, type VoyageState } from './logic';
export { voyageStart, sailStep } from './logic';
export function VoyageMarkers({active,motion,progress}:{active:boolean;motion:boolean;progress:React.MutableRefObject<VoyageState>}){
 const buoys=useRef<THREE.Group>(null),waves=useRef<THREE.Group>(null);
 useFrame(({clock})=>{const t=motion?clock.elapsedTime:0;buoys.current?.children.forEach((g,i)=>{g.position.y=Math.sin(t*2+i)*.08;g.rotation.z=Math.sin(t*1.3+i)*.08;const won=!!(progress.current.gates&(1<<Math.floor(i/2)));g.scale.setScalar(won?.8:1);});waves.current?.children.forEach((g,i)=>{g.position.y=-.04+Math.sin(t*1.8+i)*.035;g.scale.z=.7+Math.sin(t*1.8+i)*.3;});});
 return <group visible={active}>
 <group ref={buoys}>{GATES.flatMap(([x,z],i)=>[-1,1].map(side=><group key={`${i}-${side}`} position={[x,0,z+side*1.6]}><Ball at={[0,.08,0]} scale={[.2,.28,.2]} color={side<0?'#f48776':'#8ad6b1'}/><Pole from={[0,.2,0]} to={[0,1,0]} color="#fff2d5" radius={.025}/><mesh position={[0,.88,0]}><sphereGeometry args={[.12,10,6]}/><meshStandardMaterial color="#ffe7a4" emissive="#e7bf57" emissiveIntensity={.4}/></mesh></group>))}</group>
 {ROCKS.map(([x,z],i)=><group key={i} position={[x,-.03,z]}><mesh scale={[.48,.35,.55]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#849c9a" roughness={1}/></mesh><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.65,.71,28]}/><meshBasicMaterial color="#edffeb" transparent opacity={.6} side={THREE.DoubleSide}/></mesh></group>)}
 <group ref={waves}>{Array.from({length:9},(_,i)=><mesh key={i} position={[6+i*1.8,0,-4]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.075,6]}/><meshBasicMaterial color="#e1fff2" transparent opacity={.25} side={THREE.DoubleSide}/></mesh>)}</group>
 </group>;
}
export function FruitFlies({motion}:{motion:boolean}){
 const group=useRef<THREE.Group>(null);
 useFrame(({clock})=>group.current?.children.forEach((fly,i)=>{const t=motion?clock.elapsedTime:0;fly.position.set(Math.sin(t*1.8+i*2)*.4,.35+Math.sin(t*2.1+i)*.14,Math.cos(t*1.5+i*2)*.35);fly.rotation.y=t*2+i;fly.children.slice(1).forEach((wing,j)=>wing.rotation.z=(j?1:-1)*(.5+Math.sin(t*45)*.45));}));
 return <group position={[41.8,.06,-2.6]}><Ball at={[0,.04,0]} scale={[.2,.15,.19]} color="#edb15a"/><Ball at={[.28,.02,.12]} scale={[.14,.13,.15]} color="#e58b72"/><group ref={group}>{Array.from({length:5},(_,i)=><group key={i}><Ball at={[0,0,0]} scale={[.045,.035,.065]} color="#66503d"/><Ball at={[-.045,.035,0]} scale={[.06,.008,.035]} color="#e2f4f1"/><Ball at={[.045,.035,0]} scale={[.06,.008,.035]} color="#e2f4f1"/></group>)}</group></group>;
}
