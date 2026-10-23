import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Pole } from '../world/models';

export interface NoteFlowerProps {
  index: number;
  picked: boolean;
  active: boolean;
  motion: boolean;
}

const palette = ['#f58cb7', '#ffe99a', '#b5a1ef'];

/** An unmistakable discovery, distinct from the small meadow flowers.
 * Parent places the root at ground height. The note faces the camera so it
 * stays readable while walking around; collection leaves a quiet marker.
 */
export function NoteFlower({ index, picked, active, motion }: NoteFlowerProps) {
  const bloom = useRef<THREE.Group>(null);
  const face = useRef<THREE.Group>(null);
  const note = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const marker = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Group>(null);
  const progress = useRef(picked ? 1 : 0);
  const previous = useRef(picked);
  const previousOpacity = useRef(-1);
  const color = palette[((index % palette.length) + palette.length) % palette.length];
  const flap = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-.2, .14); shape.lineTo(.2, .14); shape.lineTo(0, -.015); shape.closePath();
    return shape;
  }, []);

  useFrame(({ clock, camera }, delta) => {
    const t = motion ? clock.elapsedTime : 0;
    if (previous.current !== picked) {
      previous.current = picked;
      progress.current = picked && motion ? 0 : picked ? 1 : 0;
    }
    if (picked) progress.current = motion ? Math.min(1, progress.current + Math.min(delta, .05) / .85) : 1;
    else progress.current = 0;
    const p = progress.current;
    if (bloom.current) {
      bloom.current.visible = !picked || p < 1;
      bloom.current.position.y = picked ? p * .95 : 0;
      bloom.current.rotation.z = picked ? -.2 * p : Math.sin(t * 1.6 + index) * .045;
      bloom.current.scale.setScalar(picked ? 1 - p * .86 : 1);
      const opacity = picked ? 1 - p : 1;
      if (Math.abs(previousOpacity.current - opacity) > .001) {
        previousOpacity.current = opacity;
        bloom.current.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (material.transparent !== (opacity < 1)) { material.transparent = opacity < 1; material.needsUpdate = true; }
            material.opacity = opacity;
          }
        });
      }
    }
    if (face.current) face.current.quaternion.copy(camera.quaternion);
    if (note.current) {
      note.current.quaternion.copy(camera.quaternion);
      note.current.position.y = 1.02 + Math.sin(t * 2.1 + index) * .045;
    }
    if (halo.current) {
      halo.current.visible = !picked;
      halo.current.scale.setScalar(1 + Math.sin(t * 2.4 + index) * (active ? .09 : .04));
      (halo.current.material as THREE.MeshBasicMaterial).opacity = active ? .75 : .4;
    }
    if (marker.current) marker.current.visible = picked;
    if (particles.current) {
      particles.current.visible = picked && motion && p < 1;
      particles.current.children.forEach((child, i) => {
        const angle = i / 10 * Math.PI * 2 + index;
        child.position.set(Math.cos(angle) * p * 1.05, 1.4 + Math.sin(p * Math.PI) * .6 - p * .25, Math.sin(angle) * p * 1.05);
        child.rotation.set(p * 5 + i, p * 3, angle + p * 4);
        child.scale.setScalar((1 - p) * .075);
      });
    }
  });

  return <group name={`note-flower-${index}`}>
    <mesh ref={halo} position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.62, .75, 48]} />
      <meshBasicMaterial color={active ? '#fff4bf' : color} transparent opacity={.4} depthWrite={false} />
    </mesh>
    <mesh position={[0, .028, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={!picked}>
      <circleGeometry args={[.61, 32]} />
      <meshBasicMaterial color={color} transparent opacity={.12} depthWrite={false} />
    </mesh>
    <group ref={bloom}>
      <Pole from={[0, .03, 0]} to={[0, 1.62, 0]} radius={.045} color="#568b4d" />
      <Ball at={[-.2, .66, 0]} scale={[.27, .085, .12]} rotation={[0, 0, -.48]} color="#73aa60" />
      <Ball at={[.21, .91, .015]} scale={[.28, .085, .12]} rotation={[0, 0, .55]} color="#8fc374" />
      <group ref={face} position={[0, 1.62, 0]}>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = i / 8 * Math.PI * 2;
          return <Ball key={i} at={[Math.cos(angle) * .25, Math.sin(angle) * .25, 0]} scale={[.22, .23, .12]} rotation={[0, 0, angle]} color={color} />;
        })}
        <Ball at={[0, 0, .1]} scale={[.17, .17, .09]} color="#ffc960" />
        <Ball at={[-.045, .055, .18]} scale={[.045, .028, .008]} color="#ffe5a2" castShadow={false} />
      </group>
      <group ref={note} position={[.35, 1.02, .12]}>
        <mesh castShadow><boxGeometry args={[.45, .32, .055]} /><meshStandardMaterial color="#fff9e9" roughness={.9} /></mesh>
        <mesh position={[0, 0, .03]}><shapeGeometry args={[flap]} /><meshStandardMaterial color="#f1dabd" side={THREE.DoubleSide} /></mesh>
        <Ball at={[0, -.015, .055]} scale={[.043, .043, .013]} color="#e68291" />
        <Pole from={[-.19, -.13, .031]} to={[-.065, -.02, .031]} radius={.008} color="#e4caae" />
        <Pole from={[.19, -.13, .031]} to={[.065, -.02, .031]} radius={.008} color="#e4caae" />
      </group>
      {[-1, 1].map(s => <mesh key={s} position={[s * .52, 1.5 + s * .18, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[active ? .065 : .042]} /><meshBasicMaterial color="#fff3ba" />
      </mesh>)}
    </group>
    <group ref={particles} visible={false}>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i}>
        <sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color={i % 2 ? color : '#fff0b4'} />
      </mesh>)}
    </group>
    <group ref={marker} visible={picked} position={[0, .04, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.32, .026, 6, 28]} /><meshStandardMaterial color="#c6db9c" /></mesh>
      <Ball at={[-.09, .09, 0]} scale={[.16, .05, .09]} rotation={[0, 0, -.35]} color="#84b467" />
      <Ball at={[.1, .12, 0]} scale={[.15, .05, .08]} rotation={[0, 0, .5]} color="#a5c97b" />
      <Pole from={[-.09, .09, -.01]} to={[.07, .17, -.01]} radius={.022} color="#e7f4c3" />
    </group>
  </group>;
}
