'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '@/lib/rng';

function GlobePoints() {
  const group = useRef<THREE.Group>(null);

  const { dots, accents, lines } = useMemo(() => {
    const rng = mulberry32(77);
    const R = 1.28;

    // Fibonacci-distributed surface points, thinned by noise-free jitter for a "landmass" feel.
    const n = 1500;
    const dotPos: number[] = [];
    const accentPos: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      if (rng() < 0.085) accentPos.push(x * R, y * R, z * R);
      else dotPos.push(x * R, y * R, z * R);
    }

    // Graticule
    const linePos: number[] = [];
    const seg = 96;
    for (const lat of [-60, -30, 0, 30, 60]) {
      const phi = THREE.MathUtils.degToRad(lat);
      const r = Math.cos(phi) * R;
      const y = Math.sin(phi) * R;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2;
        const a1 = ((i + 1) / seg) * Math.PI * 2;
        linePos.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
      }
    }
    for (let m = 0; m < 8; m++) {
      const a = (m / 8) * Math.PI;
      for (let i = 0; i < seg; i++) {
        const t0 = (i / seg) * Math.PI * 2;
        const t1 = ((i + 1) / seg) * Math.PI * 2;
        const p0 = new THREE.Vector3(
          Math.sin(t0) * Math.cos(a),
          Math.cos(t0),
          Math.sin(t0) * Math.sin(a),
        ).multiplyScalar(R);
        const p1 = new THREE.Vector3(
          Math.sin(t1) * Math.cos(a),
          Math.cos(t1),
          Math.sin(t1) * Math.sin(a),
        ).multiplyScalar(R);
        linePos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }

    const make = (arr: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return g;
    };
    return { dots: make(dotPos), accents: make(accentPos), lines: make(linePos) };
  }, []);

  useFrame(({ pointer }, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.07;
    // Gentle pointer parallax with inertia.
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -pointer.y * 0.22 + 0.18,
      0.04,
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      pointer.x * 0.08,
      0.04,
    );
  });

  return (
    <group ref={group}>
      <points geometry={dots}>
        <pointsMaterial size={0.016} color="#8b8f96" transparent opacity={0.85} sizeAttenuation />
      </points>
      <points geometry={accents}>
        <pointsMaterial size={0.028} color="#f0913a" transparent opacity={0.95} sizeAttenuation />
      </points>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#6d7076" transparent opacity={0.14} />
      </lineSegments>
      {/* Occluder so the far side reads dimmer */}
      <mesh>
        <sphereGeometry args={[1.26, 48, 48]} />
        <meshBasicMaterial color="#0b0b0d" transparent opacity={0.88} />
      </mesh>
    </group>
  );
}

/** The landing hero globe — fully procedural, no assets. */
export function Globe({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 3.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <GlobePoints />
      </Canvas>
    </div>
  );
}
