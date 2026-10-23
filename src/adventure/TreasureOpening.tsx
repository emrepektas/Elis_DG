import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar, type AvatarId } from './Avatars';
import { Box } from '../world/models';

interface TreasureOpeningProps { avatar: AvatarId; motion: boolean; time: number }
const ease = (time: number, start: number, end: number) => THREE.MathUtils.smoothstep(time, start, end);

function GoldenKey() {
  return <group>
    <mesh position={[0, .18, 0]}><torusGeometry args={[.14, .045, 8, 24]} /><meshStandardMaterial color="#ffe295" metalness={.65} roughness={.22} /></mesh>
    <Box at={[0, -.1, 0]} scale={[.065, .38, .08]} color="#eec05b" />
    <Box at={[.07, -.22, 0]} scale={[.19, .065, .08]} color="#ffe295" />
    <Box at={[.07, -.1, 0]} scale={[.19, .065, .08]} color="#ffe295" />
  </group>;
}

/** Externally timed: three keys 0–7s, lid 7–9s, keepsakes and light 9–12s. */
export function TreasureOpening({ avatar, motion, time }: TreasureOpeningProps) {
  const root = useRef<THREE.Group>(null), lid = useRef<THREE.Group>(null);
  const actor = useRef<THREE.Group>(null), keepsakes = useRef<THREE.Group>(null);
  const hand = useRef<THREE.Group>(null), actorFacing = useRef<THREE.Group>(null);
  const handTarget = useMemo(() => new THREE.Vector3(), []);
  const handPosition = useMemo(() => new THREE.Vector3(), []);
  const handQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const rootQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const lockQuaternion = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI*.5), []);
  const keys = useRef<(THREE.Group | null)[]>([]), light = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.Mesh>(null), sparks = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => Array.from({ length: 96 }, (_, index) => ({
    angle: index * 2.39996,
    elevation: .3 + (index % 11) / 13,
    speed: .65 + (index % 7) / 8,
    size: .035 + (index % 4) * .012,
  })), []);
  // Set the hand goal before Avatar solves its reaching arm, then sample the
  // resulting hand transform below. Keys never fly independently of the hand.
  useFrame(() => {
    const t = motion ? THREE.MathUtils.clamp(time, 0, 12) : 12;
    const index = Math.min(2, Math.floor(t / 2.3));
    const start = index * 2.3, travel = ease(t, start + .25, start + 1.25);
    const targetX = (index - 1) * .57;
    const previousX = index === 0 ? 2 : (index - 2) * .57 + .35;
    if (actor.current) {
      actor.current.position.set(THREE.MathUtils.lerp(previousX, targetX + .35, travel),
        t > 9 && motion ? Math.max(0, Math.sin((t - 9) * 5)) * .07 : 0,
        THREE.MathUtils.lerp(index === 0 ? 1.45 : 1.35, 1.35, travel));
      actor.current.rotation.z = t < 7 ? Math.sin(travel * Math.PI) * .045 : 0;
    }
    if (actorFacing.current) actorFacing.current.rotation.y = THREE.MathUtils.lerp(index === 0 ? -2.2 : -Math.PI, -Math.PI, travel);
    const previousKeyX = index === 0 ? 1.7 : (index - 2) * .57;
    handTarget.set(THREE.MathUtils.lerp(previousKeyX, targetX, travel),
      THREE.MathUtils.lerp(index === 0 ? 1.2 : .91, .91, travel) + Math.sin(travel * Math.PI) * .23,
      THREE.MathUtils.lerp(index === 0 ? 1.4 : 1, 1, travel));
    root.current?.updateWorldMatrix(true, false);
    root.current?.localToWorld(handTarget);
  }, -2);
  useFrame(() => {
    const t = motion ? THREE.MathUtils.clamp(time, 0, 12) : 12;
    const open = ease(t, 7, 9), rise = ease(t, 9, 11.5);
    if (root.current) {
      root.current.userData.elapsed = t;
      root.current.userData.beat = t < 7 ? 'unlocking' : t < 9 ? 'opening' : 'reveal';
      root.current.userData.unlocked = [2, 4.3, 6.6].filter(at => t >= at).length;
    }
    if (lid.current) lid.current.rotation.x = -1.65 * open;
    if (root.current && hand.current) {
      hand.current.getWorldPosition(handPosition);
      root.current.worldToLocal(handPosition);
      hand.current.getWorldQuaternion(handQuaternion);
      root.current.getWorldQuaternion(rootQuaternion).invert();
      handQuaternion.premultiply(rootQuaternion);
    }
    keys.current.forEach((key, index) => {
      if (!key) return;
      const start = index * 2.3, travel = ease(t, start + .25, start + 1.25);
      const turn = ease(t, start + 1.4, start + 2);
      const targetX = (index - 1) * .57;
      key.visible = t >= start;
      if (travel < 1 && hand.current) {
        key.position.copy(handPosition);
        key.quaternion.copy(handQuaternion);
        key.rotateZ(Math.PI * .5);
        key.quaternion.slerp(lockQuaternion, ease(travel,.6,1));
      } else {
        key.position.set(targetX, .91, 1);
        key.rotation.set(0, 0, Math.PI * .5 + turn * Math.PI * .5);
      }
      key.userData.attachedToHand = travel < 1;
      key.userData.inserted = travel === 1;
      key.userData.turned = turn === 1;
    });
    if (keepsakes.current) {
      keepsakes.current.visible = t >= 8.7;
      keepsakes.current.position.y = .95 + rise * 1.75;
      keepsakes.current.scale.setScalar(.15 + rise * .85);
      keepsakes.current.rotation.y = motion ? Math.sin((t - 9) * .9) * .08 : 0;
    }
    if (light.current) light.current.intensity = open * (6 + Math.sin(t * 5) * .5);
    if (glow.current) {
      glow.current.visible = open > 0;
      glow.current.scale.setScalar(.3 + open * 1.1);
      (glow.current.material as THREE.MeshBasicMaterial).opacity = open * .25;
    }
    const age = t - 8.1;
    particles.forEach((particle, index) => {
      const flight = Math.max(0, age - (index % 6) * .07);
      const radius = flight * particle.speed;
      dummy.position.set(Math.cos(particle.angle) * radius, 1.3 + flight * particle.elevation * 1.8 - flight * flight * .2, Math.sin(particle.angle) * radius);
      dummy.rotation.set(flight * 2, particle.angle, flight * 3);
      const size = age > 0 ? particle.size * Math.max(.25, 1 - flight * .14) : 0;
      dummy.scale.setScalar(size);
      dummy.updateMatrix(); sparks.current?.setMatrixAt(index, dummy.matrix);
    });
    if (sparks.current) sparks.current.instanceMatrix.needsUpdate = true;
  });
  const displayedTime = motion ? time : 12;
  return <group ref={root} name="treasure-opening" userData={{ actor: true }}>
    <group name="treasure-chest-base">
      <Box at={[0, .65, 0]} scale={[2.5, 1.3, 1.6]} color="#b77e4c" />
      <Box at={[0, 1.31, 0]} scale={[2.23, .045, 1.36]} color="#4c302a" />
      {[-1, 1].map(x => <Box key={x} at={[x, .65, 0]} scale={[.12, 1.35, 1.68]} color="#e5bf68" />)}
      <group ref={lid} name="treasure-chest-lid" position={[0, 1.3, -.8]}>
        <Box at={[0, .11, .8]} scale={[2.58, .3, 1.7]} color="#d39b5e" />
        {[-1, 1].map(x => <Box key={x} at={[x, .14, .8]} scale={[.13, .35, 1.75]} color="#f1cf77" />)}
      </group>
      {[0, 1, 2].map(index => <group key={index} name={`treasure-lock-${index}`} position={[(index - 1) * .57, .91, .86]}>
        <Box at={[0, 0, 0]} scale={[.34, .35, .13]} color="#f1c866" />
        <mesh position={[0, .04, .075]}><circleGeometry args={[.045, 12]} /><meshBasicMaterial color="#674d37" /></mesh>
      </group>)}
    </group>
    {[0, 1, 2].map(index => <group key={index} name={`treasure-key-${index}`} ref={element => { keys.current[index] = element; }}><GoldenKey /></group>)}
    <group ref={actor} name="treasure-opener" position={[2, 0, 1.45]}>
      <group ref={actorFacing} rotation={[0, -2.2, 0]}><Avatar id={avatar} pose={displayedTime < 7 ? 'reach' : displayedTime < 9 ? 'point' : 'cheer'} motion={motion} scale={1.15} rightHandAnchor={hand} rightHandTarget={displayedTime < 7 ? handTarget : undefined} /></group>
    </group>
    <group ref={keepsakes} name="treasure-keepsakes" position={[0, 1, 0]}>
      <group name="treasure-envelope" position={[-.3, .08, .48]} rotation={[0, 0, .12]}>
        <Box at={[0, 0, 0]} scale={[.95, .65, .06]} color="#fff3db" />
        <mesh position={[0, .11, .04]} rotation={[0, 0, Math.PI]}><circleGeometry args={[.37, 3]} /><meshStandardMaterial color="#f0d6ae" /></mesh>
        <mesh position={[0, -.06, .065]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.08, .08, .025, 20]} /><meshStandardMaterial color="#db8290" /></mesh>
      </group>
      <group name="treasure-gift" position={[.42, -.12, -.28]} rotation={[0, -.15, -.1]} userData={{ sealed: true }}>
        <Box at={[0, 0, 0]} scale={[.68, .64, .64]} color="#a7d4db" />
        <Box at={[0, .35, 0]} scale={[.74, .12, .7]} color="#b8e2e4" />
        <Box at={[0, .02, .326]} scale={[.1, .68, .025]} color="#ffe29a" />
        <Box at={[0, .42, 0]} scale={[.1, .035, .7]} color="#ffe29a" />
        {[-1, 1].map(side => <mesh key={side} position={[side * .13, .48, 0]} rotation={[Math.PI / 2, 0, side * .35]}><torusGeometry args={[.13, .035, 8, 20]} /><meshStandardMaterial color="#ffe29a" /></mesh>)}
        <group name="mystery-parcel-mark" position={[.16, .03, .35]}>
          <mesh position={[0,.055,0]} rotation={[0,0,-.15]}><torusGeometry args={[.085,.023,8,20,Math.PI*1.5]}/><meshStandardMaterial color="#fff7db"/></mesh>
          <Box at={[-.015,-.04,0]} scale={[.045,.09,.025]} color="#fff7db"/>
          <mesh position={[-.015,-.13,0]}><sphereGeometry args={[.026,10,8]}/><meshStandardMaterial color="#fff7db"/></mesh>
        </group>
      </group>
    </group>
    <pointLight ref={light} position={[0, 1.65, .1]} color="#ffe6a5" intensity={0} distance={9} />
    <mesh ref={glow} position={[0, 1.5, 0]}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#ffe6a5" transparent opacity={0} depthWrite={false} /></mesh>
    <instancedMesh ref={sparks} name="treasure-light-burst" args={[undefined, undefined, particles.length]} frustumCulled={false}>
      <octahedronGeometry args={[1]} /><meshBasicMaterial color="#ffe39b" />
    </instancedMesh>
  </group>;
}
