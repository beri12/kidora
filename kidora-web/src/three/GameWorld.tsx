'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { WorldTheme } from '@/lib/games/worlds';
import type { Quality } from '@/lib/games/settings';

/** Hold-to-walk input, written by keyboard and on-screen buttons, read every frame. */
export interface WalkInput { forward: boolean; back: boolean }

interface Props {
  theme: WorldTheme;
  gates: number;
  /** How many gates are open. The player can walk up to the next closed one. */
  cleared: number;
  /** Frozen while a challenge or the pause menu is open. */
  frozen: boolean;
  input: MutableRefObject<WalkInput>;
  quality: Quality;
  reducedMotion: boolean;
  avatarColor: string;
  onReachGate: (index: number) => void;
  onReachChest: () => void;
  /** 0..1 along the path, reported for the HUD progress bar. */
  onProgress?: (t: number) => void;
}

const SPEED = 0.07; // path fraction per second
const GATE_STOP = 0.012; // how close to a closed gate the player stops

/** Deterministic pseudo-random, so the scenery is the same every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function usePath() {
  return useMemo(() => {
    const pts = [
      [0, 0, 0], [6, 0, -8], [-4, 0, -18], [6, 0, -28], [-3, 0, -38], [5, 0, -48], [0, 0, -58],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }, []);
}

export function GameWorld(props: Props) {
  const dpr: [number, number] = props.quality === 'LOW' ? [1, 1] : props.quality === 'MEDIUM' ? [1, 1.5] : [1, 2];
  return (
    <Canvas
      dpr={dpr}
      shadows={props.quality === 'HIGH'}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 5, 8] }}
      gl={{ antialias: props.quality !== 'LOW', alpha: true, powerPreference: 'high-performance' }}
      style={{ background: `linear-gradient(${props.theme.sky[0]}, ${props.theme.sky[1]})` }}
      aria-hidden
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({ theme, gates, cleared, frozen, input, quality, reducedMotion, avatarColor, onReachGate, onReachChest, onProgress }: Props) {
  const path = usePath();
  const gateTs = useMemo(() => Array.from({ length: gates }, (_, i) => (i + 1) / (gates + 1)), [gates]);
  const t = useRef(0.005);
  const player = useRef<THREE.Group>(null);
  const reported = useRef<{ gate: number; chest: boolean; progress: number }>({ gate: -1, chest: false, progress: -1 });
  const { camera } = useThree();

  // Latest callbacks without re-subscribing the frame loop.
  const cb = useRef({ onReachGate, onReachChest, onProgress, cleared, frozen });
  cb.current = { onReachGate, onReachChest, onProgress, cleared, frozen };

  // A gate that just opened may be reported again next time it is reached.
  useEffect(() => { reported.current.gate = -1; }, [cleared]);

  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), tan: new THREE.Vector3(), cam: new THREE.Vector3(), look: new THREE.Vector3() }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { cleared: open, frozen: stop } = cb.current;
    const limit = open < gateTs.length ? gateTs[open] - GATE_STOP : 1;
    const dir = stop ? 0 : (input.current.forward ? 1 : 0) - (input.current.back ? 1 : 0);
    t.current = Math.min(limit, Math.max(0.005, t.current + dir * SPEED * dt));

    if (!stop && open < gateTs.length && t.current >= limit - 0.0005 && reported.current.gate !== open) {
      reported.current.gate = open;
      cb.current.onReachGate(open);
    }
    if (!stop && open >= gateTs.length && t.current >= 0.985 && !reported.current.chest) {
      reported.current.chest = true;
      cb.current.onReachChest();
    }
    const pct = Math.round(t.current * 100);
    if (pct !== reported.current.progress) { reported.current.progress = pct; cb.current.onProgress?.(t.current); }

    path.getPointAt(t.current, tmp.pos);
    path.getTangentAt(t.current, tmp.tan);
    if (player.current) {
      player.current.position.copy(tmp.pos);
      player.current.rotation.y = Math.atan2(tmp.tan.x, tmp.tan.z);
      const walking = dir !== 0 && !reducedMotion;
      player.current.position.y = walking ? Math.abs(Math.sin(performance.now() / 120)) * 0.12 : 0;
    }
    // Third-person follow camera: behind and above, eased so it never jolts.
    tmp.cam.copy(tmp.pos).addScaledVector(tmp.tan, -7).add(new THREE.Vector3(0, 4.2, 0));
    camera.position.lerp(tmp.cam, reducedMotion ? 1 : 1 - Math.pow(0.001, dt));
    tmp.look.copy(tmp.pos).addScaledVector(tmp.tan, 3).add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(tmp.look);
  });

  return (
    <>
      <hemisphereLight args={[theme.sky[1], theme.ground, 0.9]} />
      <directionalLight position={[10, 18, 6]} intensity={1.3} castShadow={quality === 'HIGH'} shadow-mapSize={[1024, 1024]} />
      <Ground theme={theme} />
      <PathStrip path={path} color={theme.path} />
      <Scenery theme={theme} path={path} quality={quality} />
      {gateTs.map((gt, i) => (
        <Gate key={i} path={path} t={gt} open={i < cleared} index={i} accent={theme.accent} reducedMotion={reducedMotion} />
      ))}
      <Chest path={path} open={cleared >= gates} reducedMotion={reducedMotion} />
      <group ref={player}>
        <Avatar color={avatarColor} />
      </group>
    </>
  );
}

function Ground({ theme }: { theme: WorldTheme }) {
  return (
    <group>
      {theme.scenery === 'palms' && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.25, -30]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#38BDF8" />
        </mesh>
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -30]} receiveShadow>
        {theme.scenery === 'palms' ? <circleGeometry args={[42, 48]} /> : <planeGeometry args={[240, 240]} />}
        <meshStandardMaterial color={theme.ground} flatShading />
      </mesh>
    </group>
  );
}

function PathStrip({ path, color }: { path: THREE.CatmullRomCurve3; color: string }) {
  const geo = useMemo(() => {
    const g = new THREE.TubeGeometry(path, 160, 1.1, 6, false);
    g.scale(1, 0.06, 1);
    return g;
  }, [path]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position-y={0.02} receiveShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

/** Low-poly scenery as instanced meshes: one draw call per part, however many there are. */
function Scenery({ theme, path, quality }: { theme: WorldTheme; path: THREE.CatmullRomCurve3; quality: Quality }) {
  const count = quality === 'LOW' ? 18 : quality === 'MEDIUM' ? 36 : 64;
  const spots = useMemo(() => {
    const r = rng(theme.key.length * 97 + 13);
    const out: { x: number; z: number; s: number; rot: number }[] = [];
    const p = new THREE.Vector3();
    let guard = 0;
    while (out.length < count && guard++ < count * 20) {
      const x = (r() - 0.5) * 60;
      const z = 6 - r() * 72;
      // Keep the path clear.
      let near = false;
      for (let i = 0; i <= 40; i++) { path.getPointAt(i / 40, p); if (Math.hypot(p.x - x, p.z - z) < 4) { near = true; break; } }
      if (!near) out.push({ x, z, s: 0.7 + r() * 0.8, rot: r() * Math.PI });
    }
    return out;
  }, [theme.key, path, count]);

  const parts = SCENERY_PARTS[theme.scenery];
  return (
    <>
      {parts.map((part, i) => (
        <Instanced key={`${theme.scenery}-${i}`} spots={spots} part={part} />
      ))}
    </>
  );
}

