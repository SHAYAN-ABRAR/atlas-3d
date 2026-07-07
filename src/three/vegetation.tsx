'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VEGETATION_STYLES } from '@/config/constants';
import type { GeneratedWorld, WorldState } from '@/types/world';

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();
const yAxis = new THREE.Vector3(0, 1, 0);

/** Three stacked cones — a pine silhouette. Unit height ≈ 1.35, base at y=0.2. */
function buildConiferGeometry(): THREE.BufferGeometry {
  const tiers: THREE.BufferGeometry[] = [
    new THREE.ConeGeometry(0.62, 0.72, 7),
    new THREE.ConeGeometry(0.47, 0.6, 7),
    new THREE.ConeGeometry(0.3, 0.5, 6),
  ];
  tiers[0].translate(0, 0.56, 0);
  tiers[1].translate(0, 0.95, 0);
  tiers[2].translate(0, 1.3, 0);
  const merged = mergeGeometries(tiers)!;
  tiers.forEach((t) => t.dispose());
  return merged;
}

/** Four overlapping faceted lobes — a broadleaf crown. Center ≈ y 0.7. */
function buildBroadleafGeometry(): THREE.BufferGeometry {
  const lobes: { r: number; p: [number, number, number] }[] = [
    { r: 0.6, p: [0, 0.62, 0] },
    { r: 0.44, p: [0.4, 0.76, 0.16] },
    { r: 0.4, p: [-0.36, 0.82, -0.14] },
    { r: 0.36, p: [0.06, 0.98, -0.3] },
  ];
  const parts = lobes.map(({ r, p }) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate(...p);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

export function Vegetation({ gen, world }: { gen: GeneratedWorld; world: WorldState }) {
  const styleDef = VEGETATION_STYLES[world.vegetation.style];
  const conifers = useMemo(() => gen.trees.filter((t) => t.kind === 0), [gen]);
  const broadleaf = useMemo(() => gen.trees.filter((t) => t.kind === 1), [gen]);

  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.16, 0.24, 1, 5);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const coniferGeo = useMemo(buildConiferGeometry, []);
  const broadGeo = useMemo(buildBroadleafGeometry, []);

  useEffect(
    () => () => {
      trunkGeo.dispose();
      coniferGeo.dispose();
      broadGeo.dispose();
    },
    [trunkGeo, coniferGeo, broadGeo],
  );

  const trunksRef = useRef<THREE.InstancedMesh>(null);
  const conesRef = useRef<THREE.InstancedMesh>(null);
  const blobsRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const trunks = trunksRef.current;
    if (trunks) {
      for (let i = 0; i < gen.trees.length; i++) {
        const t = gen.trees[i];
        tmpQuat.setFromAxisAngle(yAxis, t.tint * Math.PI * 2);
        tmpPos.set(t.x, t.y - 0.15, t.z);
        const trunkH = (t.kind === 0 ? 1.6 : 2.2) * t.scale;
        tmpScale.set(t.scale, trunkH, t.scale);
        tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
        trunks.setMatrixAt(i, tmpMatrix);
      }
      trunks.instanceMatrix.needsUpdate = true;
      trunks.computeBoundingSphere();
    }

    const fill = (
      mesh: THREE.InstancedMesh | null,
      trees: typeof gen.trees,
      place: (t: (typeof gen.trees)[number]) => void,
    ) => {
      if (!mesh) return;
      for (let i = 0; i < trees.length; i++) {
        const t = trees[i];
        place(t);
        mesh.setMatrixAt(i, tmpMatrix);
        tmpColor
          .set(styleDef.canopy[Math.floor(t.tint * styleDef.canopy.length) % styleDef.canopy.length])
          .convertSRGBToLinear();
        tmpColor.multiplyScalar(0.92 + t.tint * 0.22);
        mesh.setColorAt(i, tmpColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    };

    fill(conesRef.current, conifers, (t) => {
      tmpQuat.setFromAxisAngle(yAxis, t.tint * Math.PI * 2);
      tmpPos.set(t.x, t.y - 0.1, t.z);
      tmpScale.set(2.7 * t.scale, 3.3 * t.scale, 2.7 * t.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
    });
    fill(blobsRef.current, broadleaf, (t) => {
      tmpQuat.setFromAxisAngle(yAxis, t.tint * Math.PI * 2);
      tmpPos.set(t.x, t.y + 0.9 * t.scale, t.z);
      tmpScale.set(2.2 * t.scale, 2.3 * t.scale * (0.9 + t.tint * 0.25), 2.2 * t.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
    });
  }, [gen, conifers, broadleaf, styleDef]);

  if (gen.trees.length === 0) return null;

  return (
    <group name="vegetation">
      <instancedMesh
        key={`t-${gen.key}`}
        ref={trunksRef}
        args={[trunkGeo, undefined, gen.trees.length]}
        castShadow
      >
        <meshStandardMaterial color={styleDef.trunk} roughness={0.95} flatShading />
      </instancedMesh>
      {conifers.length > 0 && (
        <instancedMesh
          key={`c-${gen.key}-${world.vegetation.style}`}
          ref={conesRef}
          args={[coniferGeo, undefined, conifers.length]}
          castShadow
        >
          <meshStandardMaterial roughness={0.94} flatShading />
        </instancedMesh>
      )}
      {broadleaf.length > 0 && (
        <instancedMesh
          key={`b-${gen.key}-${world.vegetation.style}`}
          ref={blobsRef}
          args={[broadGeo, undefined, broadleaf.length]}
          castShadow
        >
          <meshStandardMaterial roughness={0.94} flatShading />
        </instancedMesh>
      )}
    </group>
  );
}
