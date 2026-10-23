import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar, type AvatarId, type AvatarPose } from './Avatars';

interface CelebrationProps { motion: boolean }

const PARTY: { id: AvatarId; x: number; z: number; phase: number }[] = [
  { id: 'blue', x: -2.45, z: -.55, phase: 0 },
  { id: 'stone', x: -1.25, z: .35, phase: 1.1 },
  { id: 'penguin', x: 0, z: -.25, phase: 2.3 },
  { id: 'capybara', x: 1.25, z: .35, phase: 3.4 },
  { id: 'child', x: 2.45, z: -.55, phase: 4.7 },
];
const COLORS = ['#ff859e', '#ffda78', '#84d5dc', '#c5a0e9', '#a8d18c', '#fff0c6'];
const random = (seed: number) => {
  const number = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return number - Math.floor(number);
};

// One shared timeline keeps all five figures, solos and confetti on the beat.
// 0-3 entrance; 3-7 shared claps; 7-22 five solos; 22-26 jump;
// 26-30 a wave to the audience, followed by a relaxed group loop.
function Dancer({ id, x, z, phase, motion, timeline, index }: typeof PARTY[number] & CelebrationProps & {
  timeline: { current: number }; index: number;
}) {
  const feet = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const [pose, setPose] = useState<AvatarPose>('wave');
  const currentPose = useRef<AvatarPose>('wave');
  useFrame(() => {
    if (!feet.current || !body.current) return;
    const t = timeline.current, beat = t * 7;
    const solo = t >= 7 && t < 22 ? Math.floor((t - 7) / 3) : -1;
    const isSolo = solo === index;
    const entrance = motion ? THREE.MathUtils.smoothstep(t, index * .2, 2.2 + index * .2) : 1;
    let hop = 0, spin = 0, flip = 0, lean = 0, forward = 0;
    let nextPose: AvatarPose = 'dance';
    if (t < 3) {
      nextPose = id === 'stone' ? 'point' : 'wave';
      hop = Math.abs(Math.sin(t * 7 + phase)) * .07;
    } else if (t < 7) {
      nextPose = 'clap'; hop = Math.max(0, Math.sin(beat)) * .075;
    } else if (solo >= 0) {
      nextPose = isSolo ? 'dance' : 'clap';
      const progress = ((t - 7) % 3) / 3;
      const envelope = Math.sin(progress * Math.PI) ** 2;
      if (isSolo) {
        forward = envelope * .65;
        hop = Math.abs(Math.sin(beat)) * .14;
        if (id === 'blue' || id === 'capybara') spin = THREE.MathUtils.smoothstep(progress, .2, .8) * Math.PI * 2;
        if (id === 'stone') { lean = Math.sin(beat) * .16; nextPose = progress < .2 ? 'point' : 'dance'; }
        if (id === 'child') { nextPose = 'cheer'; hop = Math.abs(Math.sin(beat * .5)) * .45; }
        if (id === 'penguin' && progress > .25 && progress < .75) {
          const flipProgress = (progress - .25) * 2;
          hop = Math.sin(flipProgress * Math.PI) * 1.25;
          flip = -Math.PI * 2 * THREE.MathUtils.smoothstep(flipProgress, 0, 1);
        }
      } else {
        spin = Math.atan2(PARTY[solo].x - x, 5);
        hop = Math.max(0, Math.sin(beat + phase)) * .035;
      }
    } else if (t < 26) {
      nextPose = 'cheer';
      const jump = (t - 23) / 1.1;
      if (jump > 0 && jump < 1) hop = Math.sin(jump * Math.PI) * .9;
      if (t < 23) lean = -.12 * Math.sin((t - 22) * Math.PI);
    } else if (t < 30) {
      nextPose = 'wave'; spin = Math.sin(t * 1.5 + phase) * .1;
    } else {
      nextPose = Math.floor((t - 30) / 4) % 3 === 2 ? 'clap' : 'dance';
      hop = Math.max(0, Math.sin(beat + phase)) * (id === 'penguin' ? .24 : .1);
      spin = Math.sin(t * 1.2 + phase) * .22;
    }
    if (!motion) nextPose = 'cheer';
    if (nextPose !== currentPose.current) { currentPose.current = nextPose; setPose(nextPose); }
    feet.current.position.set(x + (motion ? Math.sin(beat * .5) * .07 : 0), motion ? hop : 0, z + (1 - entrance) * 2.3 + forward);
    body.current.rotation.set(motion ? flip : 0, motion ? spin : 0, motion ? lean : 0);
    feet.current.userData.choreography = t < 3 ? 'entrance' : t < 7 ? 'claps' : solo >= 0 ? `solo-${PARTY[solo].id}` : t < 26 ? 'shared-jump' : t < 30 ? 'wave' : 'loop';
  });
  return <group ref={feet} position={[x, .04, z]} name={`dancer-${id}`}>
    <group ref={body} position={[0, .8, 0]}>
      <group position={[0, -.8, 0]}><Avatar id={id} scale={1.1} pose={pose} motion={motion} /></group>
    </group>
  </group>;
}