interface Part { geo: () => THREE.BufferGeometry; color: string; y: number; emissive?: string }

const SCENERY_PARTS: Record<WorldTheme['scenery'], Part[]> = {
  palms: [
    { geo: () => new THREE.CylinderGeometry(0.15, 0.25, 3, 6), color: '#92400E', y: 1.5 },
    { geo: () => new THREE.ConeGeometry(1.4, 1.2, 6), color: '#16A34A', y: 3.2 },
  ],
  trees: [
    { geo: () => new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6), color: '#78350F', y: 0.8 },
    { geo: () => new THREE.ConeGeometry(1.3, 3, 7), color: '#15803D', y: 2.9 },
  ],
  crystals: [
    { geo: () => new THREE.OctahedronGeometry(1, 0), color: '#C084FC', y: 1.1, emissive: '#6D28D9' },
  ],
  towers: [
    { geo: () => new THREE.BoxGeometry(1.6, 5, 1.6), color: '#64748B', y: 2.5, emissive: '#1E293B' },
    { geo: () => new THREE.BoxGeometry(1.7, 0.3, 1.7), color: '#22D3EE', y: 5.1, emissive: '#0891B2' },
  ],
  obelisks: [
    { geo: () => new THREE.BoxGeometry(0.8, 5, 0.5), color: '#A8A29E', y: 2.5 },
    { geo: () => new THREE.ConeGeometry(0.55, 0.9, 4), color: '#A8A29E', y: 5.45 },
  ],
};

