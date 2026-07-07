'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeneratedWorld, WorldState } from '@/types/world';

const WATER_COLORS: Record<string, string> = {
  cyberpunk: '#0d1b2e',
  night: '#0c1a2a',
  rain: '#22333d',
  overcast: '#31424d',
};

export function Water({ gen, world }: { gen: GeneratedWorld; world: WorldState }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = WATER_COLORS[world.lighting.preset] ?? '#2a5d7c';

  // A slow breathing roughness makes the surface feel alive without a sim.
  useFrame(({ clock }) => {
    if (material.current) {
      material.current.roughness = 0.14 + Math.sin(clock.elapsedTime * 0.4) * 0.04;
    }
  });

  return (
    <mesh
      name="water"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, gen.waterLevel, 0]}
      receiveShadow
    >
      <planeGeometry args={[gen.size * 1.35, gen.size * 1.35]} />
      <meshStandardMaterial
        ref={material}
        color={color}
        transparent
        opacity={0.86}
        roughness={0.16}
        metalness={0.72}
      />
    </mesh>
  );
}
