'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { viewportRuntime } from '@/lib/bus';
import { cn } from '@/lib/utils';
import { generateWorld } from '@/lib/worldgen';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore, type BottomTab } from '@/stores/ui-store';

const LEVEL_STYLE = {
  info: 'text-ink-faint',
  success: 'text-ok',
  warn: 'text-warn',
  error: 'text-danger',
} as const;

function Console() {
  const logs = useProjectStore((s) => s.logs);
  const clearLogs = useProjectStore((s) => s.clearLogs);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5 font-mono text-2xs leading-5">
        {logs.length === 0 && <div className="py-2 text-ink-faint">Console is clear.</div>}
        {logs.map((l) => (
          <div key={l.id} className="flex gap-2.5">
            <span className="shrink-0 tabular-nums text-ink-faint/60">
              {new Date(l.at).toLocaleTimeString([], { hour12: false })}
            </span>
            <span className={cn('min-w-0 break-words', LEVEL_STYLE[l.level])}>{l.message}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t border-line px-2 py-1">
        <Button variant="ghost" size="sm" onClick={clearLogs}>
          <Trash2 size={11} /> Clear
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <div className="text-2xs text-ink-faint">{label}</div>
      <div className="mt-0.5 font-mono text-sm tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-2xs text-ink-faint">{unit}</span>}
      </div>
    </div>
  );
}

function Performance() {
  const [, force] = useState(0);
  const samples = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const id = setInterval(() => {
      samples.current.push(viewportRuntime.fps);
      if (samples.current.length > 140) samples.current.shift();
      force((v) => v + 1);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      const line = theme === 'dark' ? 'rgba(240,145,58,0.9)' : 'rgba(184,101,42,0.9)';
      const grid = theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
      // 60fps reference line
      ctx.strokeStyle = grid;
      ctx.beginPath();
      const y60 = h - (60 / 90) * h;
      ctx.moveTo(0, y60);
      ctx.lineTo(w, y60);
      ctx.stroke();
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      samples.current.forEach((fps, i) => {
        const x = (i / 139) * w;
        const y = h - (Math.min(fps, 90) / 90) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }, 250);
    return () => clearInterval(id);
  }, [theme]);

  const r = viewportRuntime;
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3">
      <div className="flex min-w-[260px] flex-1 flex-col rounded-md border border-line bg-surface p-2">
        <div className="mb-1 flex items-baseline justify-between px-1">
          <span className="text-2xs text-ink-faint">Frames per second</span>
          <span className="font-mono text-xs tabular-nums text-ink">{r.fps.toFixed(0)}</span>
        </div>
        <canvas ref={canvasRef} width={420} height={64} className="h-full min-h-0 w-full" />
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 self-start">
        <Stat label="Frame time" value={r.frameMs.toFixed(1)} unit="ms" />
        <Stat label="Draw calls" value={r.drawCalls.toLocaleString()} />
        <Stat label="Triangles" value={(r.triangles / 1000).toFixed(0)} unit="k" />
        <Stat label="Cinematic" value={r.flythrough ? 'on' : 'off'} />
      </div>
    </div>
  );
}

function Generation() {
  const world = useProjectStore((s) => s.world);
  const gen = useMemo(() => generateWorld(world), [world]);
  const [lastMs, setLastMs] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setLastMs((e as CustomEvent<{ ms: number }>).detail.ms);
    window.addEventListener('atlas:generated', handler);
    return () => window.removeEventListener('atlas:generated', handler);
  }, []);

  const s = gen.stats;
  return (
    <div className="grid h-full grid-cols-3 content-start gap-2 overflow-y-auto p-3 lg:grid-cols-6">
      <Stat label="Buildings" value={s.buildings.toLocaleString()} />
      <Stat label="Tallest" value={s.tallestBuilding.toFixed(0)} unit="m" />
      <Stat label="Trees" value={s.trees.toLocaleString()} />
      <Stat label="Roads" value={(s.roadLength / 1000).toFixed(2)} unit="km" />
      <Stat label="Water" value={(s.waterCoverage * 100).toFixed(0)} unit="%" />
      <Stat label="Green space" value={(s.greenCoverage * 100).toFixed(0)} unit="%" />
      <div className="col-span-3 text-2xs text-ink-faint lg:col-span-6">
        ≈ {(s.triangleEstimate / 1000).toFixed(0)}k triangles
        {lastMs !== null && <> · last generation {lastMs.toFixed(0)} ms</>}
        {' · '}seed {world.seed}
      </div>
    </div>
  );
}

export function BottomPanel() {
  const tab = useUIStore((s) => s.bottomTab);
  const set = useUIStore((s) => s.set);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center border-b border-line px-2 py-1.5">
        <Tabs<BottomTab>
          layoutId="bottom-tabs"
          className="w-[320px]"
          value={tab}
          onChange={(v) => set({ bottomTab: v })}
          tabs={[
            { value: 'console', label: 'Console' },
            { value: 'performance', label: 'Performance' },
            { value: 'generation', label: 'Generation' },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'console' && <Console />}
        {tab === 'performance' && <Performance />}
        {tab === 'generation' && <Generation />}
      </div>
    </div>
  );
}
