'use client';

import { Sky, Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LIGHTING_PRESETS, QUALITY_LEVELS } from '@/config/constants';
import { useUIStore } from '@/stores/ui-store';
import type { WorldState } from '@/types/world';

export function Atmosphere({ world }: { world: WorldState }) {
  const preset = LIGHTING_PRESETS[world.lighting.preset];
  const quality = useUIStore((s) => s.quality);
  const q = QUALITY_LEVELS[quality];
  const { scene, gl } = useThree();
  const lightRef = useRef<THREE.DirectionalLight>(null);

  const sunPosition = useMemo<[number, number, number]>(() => {
    const el = THREE.MathUtils.degToRad(preset.elevation);
    const az = THREE.MathUtils.degToRad(preset.azimuth);
    return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  }, [preset]);

  // Procedural IBL — glass and metal need something to reflect.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.texture.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    gl.toneMappingExposure = preset.exposure * world.lighting.exposure;
    scene.environmentIntensity = preset.ambient * 0.6;
    const fogDensity = preset.fogBase * (0.35 + world.lighting.fog * 2.4);
    scene.fog = new THREE.FogExp2(preset.fogColor, fogDensity);
    scene.background = new THREE.Color(preset.background);
    return () => {
      scene.fog = null;
    };
  }, [gl, scene, preset, world.lighting.exposure, world.lighting.fog]);

  const sunDistance = 420;

  return (
    <>
      {preset.sky && (
        <Sky
          distance={4000}
          sunPosition={sunPosition}
          turbidity={preset.sky.turbidity}
          rayleigh={preset.sky.rayleigh}
          mieCoefficient={preset.sky.mieCoefficient}
          mieDirectionalG={preset.sky.mieDirectionalG}
        />
      )}
      {preset.stars && (
        <Stars radius={900} depth={80} count={2800} factor={5} saturation={0.1} fade speed={0.4} />
      )}
      <directionalLight
        ref={lightRef}
        position={[
          sunPosition[0] * sunDistance,
          Math.max(30, sunPosition[1] * sunDistance),
          sunPosition[2] * sunDistance,
        ]}
        intensity={preset.sunIntensity}
        color={preset.sunColor}
        castShadow={q.shadows}
        shadow-mapSize-width={q.shadowMap}
        shadow-mapSize-height={q.shadowMap}
        shadow-camera-left={-280}
        shadow-camera-right={280}
        shadow-camera-top={280}
        shadow-camera-bottom={-280}
        shadow-camera-near={10}
        shadow-camera-far={1200}
        shadow-bias={-0.0004}
      />
      {/* Sky-fill from opposite the sun keeps shadowed facades readable. */}
      <directionalLight
        position={[-sunPosition[0] * sunDistance, sunDistance * 0.45, -sunPosition[2] * sunDistance]}
        intensity={Math.max(0.18, preset.sunIntensity * 0.17)}
        color={preset.sky ? '#cdd9e8' : preset.fogColor}
      />
      <hemisphereLight
        intensity={preset.ambient * 1.15}
        color={preset.sky ? '#cfd8e6' : preset.background}
        groundColor="#494538"
      />
      <ambientLight intensity={preset.ambient * 0.45} />
    </>
  );
}
