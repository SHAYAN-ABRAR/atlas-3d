'use client';

import { useEffect, useState } from 'react';
import { viewportRuntime } from '@/lib/bus';
import { QUALITY_LEVELS } from '@/config/constants';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const seed = useProjectStore((s) => s.world.seed);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const quality = useUIStore((s) => s.quality);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);
  void tick;

  const [x, y, z] = viewportRuntime.cameraPosition;
  const fps = viewportRuntime.fps;

  return (
    <footer className="flex h-6 shrink-0 select-none items-center gap-4 border-t border-line bg-surface px-3 font-mono text-2xs tabular-nums text-ink-faint">
      <span>seed {seed}</span>
      <span className="capitalize">{cameraMode}</span>
      <span>
        x {x.toFixed(0)} · y {y.toFixed(0)} · z {z.toFixed(0)}
      </span>
      <span className="flex-1" />
      <span>{QUALITY_LEVELS[quality].label.toLowerCase()}</span>
      <span>{viewportRuntime.drawCalls} calls</span>
      <span>{(viewportRuntime.triangles / 1000).toFixed(0)}k tris</span>
      <span
        className={cn(
          fps >= 50 ? 'text-ok' : fps >= 28 ? 'text-warn' : 'text-danger',
        )}
      >
        {fps.toFixed(0)} fps
      </span>
    </footer>
  );
}
