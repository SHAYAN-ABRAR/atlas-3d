'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Box,
  Cpu,
  Footprints,
  Map as MapIcon,
  MessageSquareText,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect } from 'react';
import { RecentProjects } from '@/components/landing/recent-projects';
import { UploadZone } from '@/components/landing/upload-zone';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useUIStore } from '@/stores/ui-store';

const Globe = dynamic(() => import('@/components/landing/globe').then((m) => m.Globe), {
  ssr: false,
});

const FEATURES = [
  {
    icon: <MapIcon size={15} />,
    title: 'Any map becomes terrain',
    body: 'Satellite images, blueprints, floor plans and hand-drawn maps are analyzed locally — water, roads, vegetation and built mass guide the generator.',
  },
  {
    icon: <MessageSquareText size={15} />,
    title: 'Direct the world with words',
    body: 'A local AI assistant (Ollama) rebuilds terrain, architecture, lighting and weather from plain sentences. No connection, no problem — common commands work offline.',
  },
  {
    icon: <Footprints size={15} />,
    title: 'Orbit, walk, fly',
    body: 'Inspect from above, then drop to street level with physics-grounded walking, or take a cinematic fly-through your scene.',
  },
  {
    icon: <Cpu size={15} />,
    title: 'Procedural, deterministic',
    body: 'Whole cities from a seed: road networks, districts, six architectural styles, forests and rivers — regenerated identically on any machine.',
  },
  {
    icon: <ShieldCheck size={15} />,
    title: 'Local-first, always',
    body: 'Projects live in your browser’s IndexedDB. No accounts, no cloud, no telemetry. Refresh, close, come back — nothing is lost.',
  },
  {
    icon: <Box size={15} />,
    title: 'Export anywhere',
    body: 'GLB and OBJ for Blender or game engines, PNG stills, and portable .atlas3d files that rebuild the exact world on another desktop.',
  },
];

export default function LandingPage() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={20} />
            <span className="text-sm font-semibold tracking-tight">Atlas 3D</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
            <Link href="/studio">
              <Button variant="primary" size="sm">
                Open Studio
                <ArrowRight size={13} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto w-full max-w-5xl px-6 pb-24 pt-16 sm:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <motion.p
              {...reveal(0.05)}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-2xs font-medium tracking-wide text-ink-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              Runs entirely on your machine
            </motion.p>
            <motion.h1
              {...reveal(0.12)}
              className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl"
            >
              Transform any 2D map into an{' '}
              <span className="text-accent">explorable 3D world.</span>
            </motion.h1>
            <motion.p
              {...reveal(0.22)}
              className="mt-5 max-w-lg text-pretty text-[15px] leading-relaxed text-ink-muted"
            >
              Drop in a blueprint, a satellite image, or a sketch on paper. Atlas 3D reads it,
              builds terrain, streets and architecture around it — then hands you the camera and
              an AI co-designer.
            </motion.p>
            <motion.div {...reveal(0.32)} className="mt-8 max-w-lg">
              <UploadZone />
            </motion.div>
            <motion.div {...reveal(0.4)} className="mt-4 flex items-center gap-3">
              <Link href="/studio">
                <Button variant="default" size="md">
                  Start from a blank world
                </Button>
              </Link>
              <span className="text-2xs text-ink-faint">No sign-up. No cloud. Ever.</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden aspect-square lg:block"
          >
            <Globe className="absolute inset-0" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-px overflow-hidden px-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: 0.04 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="p-5"
            >
              <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-accent">
                {f.icon}
              </div>
              <h3 className="text-[13px] font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="pt-14">
        <RecentProjects />
      </div>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-2xs text-ink-faint">
          <span className="flex items-center gap-2">
            <Logo size={13} className="opacity-70" />
            Atlas 3D — local-first world building
          </span>
          <span>Three.js · React Three Fiber · Ollama</span>
        </div>
      </footer>
    </div>
  );
}
