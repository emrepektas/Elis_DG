import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball, Box, Pole, Flower } from './models';

const random = (i: number) => { const n = Math.sin(i * 127.1 + 17.3) * 43758.5453; return n - Math.floor(n); };
export function Water({ animate }: { animate: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((_, dt) => { if (material.current && animate) material.current.uniforms.time.value += Math.min(dt, .05); });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18, -.1, 0]} receiveShadow>
    <planeGeometry args={[170, 130]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`
      uniform float time; varying vec2 vUv;
      void main(){vec2 p=vUv*vec2(170.,130.);float a=sin(p.x*1.25+p.y*.8+time*.55);float b=sin(p.x*2.1-p.y*1.8-time*.7);float c=sin(p.y*4.+p.x*.5+time*.9);
      float waves=a*b*.5+.5;vec3 color=mix(vec3(.15,.68,.73),vec3(.36,.85,.83),waves*.55+.2);
      float glint=pow(max(0.,a*b*c),26.);color=mix(color,vec3(1.,.99,.8),glint*.9);
      float thin=1.-smoothstep(.012,.045,abs(sin(p.y*2.5+sin(p.x*.8+time*.2)*.6-time*.35)));color+=vec3(.11,.19,.17)*thin*.35;
      gl_FragColor=vec4(color,1.);}`}/>
  </mesh>;
}

function Palm({ x, z, size = 1 }: { x: number; z: number; size?: number }) {
  return <group position={[x, .25, z]} scale={size}>
    <Pole from={[0, 0, 0]} to={[.17, 2.1, .1]} radius={.09} color="#ad9061" />
    {[0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2; return <group key={i} position={[.17, 2.1, .1]} rotation={[0, a, -.18]}><Ball at={[.58, -.08, 0]} scale={[.86, .11, .25]} color={i % 2 ? '#77ae73' : '#569b78'} rotation={[0, 0, -.12]} /><Ball at={[1.03, -.25, 0]} scale={[.32, .07, .14]} color="#69a96e" rotation={[0, 0, -.45]} /></group>; })}
    <Ball at={[.17, 2.05, .1]} scale={[.18, .16, .2]} color="#8e9660" />
  </group>;
}
function BeachChair({ x, z, color }: { x: number; z: number; color: string }) {
  return <group position={[x, .37, z]} rotation={[0, -.25, 0]}>
    <Box at={[0, .28, 0]} scale={[.62, .05, .68]} color={color} />
    <Box at={[0, .7, -.37]} scale={[.62, .75, .045]} color={color} rotation={[-.23, 0, 0]} />
    {[-1, 1].map(i => <group key={i}><Pole from={[i * .33, 0, -.4]} to={[i * .33, 1.12, -.5]} color="#a68259" /><Pole from={[i * .33, 0, .3]} to={[i * .33, .7, -.2]} color="#a68259" /></group>)}
  </group>;
}
export function Coast() {
  return <group>
    <Ball at={[-5, -.45, -1.2]} scale={[7, .64, 6.2]} color="#d5c69c" />
    <Ball at={[-5, -.17, -1.2]} scale={[6.85, .57, 6.05]} color="#f7dfae" />
    <Ball at={[-6.2, .14, -2.1]} scale={[3.8, .22, 2.9]} color="#d0d599" />
    <Palm x={-7.2} z={-2.7} size={1.4} /><Palm x={-3.7} z={-4.5} size={1.15} /><Palm x={-9.2} z={.3} size={.95} />
    <BeachChair x={-5.4} z={-.3} color="#f69f91" /><BeachChair x={-6.4} z={-.5} color="#8bc9c2" />
    <group position={[-6.3, 0, -1.8]}>
      <Pole from={[0, .2, 0]} to={[0, 2.25, 0]} radius={.035} color="#b88f5b" />
      <mesh position={[0, 2.13, 0]}><coneGeometry args={[1.08, .42, 10, 1, true]} /><meshStandardMaterial color="#fff2cc" side={THREE.DoubleSide} /></mesh>
      <Ball at={[0, 2.37, 0]} scale={[.08, .06, .08]} color="#d8b777" />
    </group>
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <Ball key={i} at={[-10 + random(i) * 10, .31, -4.9 + random(i + 20) * 7]} scale={[.15 + random(i + 40) * .28, .11, .17]} color={i % 2 ? '#fff1ce' : '#d9c99d'} />)}
    {/* A broad pier, interrupted only by the two forgiving jumping gaps. */}
    {[[0, 2.1], [2.55, 4.4], [4.85, 7.2]].flatMap(([start, end], segment) => {
      const count = Math.ceil((end - start) * .8 / .36), width = (end - start) * .8 / count;
      return Array.from({ length: count }, (_, i) => <group key={`${segment}-${i}`} position={[-1.65 + start * .8 + width * (i + .5), .25, 1.65]}>
        <Box at={[0, .06, 0]} scale={[width - .025, .14, 1.25]} color={i % 2 ? '#c89d6c' : '#d5af7b'} />
        {i % 3 === 0 && [-1, 1].map(s => <mesh key={s} position={[0, -.18, s * .57]} castShadow><cylinderGeometry args={[.07, .08, .8, 8]} /><meshStandardMaterial color="#a97b53" /></mesh>)}
      </group>);
    })}
    <Box at={[-1.7, .42, 1.65]} scale={[.15, .14, 1.4]} color="#c99c67" />
    <Pole from={[-1.8, .4, 1.1]} to={[-1.8, 1.05, 1.1]} color="#ae7e53" />
    <Pole from={[3.8, .4, 1.1]} to={[3.8, 1.05, 1.1]} color="#ae7e53" />
    <mesh position={[-1.8, .8, 1.1]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.18, .04, 7, 16]} /><meshStandardMaterial color="#f1e3ba" /></mesh>
  </group>;
}

