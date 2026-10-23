import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box } from '../world/models';

function KeyShape(){return <group rotation={[0,0,-.35]}><mesh position={[0,.25,0]}><torusGeometry args={[.23,.065,8,24]}/><meshStandardMaterial color="#ffe28a" metalness={.6} roughness={.25}/></mesh><Box at={[0,-.13,0]} scale={[.1,.55,.11]} color="#efbf4d"/><Box at={[.1,-.3,0]} scale={[.24,.09,.11]} color="#efbf4d"/><Box at={[.1,-.15,0]} scale={[.24,.09,.11]} color="#efbf4d"/></group>}
/** Nearby glints reveal the object without broadcasting all hiding spots. */
export function HiddenKey({index,collected,nearby,motion}:{index:number;collected:boolean;nearby:boolean;motion:boolean}){
 const key=useRef<THREE.Group>(null),spark=useRef<THREE.Group>(null);
 useFrame(({clock})=>{const t=motion?clock.elapsedTime:0;if(key.current){key.current.rotation.y=t*.8+index;key.current.position.y=1.05+Math.sin(t*1.8+index)*.12;}if(spark.current){spark.current.rotation.y=t*.35;spark.current.scale.setScalar(.8+Math.sin(t*3)*.15);}});
 if(collected)return null;
 return <group><mesh position={[0,.13,0]} receiveShadow><cylinderGeometry args={[.65,.85,.26,10]}/><meshStandardMaterial color="#d5c5a0"/></mesh><group ref={key} position={[0,1.05,0]}><KeyShape/></group>{nearby&&<group ref={spark}>{Array.from({length:5},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.7,.6+i*.25,Math.cos(i*2.4)*.7]}><octahedronGeometry args={[.045]}/><meshBasicMaterial color="#fff0ac"/></mesh>)}</group>}</group>
}
export function RainbowChest({keys,open,motion}:{keys:number;open:boolean;motion:boolean}){
 const lid=useRef<THREE.Group>(null);
 useFrame((_,dt)=>{if(lid.current)lid.current.rotation.x=THREE.MathUtils.damp(lid.current.rotation.x,open?-1.65:0,motion?5:1000,dt);});
 return <group><Box at={[0,.65,0]} scale={[2.5,1.3,1.6]} color="#b77e4c"/>{[-1,1].map(x=><Box key={x} at={[x,.65,0]} scale={[.12,1.35,1.68]} color="#e5bf68"/>)}<group ref={lid} position={[0,1.3,-.8]}><Box at={[0,.11,.8]} scale={[2.58,.3,1.7]} color="#d39b5e"/>{[-1,1].map(x=><Box key={x} at={[x,.14,.8]} scale={[.13,.35,1.75]} color="#f1cf77"/>)}</group>{[0,1,2].map(i=><group key={i} position={[(i-1)*.57,1,.86]}><mesh position={[0,.07,0]}><torusGeometry args={[.14,.035,8,16,Math.PI]}/><meshStandardMaterial color={i<keys?'#c6d9bb':'#ffdc7a'}/></mesh><Box at={[0,-.1,0]} scale={[.31,.29,.13]} color={i<keys?'#87b98a':'#e9bb59'}/><mesh position={[0,-.1,.075]}><circleGeometry args={[.035,10]}/><meshBasicMaterial color="#674d37"/></mesh></group>)}{open&&<pointLight position={[0,1.6,0]} color="#ffe7a7" intensity={3} distance={5}/>}</group>
}
