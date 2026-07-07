'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { BuildingStyle, GeneratedWorld, WorldState } from '@/types/world';
import { createRoadTexture, type RoadLook } from './textures';

const ROAD_LOOKS: Record<BuildingStyle, Omit<RoadLook, 'curbs'>> = {
  modern: { base: '#38393d', dirt: false, dashes: true },
  cyberpunk: { base: '#212228', dirt: false, dashes: true },
  industrial: { base: '#403f3e', dirt: false, dashes: false },
  japanese: { base: '#37383c', dirt: false, dashes: false },
  medieval: { base: '#7d6c50', dirt: true, dashes: false },
  nordic: { base: '#71654f', dirt: true, dashes: false },
};

/**
 * One draped ribbon mesh for the whole network. Terrain under the roads is
 * pre-graded by the generator, so a fine sampling step gives smooth streets.
 */
function buildRoadGeometry(gen: GeneratedWorld): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const step = 3.2;

  for (let s = 0; s < gen.roads.length; s++) {
    const seg = gen.roads[s];
    const dx = seg.bx - seg.ax;
    const dz = seg.bz - seg.az;
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;
    const px = -dz / len;
    const pz = dx / len;
    const half = seg.width / 2;
    // Stagger lift per segment so crossings never z-fight.
    const lift = 0.1 + (s % 5) * 0.016;
    const steps = Math.max(1, Math.ceil(len / step));
    const base = positions.length / 3;
    const vScale = 1 / (seg.width * 2); // one texture tile per 2×width meters

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = seg.ax + dx * t;
      const cz = seg.az + dz * t;
      const y = gen.heightAt(cx, cz) + lift;
      positions.push(cx - px * half, y, cz - pz * half, cx + px * half, y, cz + pz * half);
      const v = len * t * vScale;
      uvs.push(0, v, 1, v);
    }
    for (let i = 0; i < steps; i++) {
      const a = base + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  if (positions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < normals.length; i += 3) normals[i + 1] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geo;
}

export function Roads({ gen, world }: { gen: GeneratedWorld; world: WorldState }) {
  const geometry = useMemo(() => buildRoadGeometry(gen), [gen]);
  const look = ROAD_LOOKS[world.city.style];
  const texture = useMemo(
    () => createRoadTexture(world.seed & 0xffff, { ...look, curbs: world.roads.sidewalks }),
    [look, world.roads.sidewalks, world.seed],
  );

  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} name="roads" receiveShadow>
      <meshStandardMaterial
        map={texture}
        roughness={look.dirt ? 0.98 : 0.92}
        metalness={0.02}
      />
    </mesh>
  );
}
