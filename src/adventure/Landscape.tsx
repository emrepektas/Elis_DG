import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Box, Pole } from '../world/models';

type Point = readonly [number, number];
export const GARDEN_PATH: readonly Point[] = [[43, -4], [46, 0], [49, 4], [53, 2], [56, -3], [60, -6]];
const COAST_PATH: readonly Point[] = [[-7, 6], [-5, 1], [-1, -3], [3, -4]];
const rand = (i: number) => { const n = Math.sin(i * 127.17 + 38.1) * 43758.5453; return n - Math.floor(n); };
const palette = ['#ffb4c4', '#f3c46c', '#c2a5ec', '#fff3ca', '#ee899e', '#8ccad7'];

function roundedShape(x1: number, z1: number, x2: number, z2: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(x1 + r, z1); s.lineTo(x2 - r, z1); s.quadraticCurveTo(x2, z1, x2, z1 + r);
  s.lineTo(x2, z2 - r); s.quadraticCurveTo(x2, z2, x2 - r, z2); s.lineTo(x1 + r, z2);
  s.quadraticCurveTo(x1, z2, x1, z2 - r); s.lineTo(x1, z1 + r); s.quadraticCurveTo(x1, z1, x1 + r, z1);
  return s;
}

function Island({ garden = false }: { garden?: boolean }) {
  const geometry = useMemo(() => {
    const [x1, x2, z1, z2] = garden ? [40, 64, -14, 14] : [-14, 3, -10, 10];
    const base = roundedShape(x1, z1, x2, z2, 2);
    const inner = roundedShape(x1 + .45, z1 + .45, x2 - .45, z2 - .45, 1.8);
    const cliff = new THREE.ExtrudeGeometry(base, { depth: 1.15, bevelEnabled: false, steps: 1, curveSegments: 8 });
    const turf = new THREE.ShapeGeometry(inner, 8);
    // Local shape Y maps to negative world Z. Both islands are symmetric in Z.
    return { cliff, turf };
  }, [garden]);
  return <group>
    <mesh geometry={geometry.cliff} position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><meshStandardMaterial color={garden ? '#ddcda5' : '#efd2a0'} roughness={.95} /></mesh>
    <mesh geometry={geometry.turf} position={[0, .006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><meshStandardMaterial color={garden ? '#a8cb84' : '#e4d7a4'} roughness={1} /></mesh>
  </group>;
}

function Path({ points, width = 1.7, color = '#f1ddb2' }: { points: readonly Point[]; width?: number; color?: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, .018, z)), false, 'catmullrom', .2);
    const vertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, p = curve.getPoint(t), d = curve.getTangent(t);
      const n = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(width / 2);
      vertices.push(p.x - n.x, p.y, p.z - n.z, p.x + n.x, p.y, p.z + n.z);
      if (i < 120) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }, [points, width]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={1} /></mesh>;
}

function Dock({ x, garden = false }: { x: number; garden?: boolean }) {
  return <group position={[x, 0, -4]}>
    {Array.from({ length: 9 }, (_, i) => <Box key={i} at={[(i - 4) * .31, -.085, 0]} scale={[.29, .17, 1.8]} color={i % 2 ? '#d9b98a' : '#cda677'} />)}
    {[-1, 1].flatMap(s => [-1, 1].map(t => <Pole key={`${s}-${t}`} from={[s * 1.1, -.65, t * .8]} to={[s * 1.1, .58, t * .8]} radius={.075} color="#b88e64" />))}
    <mesh position={[garden ? -.9 : .9, .34, .82]}><torusGeometry args={[.16, .035, 6, 16]} /><meshStandardMaterial color="#f7e4bf" /></mesh>
  </group>;
}

function distanceToPath(x: number, z: number) {
  let nearest = Infinity;
  for (let i = 1; i < GARDEN_PATH.length; i++) {
    const [ax, az] = GARDEN_PATH[i - 1], [bx, bz] = GARDEN_PATH[i];
    const t = THREE.MathUtils.clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2), 0, 1);
    nearest = Math.min(nearest, Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t));
  }
  return nearest;
}