function Instanced({ spots, part }: { spots: { x: number; z: number; s: number; rot: number }[]; part: Part }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => part.geo(), [part]);
  useEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    spots.forEach((s, i) => {
      q.setFromEuler(new THREE.Euler(0, s.rot, 0));
      m.compose(new THREE.Vector3(s.x, part.y * s.s, s.z), q, new THREE.Vector3(s.s, s.s, s.s));
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [spots, part]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, spots.length]} castShadow>
      <meshStandardMaterial color={part.color} emissive={part.emissive ?? '#000000'} emissiveIntensity={part.emissive ? 0.35 : 0} flatShading />
    </instancedMesh>
  );
}

function Gate({ path, t, open, index, accent, reducedMotion }: { path: THREE.CatmullRomCurve3; t: number; open: boolean; index: number; accent: string; reducedMotion: boolean }) {
  const barrier = useRef<THREE.Mesh>(null);
  const { pos, rot } = useMemo(() => {
    const p = path.getPointAt(t);
    const tan = path.getTangentAt(t);
    return { pos: p, rot: Math.atan2(tan.x, tan.z) };
  }, [path, t]);

  useFrame((_, dt) => {
    const b = barrier.current;
    if (!b) return;
    const target = open ? 0 : 1;
    const s = reducedMotion ? target : THREE.MathUtils.damp(b.scale.y, target, 6, dt);
    b.scale.y = Math.max(0.001, s);
    b.visible = s > 0.02;
    if (!open && !reducedMotion) (b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(performance.now() / 300) * 0.25;
  });

  const pillar = open ? '#22C55E' : accent;
  return (
    <group position={pos} rotation-y={rot}>
      <mesh position={[-1.6, 1.4, 0]} castShadow><boxGeometry args={[0.4, 2.8, 0.4]} /><meshStandardMaterial color={pillar} flatShading /></mesh>
      <mesh position={[1.6, 1.4, 0]} castShadow><boxGeometry args={[0.4, 2.8, 0.4]} /><meshStandardMaterial color={pillar} flatShading /></mesh>
      <mesh position={[0, 2.95, 0]} castShadow><boxGeometry args={[3.8, 0.35, 0.5]} /><meshStandardMaterial color={pillar} flatShading /></mesh>
      <mesh ref={barrier} position={[0, 1.35, 0]}>
        <planeGeometry args={[2.8, 2.7]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 3.7, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none rounded-full bg-white/90 px-2 py-0.5 font-display text-sm font-extrabold text-slate-800 shadow">
          {open ? '✓' : `🔒 ${index + 1}`}
        </div>
      </Html>
    </group>
  );
}

function Chest({ path, open, reducedMotion }: { path: THREE.CatmullRomCurve3; open: boolean; reducedMotion: boolean }) {
  const lid = useRef<THREE.Group>(null);
  const pos = useMemo(() => path.getPointAt(0.995), [path]);
  useFrame((_, dt) => {
    if (!lid.current) return;
    const target = open ? -1.1 : 0;
    lid.current.rotation.x = reducedMotion ? target : THREE.MathUtils.damp(lid.current.rotation.x, target, 4, dt);
  });
  return (
    <group position={[pos.x, 0, pos.z - 1.5]}>
      <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.8, 1, 1.2]} /><meshStandardMaterial color="#B45309" flatShading /></mesh>
      <group ref={lid} position={[0, 1, -0.6]}>
        <mesh position={[0, 0.2, 0.6]} castShadow><boxGeometry args={[1.85, 0.4, 1.25]} /><meshStandardMaterial color="#D97706" flatShading /></mesh>
      </group>
      <mesh position={[0, 0.6, 0.61]}><boxGeometry args={[0.3, 0.4, 0.05]} /><meshStandardMaterial color="#FACC15" emissive="#FACC15" emissiveIntensity={open ? 0.9 : 0.2} /></mesh>
    </group>
  );
}

/** A friendly low-poly explorer in the player's avatar colour. */
function Avatar({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow><capsuleGeometry args={[0.35, 0.6, 4, 8]} /><meshStandardMaterial color={color} flatShading /></mesh>
      <mesh position={[0, 1.55, 0]} castShadow><sphereGeometry args={[0.32, 12, 10]} /><meshStandardMaterial color="#8D5524" flatShading /></mesh>
      <mesh position={[0, 1.75, 0.02]}><sphereGeometry args={[0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1F2937" flatShading /></mesh>
      <mesh position={[0, 0.85, -0.38]} castShadow><boxGeometry args={[0.45, 0.5, 0.2]} /><meshStandardMaterial color="#F59E0B" flatShading /></mesh>
      <mesh position={[0.11, 1.6, 0.28]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[-0.11, 1.6, 0.28]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#111827" /></mesh>
    </group>
  );
}
