import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Story } from '../types';
import { Avatar, AVATAR_IDS, type AvatarId } from './Avatars';
import { Landscape, OpeningClouds } from './Landscape';
import { NoteFlower } from './Discoveries';
import { Celebration } from './Celebration';
import { Boat, Book, Ball, Box, Flower, Pole } from '../world/models';
import { FLOWERS, GIFT, distance, duration, lightAt, lerp, smooth, spawn, walk, type Phase, type Walker } from './logic';

export interface Input { keys: Set<string>; yaw: number; pitch: number; press: number }
export interface Status { action: string; fish: string; reel: number; progress: number; night: number; x: number; z: number; yaw: number; time: number }
export interface GameProps {
  phase: Phase; avatar: AvatarId; story: Story; flowers: number[];
  input: React.MutableRefObject<Input>; blocked: boolean; motion: boolean; reduced: boolean;
  skip: number; assist: boolean; onPhase: (phase: Phase) => void; onStatus: (status: Status) => void;
  onInteract: (action: string) => void; onFailure: () => void;
  onAvatar:(id:AvatarId)=>void;
}
const clamp = THREE.MathUtils.clamp;
function Engine(p: GameProps) {
  const { camera, gl, scene } = useThree();
  const walker = useRef<Walker>({ ...spawn }), boatPosition = useRef(new THREE.Vector3(5,.1,-4));
  const player = useRef<THREE.Group>(null), boat = useRef<THREE.Group>(null), sleeper = useRef<THREE.Group>(null), blanket = useRef<THREE.Mesh>(null);
  const lamp = useRef<THREE.PointLight>(null), sun = useRef<THREE.DirectionalLight>(null), sky = useRef<THREE.HemisphereLight>(null);
  const book = useRef<THREE.Group>(null), bobber = useRef<THREE.Group>(null), rod = useRef<THREE.Group>(null), wake = useRef<THREE.Group>(null);
  const time = useRef(0), report = useRef(0), done = useRef(false), previous = useRef(p.phase), seenPress = useRef(0);
  const fish = useRef('idle'), fishTime = useRef(0), reel = useRef(0), sleep = useRef(0);
  const cameraTarget = useRef(new THREE.Vector3(-5.5,29,-15)), cameraPosition = useRef(new THREE.Vector3(-5.5,40,22));
  const active = useRef(true), phaseStartPosition = useRef(new THREE.Vector3());
  const ray=useMemo(()=>new THREE.Raycaster(),[]);
  const [walking, setWalking] = useState(false), [night, setNight] = useState(0);
  const blanketGeometry=useMemo(()=>{const g=new THREE.PlaneGeometry(1.15,.72,16,12);const a=g.getAttribute('position');for(let i=0;i<a.count;i++)a.setZ(i,.04-.17*(Math.abs(a.getY(i))/.36)**2);g.computeVertexNormals();return g},[]);
  useEffect(()=>()=>blanketGeometry.dispose(),[blanketGeometry]);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); p.onFailure(); };
    const visibility = () => { active.current = !document.hidden; };
    gl.domElement.addEventListener('webglcontextlost', lost); document.addEventListener('visibilitychange',visibility);
    return () => { gl.domElement.removeEventListener('webglcontextlost',lost); document.removeEventListener('visibilitychange',visibility); };
  },[gl]);
  useEffect(() => {
    if(previous.current===p.phase)return;
    time.current=0; done.current=false; seenPress.current=p.input.current.press;
    phaseStartPosition.current.set(walker.current.x,walker.current.y,walker.current.z);
    if(p.phase==='welcome'||p.phase==='choose'){walker.current={...spawn};boatPosition.current.set(5,.1,-4);fish.current='idle';reel.current=0;sleep.current=0;}
    if(p.phase==='coast'){p.input.current.yaw=0;p.input.current.pitch=.05;}
    if(p.phase==='sail')p.input.current.yaw=-.9;
    if(p.phase==='fish'){fish.current='idle';fishTime.current=0;reel.current=0;}
    if(p.phase==='garden'){walker.current={...spawn,x:43,z:-4,facing:Math.PI/2};p.input.current.yaw=-Math.PI/2;p.input.current.pitch=.05;}
    previous.current=p.phase;
  },[p.phase]);
  useEffect(()=>{if(duration[p.phase]&&p.skip>0)time.current=duration[p.phase]!;},[p.skip]);
  useFrame((_,rawDelta)=>{
    const dt = !p.blocked&&active.current ? Math.min(rawDelta,.05):0;
    time.current+=dt;
    const t=time.current,phase=p.phase;
    let keys=p.input.current.keys;
    let autoHit=false;
    if(p.assist&&(phase==='coast'||phase==='garden')){
      const goal=phase==='coast'?[3.8,-4]:FLOWERS.find((_,i)=>!p.flowers.includes(i))??GIFT;
      const dx=goal[0]-walker.current.x,dz=goal[1]-walker.current.z;
      if(Math.hypot(dx,dz)>1.25){p.input.current.yaw=Math.atan2(-dx,-dz);keys=new Set(['KeyW']);}else{keys=new Set();autoHit=true;}
    }
    let action='',moving=false;
    const pressed=p.input.current.press!==seenPress.current;
    seenPress.current=p.input.current.press;
    if(phase==='coast'||phase==='garden'){
      walker.current=walk(walker.current,dt?keys:new Set(),p.input.current.yaw,dt,phase==='garden');
      moving=walker.current.walking;
      if(phase==='coast'&&distance([walker.current.x,walker.current.z],[3.8,-4])<2.1)action='board';
      if(phase==='garden'){
        const i=FLOWERS.findIndex(point=>distance([walker.current.x,walker.current.z],point)<2);
        if(i>=0)action=`${p.flowers.includes(i)?'note':'flower'}-${i}`;
        else if(distance([walker.current.x,walker.current.z],GIFT)<2.3) action=p.flowers.length===3?'gift':'flowers-needed';
      }
      if((pressed||autoHit)&&action&&action!=='flowers-needed'&&dt>0)p.onInteract(action);
    }
    if(phase==='board'){
      const q=smooth(t/2); walker.current.x=lerp(phaseStartPosition.current.x,5.3,q);walker.current.z=lerp(phaseStartPosition.current.z,-3.7,q);walker.current.y=Math.sin(q*Math.PI)*1.1+q*.7;
    }
    if(phase==='sail'){
      const speed=keys.has('KeyW')?3.1:keys.has('KeyS')?.55:1.6;
      boatPosition.current.x=Math.min(22,boatPosition.current.x+dt*speed);
      boatPosition.current.z=clamp(boatPosition.current.z+(Number(keys.has('KeyD'))-Number(keys.has('KeyA')))*dt*2.2,-7,-1);
      if(boatPosition.current.x>=22&&!done.current){done.current=true;p.onPhase('fish');}
    }
    if(phase==='fish'){
      action=fish.current==='idle'?'cast':fish.current==='bite'?'reel':'';
      if(pressed&&fish.current==='idle'){fish.current='waiting';fishTime.current=0;}
      else if(pressed&&fish.current==='bite')reel.current=Math.min(1,reel.current+.24);
      if(fish.current==='waiting'){fishTime.current+=dt;if(fishTime.current>1.35)fish.current='bite';}
      if(fish.current==='bite'&&keys.has('KeyE'))reel.current=Math.min(1,reel.current+dt*.65);
      if(reel.current>=1&&!done.current){done.current=true;p.onPhase('haul');}
    }
    if(phase==='notebook'){action='book';if(pressed)p.onInteract('book');}
    const dark=lightAt(phase,t);
    sleep.current=phase==='bedtime'?smooth(t/3.5):phase==='night'?1-smooth((t-6.3)/1.7):0;
    if(phase==='night') boatPosition.current.set(lerp(22,38,smooth(t/8)),.1,lerp(boatPosition.current.z,-4,Math.min(1,dt*2)));
    if(phase==='arrival'){
      boatPosition.current.set(38,.1,-4);
      const q=smooth(t/4);walker.current.x=lerp(38.5,43,q);walker.current.z=-4;walker.current.y=Math.sin(q*Math.PI)*1.4+lerp(.7,0,q);moving=q>.1&&q<.95;
    }
    if(duration[phase]&&(p.reduced||t>=duration[phase]!)&&!done.current){
      done.current=true;
      const next:Partial<Record<Phase,Phase>>={descent:'choose',board:'sail',haul:'notebook',bedtime:'night',night:'arrival',arrival:'garden'};
      p.onPhase(next[phase]!);
    }
    if(player.current){
      player.current.visible=['coast','garden','gifts','board','arrival'].includes(phase);
      player.current.position.set(walker.current.x,walker.current.y,walker.current.z);
      player.current.rotation.y=phase==='board'||phase==='arrival'?Math.PI/2:walker.current.facing;
    }
    if(boat.current){boat.current.position.copy(boatPosition.current);boat.current.rotation.y=phase==='sail'?(Number(keys.has('KeyA'))-Number(keys.has('KeyD')))*.08:0;
      const sail=boat.current.getObjectByName('red-sail');if(sail){sail.scale.y=1-sleep.current*.98;sail.position.y=1.29-sleep.current*.2;}}
    if(sleeper.current){sleeper.current.rotation.z=-Math.PI/2*sleep.current;sleeper.current.position.y=.65+sleep.current*.03;}
    if(blanket.current){blanket.current.visible=sleep.current>.01;blanket.current.scale.setScalar(Math.max(.01,sleep.current));}
    if(lamp.current)lamp.current.intensity=dark*5;
    if(sun.current){sun.current.intensity=lerp(2.6,.12,dark);sun.current.color.set(dark>.35?'#bdcce8':'#fff0ce');}
    if(sky.current)sky.current.intensity=lerp(2.1,.45,dark);
    if(bobber.current){bobber.current.visible=phase==='fish'&&fish.current!=='idle';bobber.current.position.set(boatPosition.current.x+2.6,-.02+Math.sin(t*(fish.current==='bite'?12:2))*.05,-2);}
    if(rod.current)rod.current.rotation.z=fish.current==='bite'?Math.sin(t*8)*.04-.15:-.3;
    if(book.current){book.current.visible=['haul','notebook','bedtime'].includes(phase);const q=phase==='haul'?smooth(t/1.8):1;book.current.position.set(boatPosition.current.x+lerp(2.6,.5,q),lerp(-.2,.95,q)+Math.sin(q*Math.PI)*1.8,lerp(-2,boatPosition.current.z+.2,q));book.current.rotation.z=(1-q)*-.3;}
    if(wake.current){wake.current.visible=['sail','night'].includes(phase);wake.current.position.copy(boatPosition.current);wake.current.children.forEach((object,i)=>{const q=((t*.55+i/10)%1);object.position.set(-.7-q*3,-.13,Math.sin(i*12)*(.4+q*.6));object.scale.set(.2+q*.5,.025,.06+q*.08);const m=(object as THREE.Mesh).material as THREE.MeshBasicMaterial;m.opacity=(1-q)*.7;});}
    // Camera mode changes follow a continuous position/target blend instead of replacing the world.
    const land=['coast','garden','gifts'].includes(phase),selected=phase==='choose';
    let target=new THREE.Vector3(walker.current.x,walker.current.y+1,walker.current.z),desired=new THREE.Vector3();
    if(phase==='welcome'||phase==='descent'){
      const q=phase==='welcome'?0:smooth(t/5.5);
      target.set(-5.5,lerp(29,1,q),lerp(-15,2,q));
      desired.set(-5.5,lerp(40,3.6,q),lerp(22,12,q));
    }
    else if(phase==='celebration'){target.set(60,1.3,-6);desired.set(60,4.7,3);}
    else if(selected){target.set(-5.5,1,2);desired.set(-5.5,3.6,12);}
    else if(land){const yaw=p.input.current.yaw,pitch=p.input.current.pitch;desired.set(target.x+Math.sin(yaw)*5.2*Math.cos(pitch),target.y+1.5+Math.sin(pitch)*4,target.z+Math.cos(yaw)*5.2*Math.cos(pitch));}
    else{
      target.copy(boatPosition.current).add(new THREE.Vector3(.3,1,0));
      let yaw=p.input.current.yaw,range=7.5,height=3.5;
      if(phase==='board'){const q=smooth(t/2);target.lerp(new THREE.Vector3(walker.current.x,.8,walker.current.z),1-q);yaw=lerp(0,-.9,q);}
      if(phase==='haul'||phase==='notebook'){range=5.8;height=3;}
      if(phase==='bedtime'){yaw=lerp(-.8,.9,smooth(t/3.5));range=5.8;height=2.1;}
      if(phase==='night'){const dawn=smooth((t-4.4)/3.6);yaw=lerp(.9,-1.4,dawn);range=lerp(5.8,11,dawn);height=lerp(2.1,5,dawn);}
      if(phase==='arrival'){const q=smooth(t/4);target.lerp(new THREE.Vector3(walker.current.x,1,walker.current.z),q);yaw=lerp(-1.2,-Math.PI/2,q);range=lerp(9,5.2,q);height=lerp(4,1.7,q);}
      desired.set(target.x+Math.sin(yaw)*range,target.y+height,target.z+Math.cos(yaw)*range);
    }
    const blend=p.reduced?1:1-Math.exp(-Math.min(rawDelta,.05)*5.5);
    cameraPosition.current.lerp(desired,blend);cameraTarget.current.lerp(target,blend);camera.position.copy(cameraPosition.current);camera.lookAt(cameraTarget.current);
    if(land){
      const offset=camera.position.clone().sub(cameraTarget.current),length=offset.length();
      ray.set(cameraTarget.current,offset.normalize());ray.far=length;
      // Decorative meadow instances never obstruct the camera. Limit expensive
      // raycasts to buildings/trees and the boat, rather than every flower.
      const blockers:THREE.Object3D[]=[];
      scene.traverse(object=>{if(object.userData.cameraBlocker)blockers.push(object)});
      if(boat.current)blockers.push(boat.current);
      const hits=ray.intersectObjects(blockers,true).filter(hit=>{
        let object:THREE.Object3D|null=hit.object;
        while(object){if(object===player.current||object.userData.actor)return false;object=object.parent;}
        return hit.distance>.6;
      });
      if(hits.length)camera.position.copy(cameraTarget.current).addScaledVector(offset,Math.max(.65,hits[0].distance-.3));
      camera.lookAt(cameraTarget.current);
    }
    if(moving!==walking)setWalking(moving);
    report.current+=rawDelta;
    if(report.current>.1){report.current=0;if(Math.abs(night-dark)>.015)setNight(dark);
      p.onStatus({action,fish:fish.current,reel:reel.current,progress:clamp((boatPosition.current.x-5)/17,0,1),night:dark,x:walker.current.x,z:walker.current.z,yaw:p.input.current.yaw,time:t});
      Object.assign(gl.domElement.dataset,{phase,playerX:String(walker.current.x),playerZ:String(walker.current.z),yaw:String(p.input.current.yaw),boatX:String(boatPosition.current.x),night:String(dark),bouquet:String(p.flowers.length),cameraY:String(camera.position.y),cameraMode:land?'follow':selected?'selection':phase==='welcome'?'clouds':phase==='celebration'?'celebration':['sail','fish'].includes(phase)?'boat':'cinematic',phaseTime:String(t),renderCalls:String(gl.info.render.calls),triangles:String(gl.info.render.triangles)});
    }
  });
  const afloat=!['welcome','descent','choose','coast','board','arrival','garden','gifts','celebration'].includes(p.phase);
  const sleepPhase=['bedtime','night'].includes(p.phase);
  return <>
    <hemisphereLight ref={sky} args={['#fff4db','#7eaa83',2.1]}/>
    <directionalLight ref={sun} position={[20,32,18]} intensity={2.6} color="#fff0ce" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-38} shadow-camera-right={40} shadow-camera-top={28} shadow-camera-bottom={-30} shadow-normalBias={.04}/>
    <Landscape night={night} motion={p.motion} selection={['welcome','descent','choose'].includes(p.phase)} celebration={p.phase==='celebration'}/>
    {(p.phase==='welcome'||p.phase==='descent')&&<OpeningClouds motion={p.motion}/>}
    <group ref={player}><Avatar id={p.avatar} walking={walking} bouquet={p.flowers.length} motion={p.motion}/></group>
    {(p.phase==='choose'||p.phase==='descent')&&<SelectionLineup avatar={p.avatar} motion={p.motion} select={p.onAvatar}/>}
    {p.phase==='celebration'&&<group position={[60,0,-6]}><Celebration motion={p.motion}/></group>}
    <group ref={boat}><Boat animate={p.motion}>
      {afloat&&p.avatar!=='blue'&&<group position={[-.8,.65,-.12]} rotation={[0,.6,0]}><Avatar id={p.avatar} scale={.7} motion={p.motion} sleeping={sleepPhase}/></group>}
      {(afloat||((p.phase==='coast'||p.phase==='board')&&p.avatar!=='blue'))&&<group ref={sleeper} position={[.4,.65,0]}><Avatar id="blue" scale={.67} motion={p.motion} sleeping={sleepPhase}/></group>}
      {afloat&&p.avatar!=='stone'&&<group position={[-.8,.65,.3]}><Avatar id="stone" scale={.55} motion={p.motion}/></group>}
      {afloat&&p.avatar!=='penguin'&&<group position={[-.1,.65,.4]}><Avatar id="penguin" scale={.5} motion={p.motion}/></group>}
      <mesh ref={blanket} geometry={blanketGeometry} position={[.85,.87,0]} rotation={[-Math.PI/2,0,0]}><meshStandardMaterial color="#e85e5c" side={THREE.DoubleSide} roughness={.95}/></mesh>
      <group position={[-1,.75,-.35]}><Ball at={[0,.1,0]} scale={[.09,.13,.09]} color="#ffdda1"/><pointLight ref={lamp} color="#ffc578" intensity={0} distance={6}/></group>
      {p.phase==='fish'&&<group ref={rod} position={[.7,.9,.2]}><Pole from={[0,0,0]} to={[1.5,1.7,.9]} radius={.025} color="#a27b54"/></group>}
    </Boat></group>
    <group ref={wake}>{Array.from({length:10},(_,i)=><mesh key={i}><sphereGeometry args={[1,8,4]}/><meshBasicMaterial color="#e5fff3" transparent opacity={.5}/></mesh>)}</group>
    <group ref={bobber}><Ball at={[0,.1,0]} scale={[.12,.2,.12]} color="#ef8876"/><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.4,.43,32]}/><meshBasicMaterial color="#fff4d5" side={THREE.DoubleSide}/></mesh></group>
    {p.phase==='fish'&&fish.current!=='idle'&&<Pole from={[boatPosition.current.x+2.2,2.6,boatPosition.current.z+1.1]} to={[boatPosition.current.x+2.6,0,-2]} color="#fff1ca" radius={.008}/>}
    <group ref={book}><Book open={p.phase==='notebook'}/></group>
    {FLOWERS.map(([x,z],i)=><group key={i} position={[x,0,z]} userData={{actor:true}}><NoteFlower index={i} picked={p.flowers.includes(i)} active={p.phase==='garden'&&distance([walker.current.x,walker.current.z],[x,z])<3} motion={p.motion}/></group>)}
    {p.phase!=='celebration'&&<group position={[60,.1,-6]}><Box at={[0,.43,0]} scale={[1,.8,.8]} color="#a9c4a8"/><Box at={[0,.86,0]} scale={[1.08,.14,.88]} color="#d1dfbc"/><Box at={[0,.95,0]} scale={[1.1,.02,.12]} color="#fff0c6"/><Box at={[0,.95,0]} scale={[.12,.02,.9]} color="#fff0c6"/><mesh position={[0,1.06,0]}><torusGeometry args={[.17,.035,8,20]}/><meshStandardMaterial color="#fff0c6"/></mesh></group>}
    {(p.phase==='garden'||p.phase==='gifts')&&<Companions walker={walker} avatar={p.avatar} motion={p.motion} walking={walking}/>}
    {p.phase==='coast'&&<group position={[-1.5,0,-2.6]} userData={{actor:true}}>{p.avatar!=='stone'&&<Avatar id="stone" scale={.8} motion={p.motion}/>}{p.avatar!=='penguin'&&<group position={[-1.4,0,.3]}><Avatar id="penguin" scale={.65} motion={p.motion}/></group>}</group>}
  </>;
}
function SelectionLineup({avatar,motion,select}:{avatar:AvatarId;motion:boolean;select:(id:AvatarId)=>void}){
  const models=useRef<(THREE.Group|null)[]>([]);
  useFrame(({clock},dt)=>models.current.forEach((model,i)=>{
    if(!model)return;
    const chosen=AVATAR_IDS[i]===avatar,target=chosen?1.35:1.02;
    model.scale.lerp(new THREE.Vector3(target,target,target),motion?1-Math.exp(-dt*8):1);
    model.position.y=motion&&chosen?Math.sin(clock.elapsedTime*1.5)*.035:0;
    model.rotation.y=motion&&chosen?Math.sin(clock.elapsedTime*.8)*.1:0;
  }));
  return <group userData={{actor:true}}>{AVATAR_IDS.map((id,i)=><group key={id} position={[-10+i*2.25,0,2]} onClick={event=>{event.stopPropagation();select(id)}} onPointerOver={()=>{document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
    <group ref={node=>{models.current[i]=node}}><Avatar id={id} motion={motion}/></group>
    <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.72,avatar===id ? .85 : .76,48]}/><meshBasicMaterial color={avatar===id?'#fff4be':'#fff9df'} transparent opacity={avatar===id?1:.4} side={THREE.DoubleSide}/></mesh>
  </group>)}</group>;
}
function Companions({walker,avatar,motion,walking}:{walker:React.MutableRefObject<Walker>;avatar:AvatarId;motion:boolean;walking:boolean}){
  const a=useRef<THREE.Group>(null),b=useRef<THREE.Group>(null);
  useFrame((_,dt)=>{[a,b].forEach((ref,i)=>{if(ref.current){const w=walker.current;ref.current.position.lerp(new THREE.Vector3(w.x-1.2-i*.7,0,w.z+1+i*.5),1-Math.exp(-dt*3));ref.current.rotation.y=w.facing;}})});
  return <><group ref={a} userData={{actor:true}} position={[41,0,-3]}><Avatar id={avatar==='blue'?'stone':'blue'} scale={.8} walking={walking} motion={motion}/></group><group ref={b} userData={{actor:true}} position={[40.5,0,-2.5]}><Avatar id={avatar==='penguin'?'stone':'penguin'} scale={.65} walking={walking} motion={motion}/></group></>;
}
export default function GameWorld(props: GameProps){return <Canvas shadows dpr={[1,1.5]} camera={{fov:52,near:.1,far:300,position:[-7,3,11]}} gl={{antialias:true,alpha:false}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.1;gl.shadowMap.type=THREE.PCFSoftShadowMap;}}><Engine {...props}/></Canvas>}