/** Hundreds of small flowers use three draw calls, leaving the path and note flowers clear. */
function Meadow({ motion, clearStage=false }: { motion: boolean; clearStage?:boolean }) {
  const stems = useRef<THREE.InstancedMesh>(null), petals = useRef<THREE.InstancedMesh>(null), centers = useRef<THREE.InstancedMesh>(null);
  const flowers = useMemo(() => {
    const out: { x: number; z: number; s: number; color: string }[] = [];
    for (let i = 0; i < 900; i++) {
      const x = 41.5 + rand(i * 5) * 21, z = -12 + rand(i * 5 + 1) * 24;
      if(clearStage&&x>55&&z>-11&&z<5)continue;
      if (distanceToPath(x, z) < 1.5 || Math.hypot(x - 60, z + 6) < 2.4 || Math.hypot(x - 59, z - 7) < 3.2) continue;
      out.push({ x, z, s: .2 + rand(i * 5 + 2) * .25, color: palette[Math.floor(rand(i * 5 + 3) * palette.length)] });
    }
    return out;
  }, [clearStage]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const paint = (t: number) => {
    if (!stems.current || !petals.current || !centers.current) return;
    flowers.forEach((p, i) => {
      const h = p.s * 1.9, sway = Math.sin(t * 1.05 + p.x * .6 + p.z) * .055;
      dummy.rotation.set(0, 0, sway); dummy.position.set(p.x, h * .5, p.z); dummy.scale.set(.014, h, .014); dummy.updateMatrix(); stems.current!.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(.1, Math.sin(p.x) * .5, sway); dummy.position.set(p.x + sway * h, h, p.z); dummy.scale.set(p.s, p.s * .82, p.s * .35); dummy.updateMatrix(); petals.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.z += p.s * .27; dummy.scale.set(p.s * .36, p.s * .36, p.s * .23); dummy.updateMatrix(); centers.current!.setMatrixAt(i, dummy.matrix);
    });
    stems.current.instanceMatrix.needsUpdate = true; petals.current.instanceMatrix.needsUpdate = true; centers.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    paint(0); flowers.forEach((p, i) => petals.current?.setColorAt(i, new THREE.Color(p.color)));
    if (petals.current?.instanceColor) petals.current.instanceColor.needsUpdate = true;
  }, [flowers]);
  useFrame(({ clock }) => { if (motion) paint(clock.elapsedTime); });
  return <>
    <instancedMesh ref={stems} args={[undefined, undefined, flowers.length]}><cylinderGeometry args={[1, 1, 1, 4]} /><meshStandardMaterial color="#568c57" /></instancedMesh>
    <instancedMesh ref={petals} args={[undefined, undefined, flowers.length]}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial roughness={.8} /></instancedMesh>
    <instancedMesh ref={centers} args={[undefined, undefined, flowers.length]}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial color="#ffe3a0" /></instancedMesh>
  </>;
}

