import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Box } from '../world/models';

function KeyShape(){return <group rotation={[0,0,-.35]}><mesh position={[0,.25,0]}><torusGeometry args={[.23,.065,8,24]}/><meshStandardMaterial color="#ffe28a" metalness={.6} roughness={.25}/></mesh><Box at={[0,-.13,0]} scale={[.1,.55,.11]} color="#efbf4d"/><Box at={[.1,-.3,0]} scale={[.24,.09,.11]} color="#efbf4d"/><Box at={[.1,-.15,0]} scale={[.24,.09,.11]} color="#efbf4d"/></group>}
/** Nearby glints reveal the object without broadcasting all hiding spots. */
export function HiddenKey({index,collected,nearby,motion}:{index:number;collected:boolean;nearby:boolean;motion:boolean}){
 const key=useRef<THREE.Group>(null),spark=useRef<THREE.Group>(null),stone=useRef<THREE.Group>(null),flies=useRef<THREE.Group>(null),ribbon=useRef<THREE.Group>(null);
 const reveal=useRef(collected?1:0);
 useFrame(({clock},dt)=>{
   const t=motion?clock.elapsedTime:0;
   reveal.current=motion?THREE.MathUtils.damp(reveal.current,collected||nearby?1:0,4,dt):collected||nearby?1:0;
   if(key.current){key.current.rotation.y=t*.8+index;key.current.rotation.z=index===1?Math.sin(t*1.7)*.16:0;key.current.position.y=(index===0?.55:index===1?1.25:1.05)+Math.sin(t*1.8+index)*.1;}
   if(stone.current){stone.current.position.y=motion?THREE.MathUtils.damp(stone.current.position.y,collected?.7:0,4,dt):collected?.7:0;stone.current.rotation.z=(collected?-.35:-.12)*reveal.current;}
   if(ribbon.current)ribbon.current.rotation.z=Math.sin(t*1.7)*.13;
   if(spark.current){spark.current.rotation.y=t*.35;spark.current.scale.setScalar(.8+Math.sin(t*3)*.15);}
   flies.current?.children.forEach((fly,i)=>{const spread=.17+reveal.current*1.15;fly.position.set(Math.sin(t*2+i*2)*spread,1.05+Math.sin(t*2.6+i)*.13+reveal.current*.35,Math.cos(t*2.2+i*2)*spread);fly.rotation.y=t*2+i;fly.children.slice(1).forEach((wing,j)=>wing.rotation.z=(j?1:-1)*(.5+Math.sin(t*45)*.45));});
 });
 return <group name={`key-discovery-${index}`} userData={{collected,nearby}}>
   <mesh position={[0,.08,0]} receiveShadow><cylinderGeometry args={[.72,.88,.16,10]}/><meshStandardMaterial color={index===0?'#d5c5a0':'#a2ba78'}/></mesh>
   {index===0&&<group ref={stone} name="key-lifting-stone"><mesh position={[0,.32,-.3]} scale={[.76,.42,.6]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#b4c0b1" roughness={1}/></mesh><Ball at={[-.4,.55,-.31]} scale={[.11,.035,.16]} color="#8da67b"/></group>}
   {index===1&&<group name="key-ribbon-bush">
     {[-1,0,1].map(i=><Ball key={i} at={[i*.37,.55,Math.abs(i)*.12]} scale={[.5,.55,.46]} color={i===0?'#88b893':'#6a9f7f'}/>)}
     <group ref={ribbon} position={[0,1.6,0]}><Box at={[0,-.23,0]} scale={[.045,.46,.035]} color="#eab4ca"/>{[-1,1].map(side=><mesh key={side} position={[side*.11,0,0]} rotation={[0,0,side*.35]} scale={[1,.6,1]}><torusGeometry args={[.12,.035,8,18]}/><meshStandardMaterial color="#eab4ca"/></mesh>)}</group>
   </group>}
   {index===2&&<group name="key-fruit-fly-picnic"><Ball at={[-.35,.18,.12]} scale={[.23,.21,.2]} color="#e9b25d"/><Ball at={[.34,.15,-.12]} scale={[.2,.16,.21]} color="#e79379"/>
     <group ref={flies} name="key-scattering-flies">{Array.from({length:7},(_,i)=><group key={i}><Ball at={[0,0,0]} scale={[.05,.04,.07]} color="#66503d"/><Ball at={[-.05,.04,0]} scale={[.07,.01,.04]} color="#e2f4f1"/><Ball at={[.05,.04,0]} scale={[.07,.01,.04]} color="#e2f4f1"/></group>)}</group>
   </group>}
   {!collected&&<group ref={key} name={`discovery-key-${index}`} position={[0,1.05,.1]}><KeyShape/></group>}
   {nearby&&!collected&&<group ref={spark}>{Array.from({length:5},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.7,.6+i*.25,Math.cos(i*2.4)*.7]}><octahedronGeometry args={[.045]}/><meshBasicMaterial color="#fff0ac"/></mesh>)}</group>}
 </group>
}
export function RainbowChest({keys,open,motion}:{keys:number;open:boolean;motion:boolean}){
 const lid=useRef<THREE.Group>(null);
 useFrame((_,dt)=>{if(lid.current)lid.current.rotation.x=THREE.MathUtils.damp(lid.current.rotation.x,open?-1.65:0,motion?5:1000,dt);});
 return <group><Box at={[0,.65,0]} scale={[2.5,1.3,1.6]} color="#b77e4c"/>{[-1,1].map(x=><Box key={x} at={[x,.65,0]} scale={[.12,1.35,1.68]} color="#e5bf68"/>)}<group ref={lid} position={[0,1.3,-.8]}><Box at={[0,.11,.8]} scale={[2.58,.3,1.7]} color="#d39b5e"/>{[-1,1].map(x=><Box key={x} at={[x,.14,.8]} scale={[.13,.35,1.75]} color="#f1cf77"/>)}</group>{[0,1,2].map(i=><group key={i} position={[(i-1)*.57,1,.86]}><mesh position={[0,.07,0]}><torusGeometry args={[.14,.035,8,16,Math.PI]}/><meshStandardMaterial color={i<keys?'#c6d9bb':'#ffdc7a'}/></mesh><Box at={[0,-.1,0]} scale={[.31,.29,.13]} color={i<keys?'#87b98a':'#e9bb59'}/><mesh position={[0,-.1,.075]}><circleGeometry args={[.035,10]}/><meshBasicMaterial color="#674d37"/></mesh></group>)}{open&&<pointLight position={[0,1.6,0]} color="#ffe7a7" intensity={3} distance={5}/>}</group>
}
