'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '@/lib/rng';
import type { ParticleMode } from '@/types/world';

const AREA = 380;
const CEIL = 150;

function Rain() {
  const count = 2600;
  const ref = useRef<THREE.LineSegments>(null);
  const data = useMemo(() => {
    const rng = mulberry32(42);
    const pos = new Float32Array(count * 6);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * AREA;
      const y = rng() * CEIL;
      const z = (rng() - 0.5) * AREA;
      pos.set([x, y, z, x, y - 1.6, z], i * 6);
      speed[i] = 70 + rng() * 50;
    }
    return { pos, speed };
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    return g;
  }, [data]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, delta) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const fall = data.speed[i] * Math.min(delta, 0.05);
      arr[i * 6 + 1] -= fall;
      arr[i * 6 + 4] -= fall;
      if (arr[i * 6 + 1] < -5) {
        arr[i * 6 + 1] = CEIL;
        arr[i * 6 + 4] = CEIL - 1.6;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <lineSegments ref={ref} geometry={geo} frustumCulled={false} userData={{ helper: true }}>
      <lineBasicMaterial color="#9db4c9" transparent opacity={0.34} />
    </lineSegments>
  );
}

function DriftingPoints({
  mode,
}: {
  mode: Exclude<ParticleMode, 'none' | 'rain'>;
}) {
  const config = {
    snow: { count: 2200, color: '#eef2f6', size: 0.9, opacity: 0.85, additive: false },
    fireflies: { count: 260, color: '#ffd77a', size: 1.1, opacity: 0.9, additive: true },
    embers: { count: 420, color: '#ff8a4a', size: 0.8, opacity: 0.85, additive: true },
  }[mode];

  const data = useMemo(() => {
    const rng = mulberry32(7 + mode.length);
    const pos = new Float32Array(config.count * 3);
    const phase = new Float32Array(config.count);
    for (let i = 0; i < config.count; i++) {
      pos[i * 3] = (rng() - 0.5) * AREA;
      pos[i * 3 + 1] = mode === 'fireflies' ? 2 + rng() * 16 : rng() * CEIL;
      pos[i * 3 + 2] = (rng() - 0.5) * AREA;
      phase[i] = rng() * Math.PI * 2;
    }
    return { pos, phase };
  }, [mode, config.count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos.slice(), 3));
    return g;
  }, [data]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const d = Math.min(delta, 0.05);
    for (let i = 0; i < config.count; i++) {
      const p = data.phase[i];
      if (mode === 'snow') {
        arr[i * 3 + 1] -= (6 + Math.sin(p) * 2) * d;
        arr[i * 3] += Math.sin(t * 0.8 + p) * 1.6 * d;
        if (arr[i * 3 + 1] < -2) arr[i * 3 + 1] = CEIL;
      } else if (mode === 'fireflies') {
        arr[i * 3] += Math.sin(t * 0.5 + p) * 1.2 * d;
        arr[i * 3 + 1] += Math.cos(t * 0.7 + p * 2) * 0.8 * d;
        arr[i * 3 + 2] += Math.cos(t * 0.4 + p) * 1.2 * d;
      } else {
        arr[i * 3 + 1] += (4 + Math.sin(p) * 2) * d;
        arr[i * 3] += Math.sin(t + p) * 0.9 * d;
        if (arr[i * 3 + 1] > CEIL * 0.7) arr[i * 3 + 1] = 0;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo} frustumCulled={false} userData={{ helper: true }}>
      <pointsMaterial
        color={config.color}
        size={config.size}
        sizeAttenuation
        transparent
        opacity={config.opacity}
        depthWrite={false}
        blending={config.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

export function Particles({ mode }: { mode: ParticleMode }) {
  if (mode === 'none') return null;
  if (mode === 'rain') return <Rain />;
  return <DriftingPoints mode={mode} />;
}