function InstancedLeaves() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < 64; i++) {
      const a = random(i + 7) * Math.PI * 2, r = 3 + random(i + 80) * 3.5;
      o.position.set(41 + Math.cos(a) * r, .4 + random(i + 120) * .28, -1 + Math.sin(a) * r);
      const s = .45 + random(i + 230) * .65;
      o.scale.set(s, s * .62, s); o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix);
      ref.current?.setColorAt(i, new THREE.Color(i % 3 === 0 ? '#7fb77a' : i % 3 === 1 ? '#559d73' : '#95c683'));
    }
    if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; }
  }, []);
  return <instancedMesh ref={ref} args={[undefined, undefined, 64]} castShadow receiveShadow><sphereGeometry args={[1, 10, 7]} /><meshStandardMaterial roughness={.9} /></instancedMesh>;
}
function FlowerField({ animate }: { animate: boolean }) {
  const stems = useRef<THREE.InstancedMesh>(null), petals = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => Array.from({ length: 90 }, (_, i) => {
    const x = 35.2 + random(i + 340) * 12, z = -6 + random(i + 560) * 10;
    return { x, z, s: .16 + random(i + 912) * .16, color: ['#f0a4b8', '#fff4c1', '#c4b3eb', '#f6be8e'][i % 4] };
  }), []);
  const update = (t: number) => {
    if (!stems.current || !petals.current) return;
    const o = new THREE.Object3D();
    base.forEach((p, i) => {
      const sway = Math.sin(t * 1.1 + p.x) * .035;
      o.position.set(p.x, .55, p.z); o.scale.set(.018, .32, .018); o.rotation.set(0, 0, sway); o.updateMatrix(); stems.current!.setMatrixAt(i, o.matrix);
      o.position.set(p.x + sway * .5, .9, p.z); o.scale.set(p.s, p.s, p.s * .55); o.updateMatrix(); petals.current!.setMatrixAt(i, o.matrix); petals.current!.setColorAt(i, new THREE.Color(p.color));
    });
    stems.current.instanceMatrix.needsUpdate = true; petals.current.instanceMatrix.needsUpdate = true;
    if (petals.current.instanceColor) petals.current.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => { update(0); }, [base]);
  useFrame(({ clock }) => { if (animate) update(clock.elapsedTime); });
  return <><instancedMesh ref={stems} args={[undefined, undefined, base.length]}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#568b56" /></instancedMesh><instancedMesh ref={petals} args={[undefined, undefined, base.length]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={.8} /></instancedMesh></>;
}
export function Garden({ animate }: { animate: boolean }) {
  return <group>
    <Ball at={[41, -.5, -1]} scale={[8.6, .8, 7]} color="#c5bd8b" />
    <Ball at={[41, -.05, -1]} scale={[8.5, .6, 6.9]} color="#a8ca91" />
    <InstancedLeaves /><FlowerField animate={animate} />
    <Ball at={[40.9, .4, .6]} scale={[2, .04, 4.4]} color="#e9d8ad" rotation={[0, 0, 0]} />
    {[0, 1, 2, 3, 4, 5].map(i => <Ball key={i} at={[40.8 + Math.sin(i) * .22, .47, 3.5 - i * 1.1]} scale={[.8, .06, .4]} color={i % 2 ? '#eee4c3' : '#f7edcf'} />)}
    <group position={[40.8, .4, 4.2]}>
      {[-1, 1].map(s => <group key={s}><Pole from={[s * 1.4, 0, 0]} to={[s * 1.4, 2.8, 0]} radius={.075} color="#f6e8c6" /><Pole from={[s * 1.39, 0, .4]} to={[s * 1.39, 2.5, .4]} radius={.06} color="#f6e8c6" /></group>)}
      <mesh position={[0, 2.75, 0]}><torusGeometry args={[1.4, .07, 6, 32, Math.PI]} /><meshStandardMaterial color="#f6e8c6" /></mesh>
      {[-1, 1].map(s => <group key={s}><Flower position={[s * 1.38, 1.6, .05]} size={.55} color="#d6b9e2" /><Flower position={[s * .85, 2.8, .05]} size={.4} color="#ffc0ca" /></group>)}
    </group>
    <group position={[44.5, .5, -1.8]} rotation={[0, -.2, 0]}>
      <Box at={[0, .55, 0]} scale={[2.1, .13, .75]} color="#e8c89d" /><Box at={[0, 1.03, -.36]} scale={[2.1, .82, .1]} color="#e8c89d" />
      {[-1, 1].map(s => <Box key={s} at={[s * .8, .25, 0]} scale={[.12, .6, .65]} color="#bd9469" />)}
    </group>
    <group position={[39.5, .45, -4]}>
      <Box at={[0, .95, 0]} scale={[2.7, .14, 1.2]} color="#e8c89a" />
      {[-1, 1].map(s => <group key={s}><Box at={[s * 1, .45, -.4]} scale={[.12, .95, .12]} color="#b88c65" /><Box at={[s * 1, .45, .4]} scale={[.12, .95, .12]} color="#b88c65" /></group>)}
      <Ball at={[-.7, 1.09, 0]} scale={[.22, .08, .23]} color="#91bbbe" /><Ball at={[.7, 1.15, -.1]} scale={[.17, .2, .17]} color="#eee0b8" />
      <Pole from={[.2, 1, .1]} to={[.35, 1.65, .1]} color="#85a273" radius={.025} />
    </group>
    <Palm x={46.7} z={-4} size={1.3} /><Palm x={35.4} z={-3.8} size={1.05} />
  </group>;
}

