'use client';

import { OrbitControls, PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { on, viewportRuntime } from '@/lib/bus';
import { useUIStore } from '@/stores/ui-store';
import type { GeneratedWorld } from '@/types/world';

const EYE_HEIGHT = 1.75;
const GRAVITY = 26;
const FLY_DURATION = 55; // seconds per loop

function isTyping(e: KeyboardEvent | Event): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export function CameraRig({ gen }: { gen: GeneratedWorld }) {
  const mode = useUIStore((s) => s.cameraMode);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const keys = useRef<Set<string>>(new Set());
  const velY = useRef(0);
  const [flying, setFlying] = useState(false);
  const flyT = useRef(0);

  const maxHeight = useMemo(() => {
    let m = 0;
    for (let i = 0; i < gen.heights.length; i += 7) m = Math.max(m, gen.heights[i]);
    return m;
  }, [gen]);

  const flyCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = gen.size * (i % 2 === 0 ? 0.4 : 0.26);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = Math.max(gen.heightAt(x, z), gen.waterLevel) + 26 + (i % 3) * 14 + maxHeight * 0.35;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.6);
  }, [gen, maxHeight]);

  // Keyboard state for walk / fly movement.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // Imperative camera events.
  useEffect(() => {
    const offs = [
      on('camera:pose', ({ position, target }) => {
        camera.position.set(...position);
        orbitRef.current?.target.set(...target);
        orbitRef.current?.update();
      }),
      on('camera:frame', () => {
        const d = gen.size * 0.52;
        camera.position.set(d, Math.max(80, maxHeight * 1.9), d);
        orbitRef.current?.target.set(0, Math.max(6, maxHeight * 0.2), 0);
        orbitRef.current?.update();
      }),
      on('minimap:teleport', ({ x, z }) => {
        const ground = Math.max(gen.heightAt(x, z), gen.waterLevel);
        if (useUIStore.getState().cameraMode === 'orbit' && orbitRef.current) {
          const offset = camera.position.clone().sub(orbitRef.current.target);
          orbitRef.current.target.set(x, ground, z);
          camera.position.copy(orbitRef.current.target).add(offset);
          orbitRef.current.update();
        } else {
          camera.position.set(x, ground + EYE_HEIGHT, z);
        }
      }),
      on('camera:flythrough', () => {
        flyT.current = 0;
        setFlying(true);
        viewportRuntime.flythrough = true;
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [camera, gen, maxHeight]);

  // Any deliberate input ends the cinematic.
  useEffect(() => {
    if (!flying) return;
    const stop = () => {
      setFlying(false);
      viewportRuntime.flythrough = false;
    };
    const key = (e: KeyboardEvent) => {
      if (!isTyping(e)) stop();
    };
    const dom = gl.domElement;
    dom.addEventListener('pointerdown', stop);
    dom.addEventListener('wheel', stop);
    window.addEventListener('keydown', key);
    return () => {
      dom.removeEventListener('pointerdown', stop);
      dom.removeEventListener('wheel', stop);
      window.removeEventListener('keydown', key);
    };
  }, [flying, gl]);

  // Ground the camera when entering walk mode.
  useEffect(() => {
    if (mode === 'walk') {
      const g = Math.max(gen.heightAt(camera.position.x, camera.position.z), gen.waterLevel);
      camera.position.y = g + EYE_HEIGHT;
      velY.current = 0;
    }
  }, [mode, camera, gen]);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    if (flying) {
      flyT.current += delta / FLY_DURATION;
      const t = flyT.current % 1;
      const pos = flyCurve.getPointAt(t);
      camera.position.lerp(pos, Math.min(1, delta * 4 + 0.02));
      const ahead = flyCurve.getPointAt((t + 0.025) % 1);
      ahead.lerp(new THREE.Vector3(0, maxHeight * 0.3, 0), 0.35);
      camera.lookAt(ahead);
    } else if (mode !== 'orbit') {
      const k = keys.current;
      camera.getWorldDirection(fwd);
      if (mode === 'walk') {
        fwd.y = 0;
        fwd.normalize();
      }
      right.crossVectors(fwd, UP).normalize();
      const sprint = k.has('ShiftLeft') || k.has('ShiftRight');
      const speed = (mode === 'fly' ? 46 : 12) * (sprint ? 2.4 : 1);
      const move = new THREE.Vector3();
      if (k.has('KeyW') || k.has('ArrowUp')) move.add(fwd);
      if (k.has('KeyS') || k.has('ArrowDown')) move.sub(fwd);
      if (k.has('KeyD') || k.has('ArrowRight')) move.add(right);
      if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * delta);
      camera.position.add(move);

      if (mode === 'walk') {
        const ground =
          Math.max(gen.heightAt(camera.position.x, camera.position.z), gen.waterLevel) +
          EYE_HEIGHT;
        const grounded = camera.position.y <= ground + 0.02;
        if (k.has('Space') && grounded) velY.current = 9.5;
        velY.current -= GRAVITY * delta;
        camera.position.y += velY.current * delta;
        if (camera.position.y < ground) {
          camera.position.y = ground;
          velY.current = 0;
        }
      } else {
        if (k.has('Space') || k.has('KeyE')) camera.position.y += speed * delta;
        if (k.has('KeyQ') || k.has('KeyC')) camera.position.y -= speed * delta;
      }
      // Keep inside the world bounds.
      const limit = gen.size * 0.75;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
    }

    // Publish live pose for the minimap / status bar.
    camera.getWorldDirection(fwd);
    viewportRuntime.cameraPosition = [camera.position.x, camera.position.y, camera.position.z];
    viewportRuntime.cameraHeading = Math.atan2(fwd.x, fwd.z);
  });

  if (mode === 'orbit') {
    return (
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!flying}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.01}
        minDistance={4}
        maxDistance={900}
        target={[0, 8, 0]}
      />
    );
  }
  return <PointerLockControls makeDefault selector="#viewport-canvas-wrap canvas" />;
}