function Orchard() {
  const trunks = useRef<THREE.InstancedMesh>(null), crowns = useRef<THREE.InstancedMesh>(null), bushes = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < 32; i++) {
      const side = i % 4, t = (i / 4 | 0) / 7;
      const x = side === 0 ? 41.1 : side === 1 ? 62.8 : 42.5 + t * 18.5;
      let z = side === 2 ? -12.4 : side === 3 ? 12.4 : -10.7 + t * 21.4;
      if (x < 43 && Math.abs(z + 4) < 2.4) z = -10.5;
      const s = .8 + rand(i + 480) * .45;
      o.rotation.set(0, 0, 0); o.position.set(x, 1.1 * s, z); o.scale.set(.13 * s, 2.2 * s, .13 * s); o.updateMatrix(); trunks.current?.setMatrixAt(i, o.matrix);
      for (let j = 0; j < 3; j++) {
        o.position.set(x + (j - 1) * .44 * s, (2.35 + (j === 1 ? .45 : 0)) * s, z); o.scale.set(.95 * s, 1.05 * s, .86 * s); o.updateMatrix(); crowns.current?.setMatrixAt(i * 3 + j, o.matrix);
        crowns.current?.setColorAt(i * 3 + j, new THREE.Color(['#7dae73', '#92bf7a', '#b1cf83'][j]));
      }
    }
    for (let i = 0; i < 64; i++) {
      const x = 41 + rand(i + 800) * 22, z = -12.5 + rand(i + 880) * 25;
      const valid = distanceToPath(x, z) > 2.4 && Math.hypot(x - 60, z + 6) > 3 && Math.hypot(x - 59, z - 7) > 3.5;
      o.position.set(x, .32, z); o.scale.setScalar(valid ? .4 + rand(i + 980) * .4 : 0); o.updateMatrix(); bushes.current?.setMatrixAt(i, o.matrix);
      bushes.current?.setColorAt(i, new THREE.Color(i % 3 ? '#82b479' : '#a3c77d'));
    }
    for (const ref of [trunks, crowns, bushes]) if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; }
  }, []);
  return <><instancedMesh ref={trunks} args={[undefined, undefined, 32]} castShadow><cylinderGeometry args={[1, 1.2, 1, 6]} /><meshStandardMaterial color="#b49573" /></instancedMesh><instancedMesh ref={crowns} args={[undefined, undefined, 96]} castShadow><sphereGeometry args={[1, 9, 7]} /><meshStandardMaterial roughness={.95} /></instancedMesh><instancedMesh ref={bushes} args={[undefined, undefined, 64]} castShadow><sphereGeometry args={[1, 8, 5]} /><meshStandardMaterial roughness={1} /></instancedMesh></>;
}

function CoastDecor() {
  return <group>
    {[[-11, -6], [-11, 5], [-3, 7]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>
      <Pole from={[0, 0, 0]} to={[.12, 2.8, 0]} radius={.11} color="#ba9b70" />
      {Array.from({ length: 6 }, (_, j) => <group key={j} position={[.12, 2.8, 0]} rotation={[0, j * Math.PI / 3, 0]}><Ball at={[.68, -.1, 0]} scale={[1, .1, .3]} rotation={[0, 0, -.18]} color={j % 2 ? '#7ab27c' : '#91be7c'} /></group>)}
    </group>)}
    <group position={[-9, 0, 3]} rotation={[0, .35, 0]}>
      <Box at={[0, .46, 0]} scale={[1.8, .13, .62]} color="#f3d5a0" /><Box at={[0, .85, -.29]} scale={[1.8, .75, .1]} color="#f3d5a0" />
      {[-.65, .65].map(x => <Box key={x} at={[x, .22, 0]} scale={[.1, .44, .5]} color="#b89061" />)}
    </group>
    <group position={[-7, 0, -6]}>
      <Pole from={[0, 0, 0]} to={[0, 2.5, 0]} color="#bf9f73" radius={.05} />
      <mesh position={[0, 2.35, 0]}><coneGeometry args={[1.5, .55, 10, 1, true]} /><meshStandardMaterial color="#f3b5a5" side={THREE.DoubleSide} /></mesh>
      <Ball at={[0, 2.65, 0]} scale={[.09, .09, .09]} color="#e4b180" />
    </group>
    <mesh position={[-5.7, .035, -6]} rotation={[-Math.PI / 2, 0, .2]}><planeGeometry args={[1.8, 2.5]} /><meshStandardMaterial color="#faf0cd" /></mesh>
    <Ball at={[-12, .18, -1]} scale={[.65, .3, .48]} color="#c5ba9b" /><Ball at={[-11.4, .12, -.4]} scale={[.38, .2, .35]} color="#ded2b3" />
  </group>;
}

