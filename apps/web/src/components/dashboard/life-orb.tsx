// @ts-nocheck – R3F JSX elements (group, mesh, instancedMesh, etc.) are registered
// at runtime by @react-three/fiber's reconciler and are not part of standard
// JSX.IntrinsicElements. Type augmentation via declare global doesn't reliably
// propagate in Next.js 15 monorepos, so we suppress type-checking for this
// exclusively-R3F file. All public interfaces (LifeOrbProps etc.) are still
// fully typed via the exported TypeScript interfaces below.
'use client';

import React, {
  useRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
  Suspense,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Dimension, ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';
import { dimensionColor } from '@life-design/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LifeOrbDimension {
  dimension: Dimension | string;
  score: number;   // 0-10
  trend: number;   // -1 to 1
}

export interface LifeOrbProps {
  /** Enhanced format with trend data */
  dimensions?: LifeOrbDimension[];
  /** Legacy format – backwards compat */
  scores?: Array<{ dimension: Dimension | string; score: number }>;
  overallScore: number; // 0-100
  mood?: number;        // 1-10
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  onDimensionClick?: (dimension: string) => void;
}

// ---------------------------------------------------------------------------
// Size config
// ---------------------------------------------------------------------------

const SIZE_CONFIG = {
  sm:   { px: 200, particleMult: 0.25, fov: 50, camZ: 3.5 },
  md:   { px: 350, particleMult: 0.5,  fov: 50, camZ: 3.2 },
  lg:   { px: 500, particleMult: 0.75, fov: 45, camZ: 3.0 },
  hero: { px: -1,  particleMult: 1.0,  fov: 45, camZ: 3.0 }, // -1 means 100vh
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise input into unified dimension array */
function normaliseDimensions(
  dimensions?: LifeOrbDimension[],
  scores?: Array<{ dimension: Dimension | string; score: number }>,
): LifeOrbDimension[] {
  if (dimensions && dimensions.length > 0) return dimensions;
  if (scores && scores.length > 0) {
    return scores.map((s) => ({ dimension: s.dimension, score: s.score, trend: 0 }));
  }
  // Fallback: all dimensions at 5
  return ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 5, trend: 0 }));
}

/** Deterministic pseudo-random – avoids re-renders changing positions */
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Star field component
// ---------------------------------------------------------------------------

