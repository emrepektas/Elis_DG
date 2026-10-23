import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Pole } from '../world/models';

export const AVATAR_IDS = ['blue', 'stone', 'penguin', 'capybara', 'child'] as const;
export type AvatarId = typeof AVATAR_IDS[number];

export interface AvatarProps {
  id: AvatarId;
  walking?: boolean;
  bouquet?: number;
  sleeping?: boolean;
  motion?: boolean;
  scale?: number;
}

type XYZ = [number, number, number];
const navy = '#233c59';
const skin = '#dba477';

/** Eyes face +Z. Closing the whole eye group also hides the pupils. */
function Eyes({ width = .12, y = 1.13, z = .265, motion, sleeping, stone = false }: {
  width?: number; y?: number; z?: number; motion: boolean; sleeping: boolean; stone?: boolean;
}) {
  const blink = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!blink.current) return;
    const phase = clock.elapsedTime % 5.7;
    blink.current.scale.y = sleeping ? .08 : motion && phase > 5.48 ? Math.max(.07, Math.abs(phase - 5.59) / .11) : 1;
  });
  return <group position={[0, y, z]}><group ref={blink}>
    {[-1, 1].map(s => <group key={s} position={[s * width, 0, 0]}>
      <Ball at={[0, 0, 0]} scale={[.071, .082, .032]} color={stone ? '#a89479' : '#fffdf1'} />
      <Ball at={[0, .002, .029]} scale={[.026, .039, .017]} color={navy} />
      <Ball at={[-.008, .018, .044]} scale={[.008, .01, .005]} color="#ffffff" castShadow={false} />
    </group>)}
  </group></group>;
}

function Smile({ at = [0, 1.01, .281], size = .065, color = '#50768c' }: { at?: XYZ; size?: number; color?: string }) {
  return <mesh position={at} rotation={[0, 0, Math.PI]}>
    <torusGeometry args={[size, .011, 6, 16, Math.PI]} />
    <meshStandardMaterial color={color} roughness={.8} />
  </mesh>;
}

function Bouquet({ count }: { count: number }) {
  return <group position={[0, -.24, .15]} rotation={[-.25, 0, -.16]}>
    {Array.from({ length: Math.min(5, Math.max(0, Math.floor(count))) }, (_, i) => {
      const angle = (i - (Math.min(5, count) - 1) / 2) * .35;
      const x = Math.sin(angle) * .25;
      const y = .36 + Math.cos(angle) * .06;
      const color = ['#f391b3', '#fff0b4', '#b99ce8', '#f7b979', '#91d2e7'][i];
      return <group key={i}>
        <Pole from={[0, -.1, 0]} to={[x, y, 0]} radius={.013} color="#629257" />
        <Ball at={[x * .5 - .045, y * .5, 0]} scale={[.085, .025, .035]} rotation={[0, 0, -.4]} color="#76ad67" />
        {Array.from({ length: 5 }, (_, p) => {
          const a = p / 5 * Math.PI * 2;
          return <Ball key={p} at={[x + Math.cos(a) * .064, y + Math.sin(a) * .064, .018]} scale={[.057, .057, .025]} color={color} />;
        })}
        <Ball at={[x, y, .045]} scale={[.036, .036, .022]} color="#e8b24b" />
      </group>;
    })}
    <mesh position={[0, .025, .005]} rotation={[0, 0, -.14]}><torusGeometry args={[.032, .012, 5, 12]} /><meshStandardMaterial color="#e9b285" /></mesh>
  </group>;
}

function Badge() {
  return <group position={[0, .76, .239]}>
    <Ball at={[0, 0, 0]} scale={[.153, .094, .017]} color="#f9d667" />
    <Ball at={[0, -.003, .021]} scale={[.047, .041, .01]} color={navy} />
    {[-1, 1].map(s => <group key={s}>
      <Ball at={[s * .065, .008, .022]} scale={[.06, .024, .009]} rotation={[0, 0, s * .3]} color={navy} />
      <mesh position={[s * .022, .038, .02]}><coneGeometry args={[.018, .045, 3]} /><meshStandardMaterial color={navy} /></mesh>
    </group>)}
  </group>;
}

