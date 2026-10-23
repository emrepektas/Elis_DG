import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldProps, Stop } from '../types';
import { stepPenguin, penguinStart, stepSail, sailStart, sailGates } from '../engine';
import { Ball, BlueFriend, Boat, Book, Box, Flower, Hotspot, Penguin, Pole, StoneFriend } from './models';
import { Coast, DistantWorld, Garden, Water } from './scenery';

class WorldBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const focus: Record<Stop, [number, number, number]> = {
  coast: [.5, .4, .3], crew: [.5, .65, .3], penguin: [1.6, .65, 1.4],
  sailing: [7, .6, .8], fishing: [25, .7, .5], notebook: [25, .7, .5], garden: [41, .8, .1], gifts: [40, .9, -3.3],
};
function Engine(props: WorldProps) {
  const { state, story, controls, dispatch, reducedMotion, paused } = props;
  const animate = !paused && !reducedMotion;
  const { camera, size, gl, scene } = useThree();
  const cameraTarget = useRef(new THREE.Vector3(...focus[state.stop]));
  const boat = useRef<THREE.Group>(null), penguin = useRef<THREE.Group>(null), float = useRef<THREE.Group>(null), rod = useRef<THREE.Group>(null);
  const sail = useRef({ ...sailStart }), walk = useRef({ ...penguinStart });
  const previousStop = useRef(state.stop), castTime = useRef(0), telemetryTime = useRef(0), gameDone = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    const visibility = () => { active.current = !document.hidden; };
    document.addEventListener('visibilitychange', visibility);
    const lost = (event: Event) => { event.preventDefault(); props.onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    props.onReady?.();
    return () => { document.removeEventListener('visibilitychange', visibility); gl.domElement.removeEventListener('webglcontextlost', lost); document.body.style.cursor = ''; };
  }, [gl]);
  useEffect(() => {
    if (state.stop !== previousStop.current) {
      sail.current = { ...sailStart }; walk.current = { ...penguinStart }; gameDone.current = false;
      previousStop.current = state.stop;
    }
  }, [state.stop]);
  useEffect(() => { castTime.current = 0; }, [state.fishing]);
  useFrame((_, dt) => {
    const playing = !props.blocked && active.current;
    const elapsed = playing ? Math.min(dt, .05) : 0;
    if (state.stop === 'sailing' && !state.sailed && !gameDone.current) {
      sail.current = stepSail(sail.current, controls.current, elapsed);
      if (sail.current.done) { gameDone.current = true; dispatch({ type: 'sail-done' }); }
    }
    if (state.stop === 'penguin' && !state.penguin && !gameDone.current) {
      walk.current = stepPenguin(walk.current, controls.current, elapsed);
      if (walk.current.done) { gameDone.current = true; dispatch({ type: 'penguin-done' }); }
    }
    if (state.stop === 'fishing' && state.fishing === 'cast') {
      castTime.current += elapsed;
      if (castTime.current > 1.7) { castTime.current = -1000; dispatch({ type: 'bite' }); }
    }
    const stop = state.stop;
    const atSea = ['sailing', 'fishing', 'notebook', 'garden', 'gifts'].includes(stop);
    let boatX = atSea ? 25 : 4.65, boatZ = atSea ? .4 : 1.65;
    if (stop === 'sailing') { boatX = state.sailed ? 25 : 6 + sail.current.progress * 19; boatZ = state.sailed ? .4 : -sail.current.x; }
    if (stop === 'garden' || stop === 'gifts') { boatX = 33.6; boatZ = 3; }
    if (boat.current) { boat.current.position.set(boatX, .03, boatZ); boat.current.rotation.y = stop === 'sailing' ? -.1 + (Number(controls.current.right) - Number(controls.current.left)) * .1 : -.18; }
    if (penguin.current) penguin.current.position.set(-1.65 + walk.current.distance * .8, .4 + walk.current.y, 1.65);
    if (float.current) {
      float.current.position.y = -.01 + (animate ? Math.sin(performance.now() * .002) * .04 : 0);
      float.current.rotation.z = state.fishing === 'bite' && animate ? Math.sin(performance.now() * .025) * .2 : 0;
    }
    if (rod.current) rod.current.rotation.z = state.fishing === 'cast' ? -.4 + Math.min(1, Math.max(0, castTime.current) * 2) * .7 : state.fishing === 'bite' ? .3 : -.4;
    const target = new THREE.Vector3(...focus[stop]);
    if (stop === 'sailing') target.set(boatX + 1.8, .55, boatZ * .4);
    if (reducedMotion || paused) cameraTarget.current.copy(target);
    else cameraTarget.current.lerp(target, 1 - Math.exp(-dt * 2.8));
    const t = cameraTarget.current;
    camera.position.set(t.x + 8.8, t.y + 10.5, t.z + 13.8);
    camera.lookAt(t.x, t.y, t.z);
    const ortho = camera as THREE.OrthographicCamera;
    // Keep the miniature large on wide screens and every required hotspot visible on narrow ones.
    ortho.zoom = size.height / (size.width / size.height < .8 ? 17.5 : 12.5);
    ortho.updateProjectionMatrix();
    telemetryTime.current += dt;
    if (telemetryTime.current > .2) {
      telemetryTime.current = 0;
      const points: Record<string, { x: number; y: number }> = {};
      scene.updateMatrixWorld();
      scene.traverse(object => {
        if (typeof object.userData.hotspot !== 'string') return;
        const p = new THREE.Vector3(); object.getWorldPosition(p); p.y += object.userData.centerY ?? .65; p.project(camera);
        if (p.z >= -1 && p.z <= 1) points[object.userData.hotspot] = { x: (p.x * .5 + .5) * size.width, y: (-p.y * .5 + .5) * size.height };
      });
      gl.domElement.dataset.hotspots = JSON.stringify(points);
      gl.domElement.dataset.renderCalls = String(gl.info.render.calls);
      gl.domElement.dataset.triangles = String(gl.info.render.triangles);
      gl.domElement.dataset.routeProgress = String(sail.current.progress);
      gl.domElement.dataset.routeX = String(sail.current.x);
      gl.domElement.dataset.penguinDistance = String(walk.current.distance);
      gl.domElement.dataset.webgl = 'ready';
    }
  });

  const crewVisible = state.stop === 'coast' || state.stop === 'crew';
  const worldBoat = ['coast', 'crew', 'penguin', 'sailing', 'fishing', 'notebook', 'garden', 'gifts'].includes(state.stop);
  return <>
    <color attach="background" args={['#bce6e9']} />
    <fog attach="fog" args={['#c6e8e3', 40, 105]} />
    <hemisphereLight args={['#fff6dc', '#8bbaa5', 2.5]} />
    <directionalLight position={[4, 18, 8]} intensity={3.1} color="#fff0cb" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-30} shadow-camera-right={45} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-normalBias={.035} shadow-bias={-.0001} />
    <Water animate={animate && active.current} />{['coast', 'crew', 'penguin', 'sailing'].includes(state.stop) && <Coast />}{['garden', 'gifts'].includes(state.stop) && <Garden animate={animate && active.current} />}<DistantWorld animate={animate && active.current} />
    {crewVisible && story.crew.map((member, i) => <Hotspot key={member.id} id={`crew-${i}`} position={[-2.3 + i * 1.65, .43, -.2 - i * .5]} enabled={state.stop === 'crew' && !state.crew.includes(member.id)} onClick={() => dispatch({ type: 'board', id: member.id })}>
      <BoardingTraveller model={member.model} index={i} aboard={state.crew.includes(member.id)} reduced={reducedMotion} paused={!!props.blocked} />
      {state.stop === 'crew' && !state.crew.includes(member.id) && <mesh position={[0, .02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.59, .65, 32]} /><meshBasicMaterial color="#fff6c9" transparent opacity={.95} side={THREE.DoubleSide} /></mesh>}
    </Hotspot>)}
    {worldBoat && <group ref={boat}><Boat animate={animate} yaw={0}>
      {!crewVisible && story.crew.filter(c => state.crew.includes(c.id)).map((member, i) => <group key={member.id} position={[i === 0 ? .55 : -.9, .6, i === 0 ? .17 : -.12]} rotation={[0, .25, 0]}>{member.model === 'blue' ? <BlueFriend scale={.74} /> : <StoneFriend scale={.72} />}</group>)}
      {state.penguin && <Penguin position={[-.08, .57, .28]} />}
      {state.fishing === 'caught' && <Hotspot id="notebook" position={[.5, .8, -.1]} onClick={() => { gl.domElement.dispatchEvent(new CustomEvent('world-notebook', { bubbles: true })); }}><ReeledBook open={state.stop === 'notebook'} reduced={reducedMotion} paused={!!props.blocked} /></Hotspot>}
      {state.stop === 'fishing' && <group ref={rod} position={[.6, .8, .4]}><Pole from={[0, 0, 0]} to={[1.5, 2.5, .1]} color="#b78c57" radius={.025} /><Pole from={[1.5, 2.5, .1]} to={[1.72, 2.6, .15]} color="#b78c57" radius={.018} /></group>}
    </Boat></group>}
    {state.stop === 'penguin' && !state.penguin && <group ref={penguin}><Penguin yaw={Math.PI / 2} /></group>}
    {state.stop === 'sailing' && sailGates.map((gate, i) => <group key={i} position={[6 + gate.progress * 19, 0, -gate.x]}>
      {[-1, 1].map(s => <group key={s} position={[0, 0, s * 1.3]}>
        <Ball at={[0, .03, 0]} scale={[.35, .07, .35]} color="#b6ede1" />
        <Ball at={[0, .18, 0]} scale={[.18, .23, .18]} color={i % 2 ? '#ffd783' : '#f69488'} />
        <Pole from={[0, .3, 0]} to={[0, 1.1, 0]} radius={.018} color="#c69b6c" />
        <mesh position={[.16, .94, 0]}><planeGeometry args={[.3, .2]} /><meshStandardMaterial color="#fff0c5" side={THREE.DoubleSide} /></mesh>
      </group>)}
    </group>)}
    {state.stop === 'fishing' && <>
      <Hotspot id={state.fishing === 'bite' ? 'reel' : 'cast'} position={[27.6, 0, 2]} onClick={() => dispatch({ type: state.fishing === 'bite' ? 'reel' : 'cast' })} enabled={state.fishing !== 'cast'}>
        <group ref={float}><Ball at={[0, .08, 0]} scale={[.14, .17, .14]} color="#f37e70" /><Ball at={[0, .2, 0]} scale={[.1, .09, .1]} color="#fff2d1" /><Pole from={[0, .2, 0]} to={[0, .55, 0]} color="#996f4b" radius={.015} /></group>
        <mesh position={[0, -.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.45, .48, 40]} /><meshBasicMaterial color="#e5fff0" side={THREE.DoubleSide} /></mesh>
        {state.fishing === 'bite' && <mesh position={[0, 1.0, 0]}><octahedronGeometry args={[.16]} /><meshStandardMaterial color="#ffdc83" emissive="#dc9134" emissiveIntensity={.25} /></mesh>}
      </Hotspot>
      {state.fishing !== 'idle' && <Pole from={[27.12, 2.75, .95]} to={[27.6, .2, 2]} color="#faf0ce" radius={.008} />}
    </>}
    {(state.stop === 'garden' || state.stop === 'gifts') && <>
      {story.motifs[1] && <WorldSign text={story.motifs[1]} position={[43, .9, 3.6]} />}
      {story.flowers.map((_, i) => <Hotspot key={i} id={`flower-${i}`} position={[38.5 + i * 2.0, .5, .7 - (i % 2) * 1.5]} onClick={() => dispatch({ type: 'bloom', index: i })} enabled={state.stop === 'garden'}><Flower size={1.4} color={['#eea1b9', '#b5a4e2', '#f9c183'][i]} open={state.flowers.includes(i)} /><mesh position={[0, -.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.48, 24]} /><meshStandardMaterial color="#83ae77" /></mesh></Hotspot>)}
      <Hotspot id="note" position={[44.5, 1.16, -1.8]} onClick={() => { dispatch({ type: 'open-note' }); gl.domElement.dispatchEvent(new CustomEvent('world-note', { bubbles: true })); }}>
        <Envelope />
      </Hotspot>
    </>}
    {['coast', 'crew', 'penguin'].includes(state.stop) && story.motifs[0] && <WorldSign text={story.motifs[0]} position={[-4.3, .6, 1.5]} />}
    {state.stop === 'gifts' && <group position={[39.5, 1.5, -4]}>
      <Hotspot id="gift" position={[-.55, 0, 0]} onClick={() => { gl.domElement.dispatchEvent(new CustomEvent('world-gift', { bubbles: true })); }}><Envelope color="#f5dfab" /><Flower position={[0, .1, -.08]} size={.42} color="#eca5b4" /></Hotspot>
      <Hotspot id="parcel" position={[.6, .15, 0]} onClick={() => { gl.domElement.dispatchEvent(new CustomEvent('world-parcel', { bubbles: true })); }}><Box at={[0, 0, 0]} scale={[.7, .5, .58]} color="#bcd0ba" /><Box at={[0, .26, 0]} scale={[.75, .07, .63]} color="#d0debc" /><Box at={[0, .3, 0]} scale={[.09, .025, .65]} color="#f8edcc" /><Box at={[0, .3, 0]} scale={[.76, .025, .09]} color="#f8edcc" /><mesh position={[0, .38, 0]} rotation={[0, 0, .2]}><torusGeometry args={[.11, .022, 6, 14]} /><meshStandardMaterial color="#f8edcc" /></mesh></Hotspot>
    </group>}
  </>;
}
function ReeledBook({ open, reduced, paused }: { open: boolean; reduced: boolean; paused: boolean }) {
  const ref = useRef<THREE.Group>(null), progress = useRef(reduced ? 1 : 0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (reduced) progress.current = 1;
    else if (!paused) progress.current = Math.min(1, progress.current + Math.min(dt, .05) * .7);
    const p = progress.current, q = p * p * (3 - 2 * p);
    ref.current.position.set(2.1 * (1 - q), -1 * (1 - q) + Math.sin(p * Math.PI) * 1.7, 1.3 * (1 - q));
    ref.current.rotation.set(.25 * (1 - p), -.4 * (1 - p), -.3 * (1 - p));
    ref.current.scale.setScalar(.7 + q * .3);
  });
  return <group ref={ref}><Book open={open} /></group>;
}
function BoardingTraveller({ model, index, aboard, reduced, paused }: { model: 'blue' | 'stone'; index: number; aboard: boolean; reduced: boolean; paused: boolean }) {
  const ref = useRef<THREE.Group>(null), progress = useRef(aboard ? 1 : 0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (reduced) progress.current = aboard ? 1 : 0;
    else if (!paused) progress.current = aboard ? Math.min(1, progress.current + Math.min(dt, .05) * .55) : 0;
    const p = Math.max(0, progress.current), originX = -2.3 + index * 1.65, originZ = -.2 - index * .5;
    const targetX = index === 0 ? 5.25 : 3.75, targetZ = 1.7;
    const q = p * p * (3 - 2 * p);
    ref.current.position.set((targetX - originX) * q, .18 * q + (!reduced && p > 0 && p < 1 ? Math.abs(Math.sin(p * 35)) * .12 : 0), (targetZ - originZ) * Math.min(1, q * 2));
    ref.current.scale.setScalar(1.2 - q * .46);
    ref.current.rotation.z = !reduced && p > 0 && p < 1 ? Math.sin(p * 35) * .08 : 0;
  });
  return <group ref={ref}>{model === 'blue' ? <BlueFriend /> : <StoneFriend />}</group>;
}
function WorldSign({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 150;
    const context = canvas.getContext('2d')!; context.fillStyle = '#fff2d1'; context.fillRect(0, 0, 600, 150);
    context.fillStyle = '#365c63'; context.font = '650 48px Nunito, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 300, 77, 570);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={position} rotation={[0, .25, 0]}><Pole from={[0, -.5, 0]} to={[0, .6, 0]} color="#b18b62" radius={.04} /><mesh position={[0, .6, .03]}><planeGeometry args={[2, .5]} /><meshStandardMaterial map={texture} side={THREE.DoubleSide} /></mesh></group>;
}
function Envelope({ color = '#fff2d3' }: { color?: string }) {
  return <group rotation={[-.1, .15, 0]}><Box at={[0, 0, 0]} scale={[.9, .04, .6]} color={color} /><Pole from={[-.45, .03, -.3]} to={[0, .04, .06]} color="#c8b98c" radius={.006} /><Pole from={[.45, .03, -.3]} to={[0, .04, .06]} color="#c8b98c" radius={.006} /><Ball at={[0, .05, .06]} scale={[.075, .02, .075]} color="#e59798" /></group>;
}

export default function World(props: WorldProps) {
  return <WorldBoundary onFailure={props.onFailure}><Canvas frameloop={props.paused && props.blocked ? 'demand' : 'always'} orthographic shadows dpr={[1, 1.5]} camera={{ position: [6, 11, 14], near: .1, far: 150, zoom: 50 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} fallback={null} onCreated={({ gl }) => { gl.setClearColor('#bce6e9'); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; gl.shadowMap.type = THREE.PCFSoftShadowMap; }} style={{ width: '100%', height: '100%', touchAction: 'none' }}><Suspense fallback={null}><Engine {...props} /></Suspense></Canvas></WorldBoundary>;
}