function StarField({ count = 300 }: { count?: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (seededRandom(i * 3)     - 0.5) * 40;
      positions[i * 3 + 1] = (seededRandom(i * 3 + 1) - 0.5) * 40;
      positions[i * 3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 40 - 5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  return (
    // @ts-ignore – R3F JSX element
    <points geometry={geometry}>
      {/* @ts-ignore */}
      <pointsMaterial
        color="#ffffff"
        size={0.04}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Core glass sphere
// ---------------------------------------------------------------------------

interface CoreSphereProps {
  overallScore: number;
  mood: number;
}

function CoreSphere({ overallScore, mood }: CoreSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Mood shifts hue from indigo (5) toward violet (10) or cool blue (1)
  const baseColor = useMemo(() => {
    const t = (mood - 1) / 9; // 0-1
    return new THREE.Color().lerpColors(
      new THREE.Color('#312e81'), // cool indigo-dark (low mood)
      new THREE.Color('#7c3aed'), // violet (high mood)
      t,
    );
  }, [mood]);

  // Inner pulse: 1Hz gentle variation
  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const base = (overallScore / 100) * 1.2;
    lightRef.current.intensity = base + Math.sin(clock.getElapsedTime() * Math.PI * 2) * 0.15;
  });

  return (
    <group>
      {/* Inner glow point light */}
      {/* @ts-ignore */}
      <pointLight ref={lightRef} color="#818cf8" intensity={1} distance={4} />

      {/* Main glass sphere */}
      {/* @ts-ignore */}
      <mesh ref={meshRef}>
        {/* @ts-ignore */}
        <sphereGeometry args={[1, 128, 128]} />
        {/* @ts-ignore */}
        <meshStandardMaterial
          color={baseColor}
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.35}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Outer shimmer shell */}
      {/* @ts-ignore */}
      <mesh>
        {/* @ts-ignore */}
        <sphereGeometry args={[1.01, 64, 64]} />
        {/* @ts-ignore */}
        <meshStandardMaterial
          color="#a5b4fc"
          roughness={0.1}
          metalness={0.6}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Wireframe lattice */}
      {/* @ts-ignore */}
      <mesh>
        {/* @ts-ignore */}
        <sphereGeometry args={[1.02, 32, 32]} />
        {/* @ts-ignore */}
        <meshStandardMaterial
          color="#6366f1"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Dimension particle cluster (InstancedMesh)
// ---------------------------------------------------------------------------

interface DimensionClusterProps {
  dimension: string;
  score: number;        // 0-10
  trend: number;        // -1 to 1
  clusterIndex: number; // 0-7 — determines orbit angle
  totalClusters: number;
  particleMult: number; // size-dependent reduction
  isHovered: boolean;
  onHover: (dim: string | null) => void;
  onClick: (dim: string) => void;
}

const BASE_ORBIT_RADIUS = 1.6;
const BASE_PARTICLES_PER_POINT = 8; // score * multiplier

function DimensionCluster({
  dimension,
  score,
  trend,
  clusterIndex,
  totalClusters,
  particleMult,
  isHovered,
  onHover,
  onClick,
}: DimensionClusterProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hitRef  = useRef<THREE.Mesh>(null);

  const color = useMemo(() => new THREE.Color(dimensionColor(dimension)), [dimension]);

  // Number of particles per cluster proportional to score
  const particleCount = useMemo(
    () => Math.max(4, Math.floor(score * BASE_PARTICLES_PER_POINT * particleMult)),
    [score, particleMult],
  );

  // Orbit tilt per dimension so clusters don't overlap in a flat ring
  const orbitTilt = useMemo(() => {
    const phi = (clusterIndex / totalClusters) * Math.PI * 2;
    return { phi, theta: (clusterIndex / totalClusters) * Math.PI };
  }, [clusterIndex, totalClusters]);

  // Particle positions relative to cluster centre (in cluster-local space)
  const offsets = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    const spread = 0.18 + score * 0.012;
    for (let i = 0; i < particleCount; i++) {
      arr.push(
        new THREE.Vector3(
          (seededRandom(clusterIndex * 1000 + i * 3)     - 0.5) * spread * 2,
          (seededRandom(clusterIndex * 1000 + i * 3 + 1) - 0.5) * spread * 2,
          (seededRandom(clusterIndex * 1000 + i * 3 + 2) - 0.5) * spread * 2,
        ),
      );
    }
    return arr;
  }, [particleCount, clusterIndex, score]);

  // Base orbit speed: 0.1 RPM + trend influence
  const orbitSpeed = useMemo(() => {
    const base = 0.08 + score * 0.008;
    return base * (1 + trend * 0.4);
  }, [score, trend]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const angle = t * orbitSpeed + orbitTilt.phi;

    // Cluster centre on sphere surface
    const cx = Math.sin(orbitTilt.theta) * Math.cos(angle) * BASE_ORBIT_RADIUS;
    const cy = Math.cos(orbitTilt.theta) * BASE_ORBIT_RADIUS;
    const cz = Math.sin(orbitTilt.theta) * Math.sin(angle) * BASE_ORBIT_RADIUS;

    // Update hit-sphere position
    if (hitRef.current) {
      hitRef.current.position.set(cx, cy, cz);
    }

    const scale = isHovered ? 1.4 : 1.0;
    const particleSize = (0.025 + score * 0.004) * scale;

    offsets.forEach((offset, i) => {
      dummy.position.set(
        cx + offset.x,
        cy + offset.y,
        cz + offset.z,
      );
      dummy.scale.setScalar(particleSize);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Subtle emissive pulse
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = isHovered
      ? 0.8 + Math.sin(t * 6) * 0.2
      : 0.3 + Math.sin(t * 2 + clusterIndex) * 0.1;
  });

  const handlePointerOver = useCallback(() => onHover(dimension), [dimension, onHover]);
  const handlePointerOut  = useCallback(() => onHover(null),      [onHover]);
  const handleClick       = useCallback(() => onClick(dimension),  [dimension, onClick]);

  return (
    <group>
      {/* Invisible hit-test sphere */}
      {/* @ts-ignore */}
      <mesh
        ref={hitRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {/* @ts-ignore */}
        <sphereGeometry args={[0.22, 8, 8]} />
        {/* @ts-ignore */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* @ts-ignore */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        {/* @ts-ignore */}
        <sphereGeometry args={[1, 6, 6]} />
        {/* @ts-ignore */}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={isHovered ? 1.0 : 0.85}
        />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Connection lines between top-5 dimension pairs
// ---------------------------------------------------------------------------

// Compute the 5 strongest dimension pairs by combined score
function getTopPairs(dims: LifeOrbDimension[], n = 5) {
  const pairs: Array<{ a: number; b: number; strength: number }> = [];
  for (let i = 0; i < dims.length; i++) {
    for (let j = i + 1; j < dims.length; j++) {
      pairs.push({ a: i, b: j, strength: (dims[i]!.score + dims[j]!.score) / 20 });
    }
  }
  return pairs.sort((x, y) => y.strength - x.strength).slice(0, n);
}

function ConnectionLines({ dims }: { dims: LifeOrbDimension[] }) {
  const totalClusters = dims.length;
  const pairs = useMemo(() => getTopPairs(dims), [dims]);
  const lineRefs = useRef<Array<THREE.BufferGeometry | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    pairs.forEach((pair, idx) => {
      const geo = lineRefs.current[idx];
      if (!geo) return;

      const orbitA = pair.a;
      const orbitB = pair.b;

      const phiA   = (orbitA / totalClusters) * Math.PI * 2;
      const thetaA = (orbitA / totalClusters) * Math.PI;
      const phiB   = (orbitB / totalClusters) * Math.PI * 2;
      const thetaB = (orbitB / totalClusters) * Math.PI;

      const speedA = 0.08 + dims[orbitA]!.score * 0.008;
      const speedB = 0.08 + dims[orbitB]!.score * 0.008;

      const angleA = t * speedA + phiA;
      const angleB = t * speedB + phiB;

      const ax = Math.sin(thetaA) * Math.cos(angleA) * BASE_ORBIT_RADIUS;
      const ay = Math.cos(thetaA) * BASE_ORBIT_RADIUS;
      const az = Math.sin(thetaA) * Math.sin(angleA) * BASE_ORBIT_RADIUS;

      const bx = Math.sin(thetaB) * Math.cos(angleB) * BASE_ORBIT_RADIUS;
      const by = Math.cos(thetaB) * BASE_ORBIT_RADIUS;
      const bz = Math.sin(thetaB) * Math.sin(angleB) * BASE_ORBIT_RADIUS;

      const positions = new Float32Array([ax, ay, az, bx, by, bz]);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    });
  });

  return (
    <group>
      {pairs.map((pair, idx) => (
        <line key={idx}>
          {/* @ts-ignore */}
          <bufferGeometry ref={(el) => { lineRefs.current[idx] = el; }} />
          {/* @ts-ignore */}
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={pair.strength * 0.35}
            linewidth={1}
          />
        </line>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene root
// ---------------------------------------------------------------------------

interface OrbSceneProps {
  dims: LifeOrbDimension[];
  overallScore: number;
  mood: number;
  interactive: boolean;
  particleMult: number;
  onDimensionClick?: (dimension: string) => void;
  onHoveredDimension: (dim: string | null) => void;
}

function OrbScene({
  dims,
  overallScore,
  mood,
  interactive,
  particleMult,
  onDimensionClick,
  onHoveredDimension,
}: OrbSceneProps) {
  const { gl } = useThree();

  useEffect(() => {
    gl.setClearColor(new THREE.Color('#060614'), 1);
  }, [gl]);

  const handleClick = useCallback(
    (dim: string) => {
      if (onDimensionClick) onDimensionClick(dim);
    },
    [onDimensionClick],
  );

  return (
    <>
      {/* Lighting */}
      {/* @ts-ignore */}
      <ambientLight intensity={0.4} />
      {/* @ts-ignore */}
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#818cf8" />
      {/* @ts-ignore */}
      <pointLight position={[-6, -4, -6]} intensity={0.3} color="#4f46e5" />

      {/* Background stars */}
      <StarField count={particleMult > 0.5 ? 300 : 150} />

      {/* Core sphere */}
      <CoreSphere overallScore={overallScore} mood={mood} />

      {/* Dimension clusters */}
      {dims.map((d, i) => (
        <DimensionCluster
          key={String(d.dimension)}
          dimension={String(d.dimension)}
          score={d.score}
          trend={d.trend}
          clusterIndex={i}
          totalClusters={dims.length}
          particleMult={particleMult}
          isHovered={false}
          onHover={onHoveredDimension}
          onClick={handleClick}
        />
      ))}

      {/* Connection lines */}
      {particleMult >= 0.5 && <ConnectionLines dims={dims} />}

      {/* Orbit controls */}
      {interactive && (
        // @ts-ignore
        <OrbitControls
          enableZoom
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minDistance={2}
          maxDistance={6}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tooltip overlay (HTML layer)
// ---------------------------------------------------------------------------

interface TooltipProps {
  dimension: string | null;
  dims: LifeOrbDimension[];
}

function OrbTooltip({ dimension, dims }: TooltipProps) {
  if (!dimension) return null;
  const entry = dims.find((d) => String(d.dimension) === dimension);
  if (!entry) return null;

  const color = dimensionColor(dimension);
  const label = DIMENSION_LABELS[dimension as Dimension] ?? dimension;
  const trendLabel = entry.trend > 0.1 ? 'Trending up' : entry.trend < -0.1 ? 'Trending down' : 'Stable';

  return (
    <div
      className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20
                 px-4 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl
                 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150"
      style={{
        background: `${color}18`,
        borderColor: `${color}40`,
      }}
    >
      <div
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-xs font-black text-white tracking-wide">{label}</p>
        <p className="text-[11px] font-bold mt-0.5" style={{ color }}>
          {entry.score.toFixed(1)} / 10 &mdash; {trendLabel}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WebGL fallback
// ---------------------------------------------------------------------------

function OrbFallback({ overallScore }: { overallScore: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div
        className="rounded-full border-4 border-indigo-500/40 flex items-center justify-center"
        style={{
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, #4f46e520, #1e1b4b40)',
          boxShadow: '0 0 60px #6366f130',
        }}
      >
        <span className="text-3xl font-black text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          {Math.round(overallScore)}
        </span>
      </div>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
        WebGL unavailable
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function LifeOrb({
  dimensions,
  scores,
  overallScore,
  mood = 5,
  interactive = true,
  size = 'md',
  onDimensionClick,
}: LifeOrbProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);

  // Detect WebGL on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      setWebglAvailable(!!ctx);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  const dims = useMemo(
    () => normaliseDimensions(dimensions, scores),
    [dimensions, scores],
  );

  const cfg = SIZE_CONFIG[size];
  const { particleMult, fov, camZ } = cfg;
  const px = cfg.px;

  // Container style
  const containerStyle: React.CSSProperties =
    size === 'hero'
      ? { width: '100%', height: '100vh' }
      : { width: px, height: px };

  // Loading state
  if (webglAvailable === null) {
    return (
      <div
        className="relative flex items-center justify-center bg-transparent"
        style={containerStyle}
      >
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!webglAvailable) {
    return (
      <div
        className="relative flex items-center justify-center rounded-3xl overflow-hidden"
        style={{ ...containerStyle, background: '#060614' }}
      >
        <OrbFallback overallScore={overallScore} />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{ ...containerStyle, background: '#060614' }}
    >
      {/* Tooltip */}
      <OrbTooltip dimension={hoveredDimension} dims={dims} />

      {/* Score overlay – bottom-right */}
      <div className="absolute bottom-5 right-5 z-10 text-right pointer-events-none">
        <p
          className="text-2xl font-black text-white leading-none"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {Math.round(overallScore)}
          <span className="text-sm text-indigo-400 ml-0.5">%</span>
        </p>
        <p className="text-[11px] font-bold text-indigo-400/70 uppercase tracking-[0.2em] mt-0.5">
          Harmony Index
        </p>
      </div>

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, camZ], fov }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, size === 'hero' ? 2 : 1.5]}
      >
        <Suspense fallback={null}>
          <OrbScene
            dims={dims}
            overallScore={overallScore}
            mood={mood}
            interactive={interactive && size !== 'sm'}
            particleMult={particleMult}
            onDimensionClick={onDimensionClick}
            onHoveredDimension={setHoveredDimension}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