function GardenDecor() {
  return <group>
    {/* Entry pergola frames the first view without blocking the walking surface. */}
    <group position={[43, 0, -4]} rotation={[0, Math.PI / 2, 0]}>
      {[-1.35, 1.35].map(x => <Pole key={x} from={[x, 0, 0]} to={[x, 2.9, 0]} radius={.07} color="#f6e5bc" />)}
      <mesh position={[0, 2.85, 0]}><torusGeometry args={[1.35, .08, 7, 32, Math.PI]} /><meshStandardMaterial color="#f6e5bc" /></mesh>
      {Array.from({ length: 9 }, (_, i) => <Ball key={i} at={[Math.cos(i / 8 * Math.PI) * 1.35, 2.85 + Math.sin(i / 8 * Math.PI) * 1.35, 0]} scale={[.22, .18, .2]} color={i % 3 ? '#a9c97e' : '#efb0bb'} />)}
    </group>
    {/* A little pond and bridge sit off the main path. */}
    <mesh position={[59, .026, 7]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.5, 1.8, 1]}><circleGeometry args={[1, 40]} /><meshStandardMaterial color="#83c8c0" roughness={.2} metalness={.15} /></mesh>
    {Array.from({ length: 5 }, (_, i) => <group key={i} position={[58.4 + rand(i + 60) * 1.5, .04, 6.2 + rand(i + 70) * 1.6]}><mesh rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[.25, 12, .2, Math.PI * 1.8]} /><meshStandardMaterial color="#88ad72" side={THREE.DoubleSide} /></mesh><Ball at={[.04, .1, 0]} scale={[.11, .12, .11]} color="#f1b6c7" /></group>)}
    <group position={[58.8, 0, 7]} rotation={[0, .2, 0]}>
      <Box at={[0, .22, 0]} scale={[3.6, .15, 1]} color="#d6b487" />
      {[-.55, .55].map(z => <group key={z}><Pole from={[-1.7, .2, z]} to={[-1.7, 1, z]} radius={.045} color="#c19c76" /><Pole from={[1.7, .2, z]} to={[1.7, 1, z]} radius={.045} color="#c19c76" /><Pole from={[-1.7, .95, z]} to={[1.7, .95, z]} radius={.045} color="#c19c76" /></group>)}
    </group>
    <group position={[51, 0, -8.5]} rotation={[0, -.15, 0]}>
      <Box at={[0, .45, 0]} scale={[2.2, .14, .7]} color="#e5c79f" /><Box at={[0, .95, -.32]} scale={[2.2, .95, .1]} color="#e5c79f" />
      {[-.8, .8].map(x => <Box key={x} at={[x, .2, 0]} scale={[.13, .45, .55]} color="#b88c64" />)}
    </group>
    <group position={[48, 0, 9.5]} rotation={[0, -.12, 0]}>
      {Array.from({ length: 7 }, (_, i) => <Pole key={i} from={[i * .8, 0, 0]} to={[i * .8, .8, 0]} radius={.045} color="#efe2bf" />)}
      {[.3, .63].map(y => <Pole key={y} from={[0, y, 0]} to={[4.8, y, 0]} radius={.035} color="#efe2bf" />)}
    </group>
    {/* A low flower-framed rainbow marks the destination in the distance. */}
    <group position={[60, .08, -8]}>
      {['#eea2ad', '#f0bb89', '#f3db96', '#a9ca97', '#91c7cf', '#b0b4dc', '#c5a8cd'].map((c, i) => <mesh key={c} position={[0, .08, 0]}><torusGeometry args={[3.3 - i * .125, .075, 5, 48, Math.PI]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={.09} roughness={.65} /></mesh>)}
      {[-1, 1].map(s => <group key={s}><Ball at={[s * 3, .12, 0]} scale={[.75, .27, .4]} color="#fff4db" /><Ball at={[s * 3.35, .2, 0]} scale={[.4, .35, .3]} color="#fff4db" /></group>)}
    </group>
  </group>;
}

function Clouds({ motion }: { motion: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    x: -30 + (i / 4 | 0) * 16 + (i % 4) * 1.5,
    z: -35 - rand((i / 4 | 0) + 83) * 22,
    y: 13 + rand((i / 4 | 0) + 32) * 7 + (i % 4 === 2 ? 1 : 0),
    size: 1.5 + rand(i + 99) * 1.3,
  })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const draw = (t: number) => {
    data.forEach((p, i) => { dummy.position.set(p.x + Math.sin(t * .035 + p.z) * 2, p.y, p.z); dummy.scale.set(p.size * 1.7, p.size * .65, p.size); dummy.updateMatrix(); ref.current?.setMatrixAt(i, dummy.matrix); });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { draw(0); }, [data]);
  useFrame(({ clock }) => { if (motion) draw(clock.elapsedTime); });
  return <instancedMesh ref={ref} args={[undefined, undefined, data.length]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#fff9e9" roughness={1} /></instancedMesh>;
}

