import { useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball } from '../world/models';
import { PinkRibbon } from './StoryCallbacks';

/** A single, brief lens visit after the crew's final bow. */
export function FinalFly({timeline,motion}:{timeline:{current:number};motion:boolean}) {
 const {scene,camera}=useThree();
 const fly=useRef<THREE.Group>(null),wings=useRef<THREE.Group>(null);
 const local=useMemo(()=>new THREE.Vector3(),[]);
 useFrame(()=>{
  if(!fly.current)return;
  const t=timeline.current;
  fly.current.visible=motion&&t>=31&&t<35;
  fly.current.userData.beat=t<31||t>=35?'hidden':t<32?'approaching':t<33.5?'landed':'leaving';
  if(!fly.current.visible)return;
  const approach=THREE.MathUtils.smoothstep(t,31,32),leave=THREE.MathUtils.smoothstep(t,33.5,35);
  local.set(THREE.MathUtils.lerp(-.65,0,approach)+leave*.8,
    THREE.MathUtils.lerp(.3,.025,approach)+leave*.6,
    THREE.MathUtils.lerp(-1,-.25,approach)-leave*.6);
  camera.updateMatrixWorld();
  fly.current.position.copy(local).applyMatrix4(camera.matrixWorld);
  fly.current.quaternion.copy(camera.quaternion);
  fly.current.scale.setScalar(.1);
  wings.current?.children.forEach((wing,i)=>{wing.rotation.z=(i?1:-1)*(.2+Math.sin(t*(leave>0||approach<1?65:12))*.15)});
 });
 return createPortal(<group ref={fly} name="final-camera-fly" visible={false}>
  <Ball at={[0,0,0]} scale={[.25,.22,.36]} color="#66503d"/>
  <group ref={wings}>{[-1,1].map(side=><group key={side} position={[side*.2,.1,0]}><Ball at={[side*.2,0,0]} scale={[.36,.045,.22]} color="#d8f4f1"/></group>)}</group>
  {[-1,1].map(side=><Ball key={side} at={[side*.11,.07,.32]} scale={[.08,.09,.045]} color="#fff2d5"/>)}
  <group position={[0,-.16,.32]}><PinkRibbon scale={.6}/></group>
 </group>,scene);
}
