'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BUILDING_STYLES, LIGHTING_PRESETS, MATERIAL_OVERRIDES } from '@/config/constants';
import type { GeneratedWorld, WorldState } from '@/types/world';
import { createFacadeTextures } from './textures';

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();
const yAxis = new THREE.Vector3(0, 1, 0);

export function Buildings({ gen, world }: { gen: GeneratedWorld; world: WorldState }) {
  const styleDef = BUILDING_STYLES[world.city.style];
  const override =
    world.materials.override !== 'none' ? MATERIAL_OVERRIDES[world.materials.override] : null;
  const preset = LIGHTING_PRESETS[world.lighting.preset];
  const walls = override?.walls ?? styleDef.walls;
  const roofs = override?.roofs ?? styleDef.roofs;
  const count = gen.buildings.length;

  const wallsRef = useRef<THREE.InstancedMesh>(null);
  const roofsRef = useRef<THREE.InstancedMesh>(null);

  const boxGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const roofGeo = useMemo(() => {
    if (styleDef.roofType === 'flat') {
      const g = new THREE.BoxGeometry(1, 1, 1);
      g.translate(0, 0.5, 0);
      return g;
    }
    // Square pyramid that fits a unit footprint.
    const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, 0.5, 0);
    return g;
  }, [styleDef.roofType]);

  const facade = useMemo(
    () => createFacadeTextures(styleDef.roofType === 'flat' ? 'tower' : 'cottage', 913),
    [styleDef.roofType],
  );
  useEffect(
    () => () => {
      facade.map.dispose();
      facade.emissive.dispose();
    },
    [facade],
  );
  useEffect(
    () => () => {
      boxGeo.dispose();
    },
    [boxGeo],
  );
  useEffect(
    () => () => {
      roofGeo.dispose();
    },
    [roofGeo],
  );

  useLayoutEffect(() => {
    const wallsMesh = wallsRef.current;
    const roofsMesh = roofsRef.current;
    if (!wallsMesh || !roofsMesh) return;

    for (let i = 0; i < count; i++) {
      const b = gen.buildings[i];
      tmpQuat.setFromAxisAngle(yAxis, b.rotation);

      tmpPos.set(b.x, b.y - 0.4, b.z);
      tmpScale.set(b.w, b.h + 0.4, b.d);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      wallsMesh.setMatrixAt(i, tmpMatrix);
      tmpColor.set(walls[b.colorIndex % walls.length]).convertSRGBToLinear();
      wallsMesh.setColorAt(i, tmpColor);

      // Roof: pyramid/pagoda for traditional styles, thin parapet slab for flat.
      const flat = styleDef.roofType === 'flat';
      const overhang = styleDef.roofType === 'pagoda' ? 1.45 : flat ? 1.04 : 1.12;
      const roofH = flat
        ? 0.35
        : Math.min(b.w, b.d) * (styleDef.roofType === 'pagoda' ? 0.42 : 0.62);
      tmpPos.set(b.x, b.y + b.h - 0.02, b.z);
      tmpScale.set(b.w * overhang, roofH, b.d * overhang);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      roofsMesh.setMatrixAt(i, tmpMatrix);
      tmpColor.set(roofs[b.colorIndex % roofs.length]).convertSRGBToLinear();
      roofsMesh.setColorAt(i, tmpColor);
    }
    wallsMesh.instanceMatrix.needsUpdate = true;
    roofsMesh.instanceMatrix.needsUpdate = true;
    if (wallsMesh.instanceColor) wallsMesh.instanceColor.needsUpdate = true;
    if (roofsMesh.instanceColor) roofsMesh.instanceColor.needsUpdate = true;
    wallsMesh.computeBoundingSphere();
    roofsMesh.computeBoundingSphere();
  }, [gen, count, walls, roofs, styleDef]);

  if (count === 0) return null;

  const emissive = new THREE.Color(styleDef.windowColor);

  return (
    <group name="buildings">
      <instancedMesh
        key={`w-${gen.key}-${count}-${world.city.style}-${world.materials.override}`}
        ref={wallsRef}
        args={[boxGeo, undefined, count]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          roughness={override?.roughness ?? styleDef.roughness}
          metalness={override?.metalness ?? styleDef.metalness}
          map={facade.map}
          emissiveMap={facade.emissive}
          emissive={emissive}
          emissiveIntensity={preset.windowGlow}
        />
      </instancedMesh>
      <instancedMesh
        key={`r-${gen.key}-${count}-${world.city.style}-${world.materials.override}`}
        ref={roofsRef}
        args={[roofGeo, undefined, count]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          roughness={override?.roughness ?? Math.min(1, styleDef.roughness + 0.05)}
          metalness={override?.metalness ?? styleDef.metalness * 0.6}
        />
      </instancedMesh>
    </group>
  );
}