export interface OpeningCloudsProps { motion: boolean }

/** A high, open cloud bank: the camera descends through its central clearing. */
export function OpeningClouds({ motion }: OpeningCloudsProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const clouds = useMemo(() => {
    const clusters: { x: number; y: number; z: number; size: number }[] = [];
    // Far banks form a soft horizon below the title, rather than a wall in front of it.
    for (let row = 0; row < 3; row++) for (let column = 0; column < 9; column++) {
      const seed = row * 9 + column;
      clusters.push({ x: -55 + column * 12.5, y: 22 + rand(seed + 710) * 4,
        z: -20 - row * 14 + rand(seed + 720) * 5, size: 3.7 + rand(seed + 730) * 2.5 });
    }
    // Foreground clouds frame the view. The middle stays clear for the descent.
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 5; i++) {
      clusters.push({ x: -5.5 + side * (14 + i * 3.1), y: 25 + rand(i + side + 755) * 5,
        z: 16 - i * 8, size: 3.4 + rand(i + side + 765) * 1.8 });
    }
    return clusters.flatMap((cloud, index) => Array.from({ length: 5 }, (_, lobe) => {
      const a = lobe / 5 * Math.PI * 2;
      return { x: cloud.x + Math.cos(a) * cloud.size * .57,
        y: cloud.y + (lobe === 1 ? cloud.size * .28 : rand(index * 5 + lobe + 790) * .65),
        z: cloud.z + Math.sin(a) * cloud.size * .4,
        size: cloud.size * (.72 + rand(index * 5 + lobe + 850) * .35),
        phase: index * .73,
        color: ['#ffffff', '#fffdf3', '#f3faff', '#ffffff', '#f8fcff'][lobe] };
    }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const draw = (time: number) => {
    const instance = mesh.current;
    if (!instance) return;
    clouds.forEach((cloud, i) => {
      dummy.position.set(cloud.x + Math.sin(time * .045 + cloud.phase) * .65,
        cloud.y + Math.sin(time * .11 + cloud.phase) * .13, cloud.z);
      dummy.scale.set(cloud.size * 1.55, cloud.size * .62, cloud.size);
      dummy.updateMatrix(); instance.setMatrixAt(i, dummy.matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    draw(0);
    clouds.forEach((cloud, i) => mesh.current?.setColorAt(i, new THREE.Color(cloud.color)));
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current?.computeBoundingSphere();
  }, [clouds]);
  useFrame(({ clock }) => { if (motion) draw(clock.elapsedTime); });
  return <group name="opening-cloud-bank" userData={{ actor: true }}>
    <instancedMesh ref={mesh} args={[undefined, undefined, clouds.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial roughness={1} emissive="#d8e8ee" emissiveIntensity={.12} />
    </instancedMesh>
  </group>;
}

function Atmosphere({ night, motion }: { night: number; motion: boolean }) {
  const sky = useRef<THREE.ShaderMaterial>(null), sea = useRef<THREE.ShaderMaterial>(null), stars = useRef<THREE.PointsMaterial>(null), motes = useRef<THREE.Group>(null);
  const uniforms = useMemo(() => ({ night: { value: 0 }, time: { value: 0 } }), []);
  const starGeometry = useMemo(() => {
    const p: number[] = []; for (let i = 0; i < 260; i++) { const a = rand(i + 9000) * Math.PI * 2, y = .2 + rand(i + 9300) * .8, r = Math.sqrt(1 - y * y); p.push(24 + Math.cos(a) * r * 130, y * 130, Math.sin(a) * r * 130); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g;
  }, []);
  useFrame((_, dt) => {
    uniforms.night.value = night;
    if (motion) uniforms.time.value += Math.min(dt, .05);
    for(const material of [sky.current,sea.current]) if(material){material.uniforms.night.value=night;material.uniforms.time.value=uniforms.time.value;}
    if (stars.current) stars.current.opacity = night * .82;
    if (motes.current && motion) { motes.current.position.y = Math.sin(uniforms.time.value * .6) * .15; motes.current.rotation.y = Math.sin(uniforms.time.value * .12) * .025; }
  });
  return <>
    <mesh position={[24, 0, 0]}><sphereGeometry args={[180, 24, 16]} /><shaderMaterial ref={sky} side={THREE.BackSide} depthWrite={false} uniforms={uniforms} vertexShader={'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'} fragmentShader={'uniform float night; varying vec3 p; void main(){float h=clamp(normalize(p).y,0.,1.); vec3 day=mix(vec3(.67,.85,.9),vec3(.38,.7,.9),pow(h,.55));vec3 dusk=mix(vec3(.12,.16,.26),vec3(.018,.035,.1),pow(h,.4));gl_FragColor=vec4(mix(day,dusk,night),1.);}'} /></mesh>
    <points geometry={starGeometry}><pointsMaterial ref={stars} color="#fff0cf" size={.18} sizeAttenuation transparent opacity={0} depthWrite={false} /></points>
    <mesh position={[-18, 35, -65]}><sphereGeometry args={[3.5, 20, 12]} /><meshBasicMaterial color="#fff1c7" transparent opacity={1 - night * .95} depthWrite={false} /></mesh>
    <mesh position={[41, 30, -63]}><sphereGeometry args={[2.5, 20, 12]} /><meshBasicMaterial color="#f4edcf" transparent opacity={night} depthWrite={false} /></mesh>
    <mesh position={[23, -.11, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[330, 290]} /><shaderMaterial ref={sea} uniforms={uniforms} vertexShader={'varying vec2 p;varying vec3 w;void main(){p=uv*vec2(330.,290.);w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'} fragmentShader={`uniform float time;uniform float night;varying vec2 p;varying vec3 w;void main(){float a=sin(p.x*1.25+p.y*.8+time*.55);float b=sin(p.x*2.1-p.y*1.8-time*.7);float c=sin(p.y*4.+p.x*.5+time*.9);float waves=a*b*.5+.5;vec3 day=mix(vec3(.16,.67,.71),vec3(.37,.85,.8),waves*.55+.2);vec3 dark=mix(vec3(.035,.13,.23),vec3(.1,.24,.34),waves);float glint=pow(max(0.,a*b*c),24.);vec3 color=mix(day,dark,night);color=mix(color,mix(vec3(1.,.99,.8),vec3(.66,.82,.88),night),glint*.85);float haze=smoothstep(45.,150.,length(w.xz-cameraPosition.xz));color=mix(color,mix(vec3(.67,.85,.9),vec3(.12,.16,.26),night),haze);gl_FragColor=vec4(color,1.);}`} /></mesh>
    <group ref={motes}>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[44 + rand(i + 502) * 17, 1.1 + rand(i + 522) * 1.2, -10 + rand(i + 532) * 20]}><sphereGeometry args={[.035, 4, 4]} /><meshBasicMaterial color={i % 2 ? '#fff5b3' : '#ffd9e8'} transparent opacity={.68} /></mesh>)}
    </group>
  </>;
}

/** The same continuous world remains mounted from walking to sailing and back. */
export function Landscape({ night, motion, selection=false, celebration=false }: { night: number; motion: boolean; selection?:boolean; celebration?:boolean }) {
  return <group>
    <Atmosphere night={night} motion={motion} /><Clouds motion={motion} />
    <Island /><Island garden />
    <Path points={COAST_PATH} width={1.8} color="#f3dfb2" /><Path points={GARDEN_PATH} width={1.8} />
    <Dock x={3.2} /><Dock x={40} garden />
    <group userData={{cameraBlocker:true}}>{!selection&&<CoastDecor />}{!celebration&&<Orchard />}<GardenDecor /></group>
    <Meadow motion={motion} clearStage={celebration}/>
  </group>;
}

