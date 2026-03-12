'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Environment, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Dimension } from '@life-design/core';

interface LifeOrbProps {
  scores: Array<{ dimension: Dimension | string; score: number }>;
  overallScore: number;
}

function AnimatedOrb({ scores, overallScore }: LifeOrbProps) {
  const mesh = useRef<THREE.Mesh>(null);
  
  // Calculate combined distortion and color based on scores
  const distortion = useMemo(() => {
    const avg = overallScore / 10;
    return 0.3 + (1 - avg) * 0.4; // Higher distortion if score is lower (less balanced)
  }, [overallScore]);

  const color = useMemo(() => {
    // Transition from red (low) to purple (high)
    const factor = overallScore / 10;
    return new THREE.Color().lerpColors(
      new THREE.Color('#ff4757'), // Red
      new THREE.Color('#6366f1'), // Primary Indigo
      factor
    );
  }, [overallScore]);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = state.clock.getElapsedTime() * 0.2;
    mesh.current.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={mesh} args={[1, 128, 128]}>
        <MeshDistortMaterial
          color={color}
          speed={3}
          distort={distortion}
          radius={1}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Decorative inner glow or points can be added here */}
      <Sphere args={[0.95, 64, 64]}>
        <meshStandardMaterial
          color={color}
          wireframe
          transparent
          opacity={0.1}
        />
      </Sphere>
    </Float>
  );
}

export default function LifeOrb({ scores, overallScore }: LifeOrbProps) {
  return (
    <div className="glass-card h-[400px] w-full relative overflow-hidden group">
      <div className="absolute top-6 left-6 z-10">
        <h3 className="text-xl font-bold text-white tracking-tight">The Life Orb</h3>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
          Dynamic Balance Visualization
        </p>
      </div>

      <div className="absolute inset-0 bg-primary-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} color="#4f46e5" />
        
        <AnimatedOrb scores={scores} overallScore={overallScore} />
        
        <Environment preset="city" />
      </Canvas>
      
      <div className="absolute bottom-6 right-6 z-10 text-right">
        <p className="text-3xl font-black text-white leading-none">
          {Math.round(overallScore * 10)}%
        </p>
        <p className="text-[10px] font-bold text-primary-400 uppercase tracking-tighter mt-1">
          Harmony Index
        </p>
      </div>
    </div>
  );
}