/** Procedural toy figures, approximately 1.4 units tall, feet at y=0, facing +Z. */
export function Avatar({ id, walking = false, bouquet = 0, sleeping = false, motion = true, scale = 1 }: AvatarProps) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const cape = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useFrame(({ clock }, delta) => {
    phase.current += Math.min(delta, .05) * (walking && !sleeping ? 8 : 1.6);
    const step = motion && walking && !sleeping ? Math.sin(phase.current) : 0;
    const idle = motion && !walking && !sleeping ? Math.sin(clock.elapsedTime * 1.8) : 0;
    if (root.current) {
      root.current.position.y = motion ? Math.abs(step) * .025 + idle * .008 : 0;
      root.current.rotation.z = step * (id === 'penguin' ? .065 : .025);
    }
    if (head.current) {
      head.current.rotation.x = sleeping ? .16 : idle * .017;
      head.current.rotation.y = idle * .025;
    }
    if (leftLeg.current) leftLeg.current.rotation.x = step * .43;
    if (rightLeg.current) rightLeg.current.rotation.x = -step * .43;
    if (leftArm.current) {
      leftArm.current.rotation.x = bouquet > 0 ? -.65 : sleeping ? -.28 : -step * .35;
      leftArm.current.rotation.z = bouquet > 0 ? -.12 : -.06 + idle * .015;
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = sleeping ? -.28 : step * .35;
      rightArm.current.rotation.z = .06 - idle * .015;
    }
    if (cape.current) cape.current.rotation.x = motion ? .12 + Math.abs(step) * .16 + Math.sin(clock.elapsedTime * 2.1) * .025 : .12;
  });

  const isPenguin = id === 'penguin';
  const isStone = id === 'stone';
  const isCapybara = id === 'capybara';
  const isChild = id === 'child';
  const bodyColor = id === 'blue' ? '#80cce7' : isStone ? '#d5c7a9' : isPenguin ? '#536474' : isCapybara ? '#4a83bc' : '#339fc5';
  const limbColor = isCapybara ? '#a98b62' : isChild ? skin : bodyColor;
  const armX = isStone ? .38 : isPenguin ? .29 : .3;

  return <group scale={scale} name={`avatar-${id}`}><group ref={root}>
    <Ball at={[0, isPenguin ? .64 : .67, 0]} scale={isPenguin ? [.32, .47, .28] : isStone ? [.4, .41, .28] : [.29, .35, .23]} color={bodyColor} />
    {isPenguin && <Ball at={[0, .62, .19]} scale={[.25, .35, .115]} color="#fff2d9" />}
    {id === 'blue' && <>
      <Ball at={[-.13, .68, .208]} scale={[.1, .13, .022]} color="#b5e0eb" />
      <Ball at={[.11, .39, .117]} scale={[.095, .075, .07]} color="#a0d8e7" />
    </>}
    {isCapybara && <>
      <Badge />
      <group ref={cape} position={[0, .91, -.18]}>
        <mesh position={[0, -.29, -.09]} rotation={[-.08, 0, 0]} castShadow><cylinderGeometry args={[.18, .36, .66, 12, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#26364e" side={THREE.DoubleSide} roughness={.95} /></mesh>
      </group>
      <Ball at={[0, .43, .002]} scale={[.29, .05, .23]} color="#f1cd66" />
      <Ball at={[0, .43, .23]} scale={[.045, .045, .02]} color="#f8df8e" />
    </>}
    {isChild && <>
      <Ball at={[0, .44, .005]} scale={[.265, .13, .21]} color="#f7f1dd" />
      <Ball at={[0, .9, .03]} scale={[.122, .042, .13]} color="#2584ad" />
      <Ball at={[0, .93, 0]} scale={[.095, .11, .095]} color={skin} />
    </>}

    {[-1, 1].map((s, index) => <group ref={index === 0 ? leftLeg : rightLeg} key={s} position={[s * (isStone ? .22 : .15), .37, .01]}>
      <Ball at={[0, -.12, 0]} scale={isPenguin ? [.105, .12, .115] : [.115, .21, .13]} color={isChild ? skin : isCapybara ? '#9e805e' : limbColor} />
      <Ball at={[0, -.29, .075]} scale={isPenguin ? [.14, .065, .21] : [.14, .085, .19]} color={isPenguin ? '#edbb77' : isChild ? '#f4eee0' : isStone ? '#b9ab91' : limbColor} />
      {isChild && <Ball at={[0, -.297, .16]} scale={[.14, .038, .09]} color="#4f93ba" />}
    </group>)}

    {[-1, 1].map((s, index) => <group ref={index === 0 ? leftArm : rightArm} key={s} position={[s * armX, .85, 0]}>
      <Ball at={[s * .035, -.17, .005]} scale={isPenguin ? [.085, .29, .12] : isStone ? [.15, .24, .15] : [.105, .245, .115]} color={isChild ? bodyColor : limbColor} rotation={[0, 0, s * .12]} />
      {!isPenguin && <Ball at={[s * .055, -.36, .015]} scale={isStone ? [.13, .11, .15] : [.09, .1, .1]} color={limbColor} />}
      {index === 0 && bouquet > 0 && <Bouquet count={bouquet} />}
    </group>)}

    <group ref={head} position={[0, .94, 0]}><group position={[0, -.94, 0]}>
      {id === 'blue' && <>
        <Ball at={[0, 1.12, .01]} scale={[.34, .31, .28]} color="#84cfe8" />
        <Eyes motion={motion} sleeping={sleeping} />
        <Ball at={[0, 1.06, .29]} scale={[.055, .046, .038]} color="#6db2ce" />
        <Smile />
        {[-1, 0, 1].map(s => <Ball key={s} at={[s * .07, 1.43, -.01]} scale={[.047, s === 0 ? .13 : .1, .043]} color="#e75e65" rotation={[0, 0, -.2 * s]} />)}
      </>}
      {isStone && <>
        <Ball at={[0, 1.08, .02]} scale={[.43, .29, .29]} color="#e2d6bd" />
        {[-1, 1].map(s => <group key={s}>
          <Ball at={[s * .46, 1.1, 0]} scale={[.19, .115, .13]} color="#ccba9b" />
          <Ball at={[s * .61, 1.1, 0]} scale={[.07, .067, .085]} color="#e5d9bf" />
        </group>)}
        <Ball at={[0, 1.35, -.035]} scale={[.14, .12, .13]} color="#bda98a" />
        <Ball at={[0, 1.43, -.035]} scale={[.09, .055, .085]} color="#d2c2a4" />
        <Eyes width={.14} y={1.12} z={.291} motion={motion} sleeping={sleeping} stone />
        <Ball at={[0, 1.06, .3]} scale={[.055, .035, .022]} color="#c2ae90" />
        <Smile at={[0, .997, .297]} size={.085} color="#918069" />
      </>}
      {isPenguin && <>
        <Ball at={[0, 1.07, .015]} scale={[.29, .28, .265]} color="#4a5c70" />
        {[-1, 1].map(s => <group key={s}>
          <Ball at={[s * .105, 1.07, .247]} scale={[.09, .088, .03]} color="#f8ecd8" />
          <Smile at={[s * .105, 1.087, .28]} size={.044} color={navy} />
          <Ball at={[s * .18, 1.005, .238]} scale={[.038, .017, .008]} color="#c8a99a" />
        </group>)}
        <mesh position={[0, .997, .304]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[.065, .135, 5]} /><meshStandardMaterial color="#efbc77" /></mesh>
      </>}
      {isCapybara && <>
        <Ball at={[0, 1.12, .025]} scale={[.31, .27, .29]} color="#ac9068" />
        <Ball at={[0, 1.035, .225]} scale={[.28, .17, .245]} color="#b49a75" />
        {[-1, 1].map(s => <group key={s}>
          <Ball at={[s * .24, 1.34, -.035]} scale={[.09, .105, .065]} color="#a88a65" />
          <Ball at={[s * .24, 1.345, .019]} scale={[.05, .062, .015]} color="#c6a580" />
          <Ball at={[s * .13, 1.155, .27]} scale={[.115, .07, .026]} color="#213447" roughness={.25} rotation={[0, 0, s * -.08]} />
          <Ball at={[s * .15, 1.18, .294]} scale={[.047, .012, .005]} color="#769aa5" roughness={.2} rotation={[0, 0, .25]} />
          <Ball at={[s * .091, 1.075, .446]} scale={[.022, .015, .013]} color="#594f40" />
        </group>)}
        <Pole from={[-.045, 1.16, .29]} to={[.045, 1.16, .29]} radius={.014} color={navy} />
        <Smile at={[0, .976, .455]} size={.048} color="#796247" />
      </>}
      {isChild && <>
        <Ball at={[0, 1.15, .01]} scale={[.27, .28, .245]} color={skin} />
        {[-1, 1].map(s => <Ball key={s} at={[s * .265, 1.13, 0]} scale={[.055, .08, .05]} color={skin} />)}
        <Ball at={[0, 1.35, -.025]} scale={[.274, .15, .24]} color="#4c3c34" />
        <Eyes width={.1} y={1.16} z={.235} motion={motion} sleeping={sleeping} />
        <Ball at={[0, 1.1, .255]} scale={[.04, .044, .045]} color="#d39a6c" />
        <Smile at={[0, 1.02, .231]} size={.06} color="#9b6c51" />
        {[-1, 1].map(s => <Ball key={s} at={[s * .158, 1.07, .211]} scale={[.047, .024, .01]} color="#e3a48d" />)}
        <Ball at={[0, 1.405, -.015]} scale={[.29, .13, .25]} color="#f8f2e5" rotation={[0, 0, -.12]} />
        <Ball at={[0, 1.405, .1]} scale={[.265, .09, .18]} color="#3cadd3" rotation={[0, 0, -.12]} />
        <Ball at={[0, 1.353, .18]} scale={[.305, .038, .235]} color="#e9f3ed" rotation={[.06, 0, -.1]} />
        <Ball at={[-.1, 1.505, -.005]} scale={[.043, .029, .04]} color="#3cadd3" />
      </>}
    </group></group>
  </group></group>;
}
