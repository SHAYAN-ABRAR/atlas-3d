'use client';

import { motion } from 'framer-motion';
import { Map as MapIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { emit, viewportRuntime } from '@/lib/bus';
import { drawWorldToCanvas } from '@/lib/minimap-draw';
import { generateWorld } from '@/lib/worldgen';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';

const SIZE = 192;

export function MiniMap() {
  const show = useUIStore((s) => s.showMinimap);
  const set = useUIStore((s) => s.set);
  const world = useProjectStore((s) => s.world);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);

  const gen = useMemo(() => generateWorld(world), [world]);

  // Re-render the terrain layer only when generation changes.
  useEffect(() => {
    if (!show) return;
    const base = document.createElement('canvas');
    base.width = SIZE;
    base.height = SIZE;
    drawWorldToCanvas(gen, world, base);
    baseRef.current = base;
  }, [gen, world, show]);

  // Camera marker refresh at ~15fps.
  useEffect(() => {
    if (!show) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 66) return;
      last = t;
      const canvas = canvasRef.current;
      const base = baseRef.current;
      if (!canvas || !base) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(base, 0, 0);

      const [cx, , cz] = viewportRuntime.cameraPosition;
      const px = ((cx + gen.size / 2) / gen.size) * SIZE;
      const pz = ((cz + gen.size / 2) / gen.size) * SIZE;
      const heading = viewportRuntime.cameraHeading;

      // View cone
      ctx.save();
      ctx.translate(px, pz);
      // heading = atan2(dirX, dirZ); canvas x = world x, canvas y = world z.
      ctx.rotate(Math.PI / 2 - heading);
      ctx.fillStyle = 'rgba(240,145,58,0.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 26, -0.5, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Position dot
      ctx.fillStyle = '#f0913a';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, pz, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, gen]);

  if (!show) {
    return (
      <button
        onClick={() => set({ showMinimap: true })}
        className="pointer-events-auto absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-md bg-surface/90 text-ink-muted shadow-soft backdrop-blur hover:text-ink"
        aria-label="Show minimap"
        title="Minimap (M)"
      >
        <MapIcon size={14} />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="pointer-events-auto absolute bottom-3 right-3 overflow-hidden rounded-md bg-surface/95 shadow-float backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-line px-2 py-1">
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-faint">
          Minimap
        </span>
        <button
          onClick={() => set({ showMinimap: false })}
          className="rounded p-0.5 text-ink-faint hover:text-ink"
          aria-label="Hide minimap"
        >
          <X size={11} />
        </button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="block cursor-crosshair"
          style={{ width: SIZE, height: SIZE }}
          onClick={(e) => {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width - 0.5) * gen.size;
            const z = ((e.clientY - rect.top) / rect.height - 0.5) * gen.size;
            emit('minimap:teleport', { x, z });
          }}
          title="Click to move the camera"
        />
        <span className="pointer-events-none absolute left-1.5 top-1 font-mono text-2xs text-white/70">
          N
        </span>
      </div>
    </motion.div>
  );
}
