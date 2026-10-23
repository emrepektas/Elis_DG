import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar, type AvatarId } from './Avatars';

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

function Dancer({ id, x, z, phase, motion }: typeof PARTY[number] & CelebrationProps) {
  const feet = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!feet.current || !body.current) return;
    if (motion) elapsed.current += Math.min(delta, .05);
    const t = elapsed.current, beat = t * 3.8 + phase;
    let hop = motion ? Math.max(0, Math.sin(beat)) ** 2 * (id === 'penguin' ? .3 : .16) : .04;
    let spin = motion ? Math.sin(t * 1.9 + phase) * .26 : (phase % 2 ? -.08 : .08);
    let flip = 0;
    // One little penguin trick, with a complete airborne arc and soft landing.
    const trick = (t + 8) % 13;
    if (motion && id === 'penguin' && trick < 1.05) {
      const progress = trick / 1.05;
      hop = Math.sin(progress * Math.PI) * 1.35;
      flip = -Math.PI * 2 * (progress * progress * (3 - 2 * progress));
    }
    // The blue mascot occasionally turns all the way around, then faces the party again.
    const twirl = (t + 5) % 11;
    if (motion && id === 'blue' && twirl < 1.3) {
      const progress = twirl / 1.3;
      spin += Math.PI * 2 * (progress * progress * (3 - 2 * progress));
    }
    feet.current.position.set(x, hop, z);
    body.current.rotation.set(flip, spin, motion ? Math.sin(beat) * .09 : Math.sin(phase) * .08);
  });
  return <group ref={feet} position={[x, .04, z]}>
    <group ref={body} position={[0, .8, 0]} rotation={[0, 0, Math.sin(phase) * .08]}>
      <group position={[0, -.8, 0]}><Avatar id={id} scale={1.1} walking={motion} motion={motion} /></group>
    </group>
  </group>;
}

function PartyConfetti({ motion }: CelebrationProps) {
  const mesh = useRef<THREE.InstancedMesh>(null), elapsed = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pieces = useMemo(() => Array.from({ length: 120 }, (_, i) => ({
    side: i % 2 ? 1 : -1,
    delay: random(i + 10) * .5,
    speed: 4.5 + random(i + 30) * 1.8,
    spread: .6 + random(i + 50) * 1.5,
    depth: (random(i + 70) - .5) * 2.6,
    rotation: random(i + 90) * Math.PI * 2,
    size: .065 + random(i + 110) * .055,
    color: COLORS[i % COLORS.length],
  })), []);
  const draw = (time: number, animate: boolean) => {
    const instance = mesh.current;
    if (!instance) return;
    pieces.forEach((piece, i) => {
      const age = (time + 4.8 - piece.delay) % 4.8;
      if (animate) {
        const y = .6 + piece.speed * age - 2.7 * age * age;
        const alive = age < 2.7 && y > .05;
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
  useFrame((_, delta) => {
    if (!motion) return;
    elapsed.current += Math.min(delta, .05);
    draw(elapsed.current, true);
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, pieces.length]} frustumCulled={false}>
    <planeGeometry args={[1, 1]} />
    <meshStandardMaterial side={THREE.DoubleSide} roughness={.7} emissive="#fff0c6" emissiveIntensity={.13} />
  </instancedMesh>;
}

/** Five friends celebrate together; the parent places the party at the rainbow. */
export function Celebration({ motion }: CelebrationProps) {
  return <group name="birthday-celebration" userData={{ actor: true }}>
    {PARTY.map(dancer => <Dancer key={dancer.id} {...dancer} motion={motion} />)}
    <PartyConfetti motion={motion} />
  </group>;
}
