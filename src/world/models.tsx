import { useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

type XYZ = [number, number, number];
const colors = { blue: '#7ccbea', dark: '#294f72', cream: '#ffefc7', red: '#f46460', stone: '#d5c6a8' };
const roundGeometry = new THREE.SphereGeometry(1, 12, 8);
const landscapeGeometry = new THREE.SphereGeometry(1, 40, 16);

export function Ball({ at, scale = [1, 1, 1], color, rotation, castShadow = true, roughness = .78 }: { at: XYZ; scale?: XYZ; color: string; roughness?: number; rotation?: XYZ; castShadow?: boolean }) {
  return <mesh geometry={Math.max(...scale) > 3 ? landscapeGeometry : roundGeometry} position={at} scale={scale} rotation={rotation} castShadow={castShadow} receiveShadow><meshStandardMaterial color={color} roughness={roughness} /></mesh>;
}
export function Box({ at, scale, color, rotation }: { at: XYZ; scale: XYZ; color: string; rotation?: XYZ }) {
  return <mesh position={at} scale={scale} rotation={rotation} castShadow receiveShadow><boxGeometry /><meshStandardMaterial color={color} roughness={.85} /></mesh>;
}
export function Pole({ from, to, radius = .035, color }: { from: XYZ; to: XYZ; radius?: number; color: string }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return <mesh position={a.add(b).multiplyScalar(.5)} quaternion={q} castShadow><cylinderGeometry args={[radius, radius, d.length(), 8]} /><meshStandardMaterial color={color} /></mesh>;
}
export function BlueFriend({ position = [0, 0, 0], scale = 1 }: { position?: XYZ; scale?: number }) {
  return <group position={position} scale={scale}>
    <Ball at={[0, .54, 0]} scale={[.34, .47, .23]} color={colors.blue} />
    <Ball at={[0, 1.12, 0]} scale={[.37, .34, .29]} color={colors.blue} />
    <Ball at={[-.36, .66, .01]} scale={[.13, .34, .14]} color={colors.blue} rotation={[0, 0, -.38]} />
    <Ball at={[.36, .66, .01]} scale={[.13, .34, .14]} color={colors.blue} rotation={[0, 0, .38]} />
    {[-1, 1].map(s => <group key={s}>
      <Ball at={[s * .18, .13, .07]} scale={[.15, .26, .2]} color={s < 0 ? '#83cde7' : '#a4d9e9'} />
      <Ball at={[s * .13, 1.17, .263]} scale={[.072, .082, .036]} color="#fffefa" />
      <Ball at={[s * .13, 1.17, .295]} scale={[.027, .04, .017]} color="#293d4b" />
    </group>)}
    <Ball at={[0, 1.07, .3]} scale={[.058, .045, .044]} color="#6aa9c4" />
    <mesh position={[0, 1.01, .268]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.072, .012, 6, 16, Math.PI]} /><meshStandardMaterial color="#49758b" /></mesh>
    {[-1, 0, 1].map(s => <Ball key={s} at={[s * .075, 1.44 + (s === 0 ? .03 : 0), -.02]} scale={[.055, .15, .05]} color="#e95b61" rotation={[0, 0, s * -.22]} />)}
    <Ball at={[-.16, .58, .2]} scale={[.11, .16, .025]} color="#abdce9" />
  </group>;
}
export function StoneFriend({ position = [0, 0, 0], scale = 1 }: { position?: XYZ; scale?: number }) {
  return <group position={position} scale={scale}>
    <Ball at={[0, .46, 0]} scale={[.43, .47, .32]} color={colors.stone} />
    <Ball at={[0, .99, .02]} scale={[.51, .32, .31]} color="#e3d7bd" />
    {[-1, 1].map(s => <group key={s}>
      <Ball at={[s * .5, 1.01, 0]} scale={[.2, .13, .15]} color="#cbb99c" />
      <Ball at={[s * .16, 1.03, .304]} scale={[.059, .076, .035]} color="#a99b83" />
      <Ball at={[s * .16, 1.04, .33]} scale={[.023, .034, .015]} color="#383c32" />
      <Ball at={[s * .3, .38, .19]} scale={[.16, .12, .18]} color="#dfd0b1" />
      <Ball at={[s * .23, .09, .14]} scale={[.18, .12, .23]} color="#bfb091" />
    </group>)}
    <Ball at={[0, 1.26, -.03]} scale={[.16, .13, .15]} color="#c8b795" />
    <Ball at={[0, 1.38, -.03]} scale={[.11, .06, .1]} color="#dacbb1" />
    <mesh position={[0, .91, .316]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.1, .013, 6, 16, Math.PI]} /><meshStandardMaterial color="#8e826d" /></mesh>
  </group>;
}
export function Penguin({ position = [0, 0, 0], yaw = 0 }: { position?: XYZ; yaw?: number }) {
  return <group position={position} rotation={[0, yaw, 0]}>
    <Ball at={[0, .44, 0]} scale={[.28, .42, .24]} color="#505d6c" />
    <Ball at={[0, .43, .17]} scale={[.22, .32, .11]} color="#faf2d9" />
    <Ball at={[0, .79, .02]} scale={[.25, .25, .24]} color="#455469" />
    {[-1, 1].map(s => <group key={s}>
      <Ball at={[s * .095, .8, .221]} scale={[.082, .08, .027]} color="#fff5df" />
      <mesh position={[s * .095, .81, .251]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.039, .01, 5, 10, Math.PI]} /><meshStandardMaterial color="#273b4d" /></mesh>
      <Ball at={[s * .3, .45, 0]} scale={[.085, .26, .09]} color="#4d5b6a" rotation={[0, 0, s * .28]} />
      <Ball at={[s * .13, .06, .12]} scale={[.12, .065, .18]} color="#efba72" />
    </group>)}
    <mesh position={[0, .735, .27]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.065, .13, 5]} /><meshStandardMaterial color="#efba72" /></mesh>
  </group>;
}

const sailGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-.03, 0); shape.lineTo(-.03, 2.17); shape.quadraticCurveTo(1.42, 1.52, 1.9, .16); shape.quadraticCurveTo(.9, -.18, -.03, 0);
  return new THREE.ShapeGeometry(shape, 18);
})();

export function Boat({ children, animate = true, position = [0, 0, 0], yaw = -.18 }: { children?: React.ReactNode; animate?: boolean; position?: XYZ; yaw?: number }) {
  const bob = useRef<THREE.Group>(null), sail = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!bob.current) return;
    const t = clock.elapsedTime;
    bob.current.position.y = animate ? Math.sin(t * 1.6) * .065 : 0;
    bob.current.rotation.z = animate ? Math.sin(t * .9) * .025 : 0;
    if (sail.current) sail.current.rotation.y = animate ? Math.sin(t * .8) * .055 : 0;
  });
  return <group position={position} rotation={[0, yaw, 0]}><group ref={bob}>
    <Ball at={[0, .18, 0]} scale={[1.5, .48, .72]} color="#284b70" />
    <Ball at={[0, .46, 0]} scale={[1.49, .21, .71]} color="#fff0c8" />
    <Ball at={[0, .54, .005]} scale={[1.31, .1, .55]} color="#cbb884" />
    <Ball at={[0, .58, .005]} scale={[1.22, .08, .49]} color="#f1ddb0" />
    <Box at={[-.67, .62, 0]} scale={[.16, .075, 1]} color="#e7cd92" />
    <Box at={[.69, .62, 0]} scale={[.16, .075, 1]} color="#e7cd92" />
    <Pole from={[-.48, .58, -.1]} to={[-.48, 3.55, -.1]} radius={.045} color="#a6794f" />
    <Pole from={[-.46, 1.15, -.12]} to={[1.39, 1.29, -.12]} radius={.034} color="#a6794f" />
    <mesh name="red-sail" ref={sail} geometry={sailGeometry} position={[-.45, 1.29, -.1]} castShadow><meshStandardMaterial color="#f2605d" side={THREE.DoubleSide} roughness={.82} /></mesh>
    <Pole from={[-.46, 3.46, -.13]} to={[1.35, 1.34, -.13]} radius={.012} color="#f4d4a1" />
    <Pole from={[-1.3, .58, -.1]} to={[-2.05, .46, -.7]} radius={.035} color="#b68a5c" />
    <Ball at={[-2, .44, -.67]} scale={[.27, .035, .12]} color="#ccaa73" />
    {children}
  </group></group>;
}

export function Hotspot({ id, position, children, onClick, enabled = true }: { id: string; position: XYZ; children: React.ReactNode; onClick: () => void; enabled?: boolean }) {
  const enter = (e: ThreeEvent<PointerEvent>) => { if (!enabled) return; e.stopPropagation(); document.body.style.cursor = 'pointer'; };
  const centerY = id.startsWith('crew') ? .8 : id.startsWith('flower') ? 1 : ['cast', 'reel'].includes(id) ? .3 : .15;
  return <group position={position} name={id} userData={{ hotspot: id, centerY }} onPointerOver={enter} onPointerOut={() => { document.body.style.cursor = ''; }} onClick={e => { if (enabled) { e.stopPropagation(); onClick(); } }}>{children}{enabled && <mesh position={[0, centerY, 0]}><sphereGeometry args={[.45, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>}</group>;
}

export function Flower({ position = [0, 0, 0], color = '#ee90b7', size = 1, open = false }: { position?: XYZ; color?: string; size?: number; open?: boolean }) {
  return <group position={position} scale={size}>
    <Pole from={[0, 0, 0]} to={[0, .73, 0]} radius={.028} color="#55885b" />
    <Ball at={[-.13, .3, 0]} scale={[.19, .055, .08]} rotation={[0, 0, -.35]} color="#71aa68" />
    <Ball at={[.13, .44, 0]} scale={[.18, .055, .08]} rotation={[0, 0, .4]} color="#75b774" />
    {[0, 1, 2, 3, 4, 5].map(i => { const t = i / 6 * Math.PI * 2; return <Ball key={i} at={[Math.cos(t) * (open ? .24 : .17), .78 + Math.sin(t) * (open ? .24 : .17), .015]} scale={open ? [.19, .18, .08] : [.15, .17, .09]} color={color} />; })}
    <Ball at={[0, .78, .09]} scale={[.13, .13, .085]} color="#ffd577" />
  </group>;
}

export function Book({ position = [0, 0, 0], open = false }: { position?: XYZ; open?: boolean }) {
  return <group position={position} rotation={[0, -.24, 0]}>
    <Box at={[0, .04, 0]} scale={[1.05, .08, .76]} color="#477b78" />
    <Box at={[0, .13, 0]} scale={[.98, .12, .7]} color="#fff2d6" />
    <Box at={[-.48, .15, 0]} scale={[.07, .2, .76]} color="#3d6b70" />
    <group position={[-.5, .22, 0]} rotation={[0, 0, open ? 2.35 : .06]}><Box at={[.51, 0, 0]} scale={[1.07, .045, .77]} color="#5d9692" /><Box at={[.55, .026, 0]} scale={[.4, .01, .36]} color="#e7dbb1" /></group>
    <mesh position={[.17, .212, 0]} rotation={[-Math.PI / 2, 0, .4]}><planeGeometry args={[.05, .7]} /><meshStandardMaterial color="#d88990" side={THREE.DoubleSide} /></mesh>
  </group>;
}
