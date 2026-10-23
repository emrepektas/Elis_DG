import type { Ref } from 'react';
import type * as THREE from 'three';
import { Box } from '../world/models';

/** One model for exploration, unlocking and the opened gift. */
export function ChestBody({lidRef}:{lidRef:Ref<THREE.Group>}) {
 return <group name="treasure-chest-base">
  <Box at={[0,.65,0]} scale={[2.5,1.3,1.6]} color="#b77e4c"/>
  <Box at={[0,1.31,0]} scale={[2.23,.045,1.36]} color="#4c302a"/>
  {[-1,1].map(x=><Box key={x} at={[x,.65,0]} scale={[.12,1.35,1.68]} color="#e5bf68"/>)}
  <group ref={lidRef} name="treasure-chest-lid" position={[0,1.3,-.8]}>
   <Box at={[0,.11,.8]} scale={[2.58,.3,1.7]} color="#d39b5e"/>
   {[-1,1].map(x=><Box key={x} at={[x,.14,.8]} scale={[.13,.35,1.75]} color="#f1cf77"/>) }
  </group>
  {[0,1,2].map(i=><group key={i} name={`treasure-lock-${i}`} position={[(i-1)*.57,.91,.86]}>
   <Box at={[0,0,0]} scale={[.34,.35,.13]} color="#f1c866"/>
   <mesh position={[0,.04,.075]}><circleGeometry args={[.045,12]}/><meshBasicMaterial color="#674d37"/></mesh>
  </group>)}
 </group>;
}
