import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Pole } from '../world/models';

const PINK = '#ee89b2';

/** Shared decoration: the same ribbon appears at departure and on the flies. */
export function PinkRibbon({ scale = 1 }: { scale?: number }) {
  return <group scale={scale} name="pink-ribbon">
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .18, .035, 0]} rotation={[0, 0, side * -.3]} scale={[1.25, .75, .55]}>
        <torusGeometry args={[.15, .055, 8, 16]} /><meshStandardMaterial color={PINK} roughness={.65} />
      </mesh>
      <mesh position={[side * .09, -.18, 0]} rotation={[0, 0, side * -.25]}>
        <planeGeometry args={[.1, .32]} /><meshStandardMaterial color={PINK} side={THREE.DoubleSide} />
      </mesh>
    </group>)}
    <Ball at={[0, 0, .025]} scale={[.085, .075, .07]} color="#f5a2c4" />
  </group>;
}

/** Place at the notebook's local position during the four-second drying shot. */
export function NotebookDrying({ time, motion }: { time: number; motion: boolean }) {
  const sleepyDrop=useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.InstancedMesh>(null), root = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    delay: (i % 7) * .14,
    x: Math.sin(i * 2.39996) * .42,
    z: Math.cos(i * 2.39996) * .29,
    size: .025 + (i % 3) * .008,
  })), []);
  useFrame(() => {
    if (root.current) root.current.userData.dry = time >= 3.5;
    if(sleepyDrop.current){const q=THREE.MathUtils.smoothstep(time,1.6,2.8);sleepyDrop.current.visible=motion&&time>1.6&&time<2.9;sleepyDrop.current.position.set(.1+.8*q,.3-.4*q+Math.sin(q*Math.PI)*.25,.4*q);}

    particles.forEach((particle, i) => {
      const age = (time + Math.floor(i / 7) * .2 - particle.delay) % .8;
      const visible = motion && time < 3.5 && age >= 0;
      dummy.position.set(particle.x, -.1 - age * age * 1.15, particle.z);
      dummy.scale.set(visible ? particle.size : 0, visible ? particle.size * 1.8 : 0, visible ? particle.size : 0);
      dummy.updateMatrix(); drops.current?.setMatrixAt(i, dummy.matrix);
    });
    if (drops.current) drops.current.instanceMatrix.needsUpdate = true;
  });
  return <group ref={root} name="notebook-drying"><mesh ref={sleepyDrop} name="penguin-wakeup-drop"><sphereGeometry args={[.045,8,6]}/><meshBasicMaterial color="#91e2ee"/></mesh>
    <instancedMesh ref={drops} args={[undefined, undefined, particles.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color="#91e2ee" transparent opacity={.85} />
    </instancedMesh>
  </group>;
}

/** Attach behind a crew member; the balloon and trailing bow betray the secret. */
export function HiddenDecoration({ motion }: { motion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = motion ? clock.elapsedTime : 0;
    root.current.rotation.z = Math.sin(t * 1.4) * .08;
    root.current.position.y = Math.sin(t * 1.7) * .035;
  });
  return <group ref={root} name="poorly-hidden-party-decoration" position={[0, 0, -.3]}>
    <Pole from={[.2, .55, 0]} to={[.35, 1.9, 0]} radius={.009} color="#fff1cc" />
    <Ball at={[.35, 2.18, 0]} scale={[.29, .37, .27]} color={PINK} roughness={.35} />
    <Ball at={[.25, 2.3, .22]} scale={[.055, .1, .02]} color="#ffd9e9" />
    <group position={[.35, 1.82, .03]}><PinkRibbon scale={.7} /></group>
  </group>;
}