export function DistantWorld({ animate }: { animate: boolean }) {
  const clouds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (clouds.current) clouds.current.position.x = animate ? Math.sin(clock.elapsedTime * .025) * 2 : 0; });
  return <>
    {[0, 1, 2, 3, 4, 5].map(i => <group key={i} position={[-12 + i * 14, 0, -25 - random(i) * 7]}><Ball at={[0, -.1, 0]} scale={[5 + random(i + 11) * 5, 2 + random(i + 34) * 2, 3.8]} color={i % 2 ? '#91c5b7' : '#a2ccba'} /><Ball at={[0, 0, .2]} scale={[4, 1.4, 3]} color="#b0d0aa" /></group>)}
    <group ref={clouds}>{[0, 1, 2, 3, 4, 5].map(i => <group key={i} position={[-9 + i * 12, 9 + random(i + 21) * 2, -13 - random(i + 11) * 8]}>{[0, 1, 2].map(j => <Ball key={j} at={[j * 1.2, j === 1 ? .3 : 0, 0]} scale={[1.7, .56 + (j === 1 ? .2 : 0), .7]} color="#fffbe8" />)}</group>)}</group>
    {[0, 1, 2, 3].map(i => <group key={i} position={[8 + i * 6, -.03, -4 + random(i + 33) * 11]}><Ball at={[0, 0, 0]} scale={[.8, .045, .3]} color="#b0eadf" /><Ball at={[.1, .02, .04]} scale={[.45, .02, .2]} color="#cbf5e6" /></group>)}
  </>;
}