function PartyConfetti({ motion, timeline }: CelebrationProps & { timeline: { current: number } }) {
  const mesh = useRef<THREE.InstancedMesh>(null), elapsed = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pieces = useMemo(() => Array.from({ length: 240 }, (_, i) => ({
    side: i % 2 ? 1 : -1,
    delay: random(i + 10) * .5,
    speed: 4.5 + random(i + 30) * 1.8,
    spread: .6 + random(i + 50) * 1.5,
    depth: (random(i + 70) - .5) * 2.6,
    rotation: random(i + 90) * Math.PI * 2,
    size: .095 + random(i + 110) * .065,
    color: COLORS[i % COLORS.length],
  })), []);
  const draw = (time: number, animate: boolean) => {
    const instance = mesh.current;
    if (!instance) return;
    pieces.forEach((piece, i) => {
      // Continuous confetti starts immediately; extra bursts mark the jump and wave.
      const burst = time < 23.2 ? Math.floor(time / 3.2) * 3.2 : time < 26.5 ? 23.2 : time < 30 ? 26.5 : 30 + Math.floor((time - 30) / 7) * 7;
      const age = i < 160 ? (time + 1 + piece.delay) % 2.6 : time - burst - piece.delay;
      if (animate) {
        const y = .6 + piece.speed * age - 2.7 * age * age;
        const alive = age >= 0 && age < 2.7 && y > .05;
        dummy.position.set(piece.side * (3.2 - piece.spread * age), Math.max(.03, y), piece.depth * age - .5);
        dummy.scale.set(alive ? piece.size : 0, alive ? piece.size * 1.6 : 0, 1);
        dummy.rotation.set(age * 5 + piece.rotation, age * 3.7 + piece.rotation, age * 2.5);
      } else {
        dummy.position.set((random(i + 150) - .5) * 7.5, 1.7 + random(i + 170) * 2.5, (random(i + 190) - .5) * 3);
        dummy.scale.set(piece.size, piece.size * 1.6, 1);
        dummy.rotation.set(piece.rotation, piece.rotation * .3, piece.rotation);
      }
      dummy.updateMatrix(); instance.setMatrixAt(i, dummy.matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    pieces.forEach((piece, i) => mesh.current?.setColorAt(i, new THREE.Color(piece.color)));
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    draw(elapsed.current, motion);
  }, [pieces, motion]);
  useFrame(() => {
    if (!motion) return;
    elapsed.current = timeline.current;
    draw(elapsed.current, true);
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, pieces.length]} frustumCulled={false}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial side={THREE.DoubleSide} />
  </instancedMesh>;
}

/** Five friends celebrate together; the parent places the party at the rainbow. */
export function Celebration({ motion }: CelebrationProps) {
  const timeline = useRef(0);
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (motion) timeline.current += Math.min(delta, .05);
    if (group.current) group.current.userData.elapsed = timeline.current;
  });
  return <group ref={group} name="birthday-celebration" scale={1.3} userData={{ actor: true }}>
    {PARTY.map((dancer, index) => <Dancer key={dancer.id} {...dancer} index={index} timeline={timeline} motion={motion} />)}
    <PartyConfetti motion={motion} timeline={timeline} />
  </group>;
}

