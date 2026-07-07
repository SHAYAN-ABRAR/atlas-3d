'use client';

import {
  Bookmark,
  Camera,
  Clapperboard,
  Command,
  Download,
  Feather,
  Focus,
  Footprints,
  Grid3x3,
  Maximize2,
  Moon,
  Orbit,
  Redo2,
  Settings2,
  Sun,
  Trash2,
  Undo2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { DropdownMenu } from '@/components/ui/menu';
import { Tooltip } from '@/components/ui/tooltip';
import { emit } from '@/lib/bus';
import { cn, modKey, timeAgo } from '@/lib/utils';
import { exportProjectFile } from '@/services/share';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore, type CameraMode } from '@/stores/ui-store';

const CAMERA_MODES: { mode: CameraMode; label: string; icon: React.ReactNode; key: string }[] = [
  { mode: 'orbit', label: 'Orbit', icon: <Orbit size={13} />, key: '1' },
  { mode: 'walk', label: 'Walk', icon: <Footprints size={13} />, key: '2' },
  { mode: 'fly', label: 'Fly', icon: <Feather size={13} />, key: '3' },
];

function ProjectName() {
  const name = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setName(draft.trim() || 'Untitled world');
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        className="h-6 w-44 rounded border border-accent/50 bg-surface px-1.5 text-[13px] text-ink outline-none"
      />
    );
  }
  return (
    <button
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      className="max-w-[200px] truncate rounded px-1.5 py-0.5 text-[13px] font-medium text-ink hover:bg-overlay"
      title="Rename project"
    >
      {name}
    </button>
  );
}

function SaveIndicator() {
  const dirty = useProjectStore((s) => s.dirty);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  return (
    <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full transition-colors',
          dirty ? 'bg-warn' : 'bg-ok',
        )}
      />
      {dirty ? 'Editing…' : lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}` : 'Saved'}
    </span>
  );
}

export function TopBar() {
  const ui = useUIStore();
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-surface px-2">
      <Link
        href="/"
        className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-overlay"
        aria-label="Back to home"
      >
        <Logo size={17} />
        <span className="text-[13px] font-semibold tracking-tight text-ink">Atlas 3D</span>
      </Link>
      <div className="h-4 w-px bg-line" />
      <ProjectName />
      <SaveIndicator />

      <div className="flex-1" />

      {/* Camera mode segmented control */}
      <div className="flex items-center gap-0.5 rounded-md bg-bg p-0.5">
        {CAMERA_MODES.map(({ mode, label, icon, key }) => (
          <Tooltip key={mode} label={`${label} mode`} shortcut={key}>
            <button
              onClick={() => ui.set({ cameraMode: mode })}
              aria-pressed={ui.cameraMode === mode}
              className={cn(
                'relative flex h-7 items-center gap-1.5 rounded px-2.5 text-xs transition-colors',
                ui.cameraMode === mode ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
              )}
            >
              {ui.cameraMode === mode && (
                <motion.span
                  layoutId="camera-mode-pill"
                  className="absolute inset-0 rounded bg-raised shadow-soft"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {icon}
                {label}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="h-4 w-px bg-line" />

      <Tooltip label="Toggle grid" shortcut="G">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={ui.showGrid}
          className={cn(ui.showGrid && 'text-accent')}
          onClick={() => ui.set({ showGrid: !ui.showGrid })}
        >
          <Grid3x3 size={14} />
        </Button>
      </Tooltip>
      <DropdownMenu
        width={220}
        trigger={({ toggle }) => (
          <Tooltip label="Camera bookmarks" shortcut="⇧ B">
            <Button variant="ghost" size="icon-sm" onClick={toggle}>
              <Bookmark size={14} />
            </Button>
          </Tooltip>
        )}
        items={
          ui.bookmarks.length === 0
            ? [
                {
                  label: 'Bookmark this view',
                  icon: <Bookmark size={13} />,
                  onClick: () => window.dispatchEvent(new Event('atlas:bookmark-camera')),
                },
              ]
            : [
                {
                  label: 'Bookmark this view',
                  icon: <Bookmark size={13} />,
                  onClick: () => window.dispatchEvent(new Event('atlas:bookmark-camera')),
                },
                'separator' as const,
                ...ui.bookmarks.map((b) => ({
                  label: b.name,
                  icon: <Focus size={13} />,
                  onClick: () => emit('camera:pose', { position: b.position, target: b.target }),
                })),
                'separator' as const,
                {
                  label: 'Clear bookmarks',
                  icon: <Trash2 size={13} />,
                  danger: true,
                  onClick: () => ui.bookmarks.forEach((b) => ui.removeBookmark(b.id)),
                },
              ]
        }
      />
      <Tooltip label="Cinematic fly-through">
        <Button variant="ghost" size="icon-sm" onClick={() => emit('camera:flythrough')}>
          <Clapperboard size={14} />
        </Button>
      </Tooltip>
      <Tooltip label="Screenshot">
        <Button variant="ghost" size="icon-sm" onClick={() => emit('viewport:screenshot')}>
          <Camera size={14} />
        </Button>
      </Tooltip>
      <Tooltip label="Fullscreen" shortcut="⇧ F">
        <Button variant="ghost" size="icon-sm" onClick={() => emit('viewport:fullscreen')}>
          <Maximize2 size={14} />
        </Button>
      </Tooltip>

      <div className="h-4 w-px bg-line" />

      <Tooltip label="Undo" shortcut={`${modKey} Z`}>
        <Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={undo}>
          <Undo2 size={14} />
        </Button>
      </Tooltip>
      <Tooltip label="Redo" shortcut={`${modKey} ⇧ Z`}>
        <Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={redo}>
          <Redo2 size={14} />
        </Button>
      </Tooltip>

      <DropdownMenu
        width={230}
        trigger={({ toggle }) => (
          <Button variant="default" size="sm" onClick={toggle} className="ml-1">
            <Download size={13} />
            Export
          </Button>
        )}
        items={[
          { label: 'Scene as GLB', hint: '.glb', onClick: () => emit('export:gltf') },
          { label: 'Scene as OBJ', hint: '.obj', onClick: () => emit('export:obj') },
          { label: 'Screenshot', hint: '.png', onClick: () => emit('viewport:screenshot') },
          'separator',
          {
            label: 'Project file (share)',
            hint: '.atlas3d',
            onClick: () => {
              const rec = useProjectStore.getState().toRecord(null);
              if (rec) {
                exportProjectFile(rec);
                useProjectStore
                  .getState()
                  .log('success', 'Project exported — open the .atlas3d file on any machine running Atlas 3D');
              }
            },
          },
        ]}
      />

      <Tooltip label={ui.theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        <Button variant="ghost" size="icon-sm" onClick={ui.toggleTheme}>
          {ui.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
      </Tooltip>
      <Tooltip label="Settings">
        <Button variant="ghost" size="icon-sm" onClick={() => ui.set({ settingsOpen: true })}>
          <Settings2 size={14} />
        </Button>
      </Tooltip>
      <Tooltip label="Command palette" shortcut={`${modKey} K`}>
        <Button variant="ghost" size="icon-sm" onClick={() => ui.set({ paletteOpen: true })}>
          <Command size={14} />
        </Button>
      </Tooltip>
    </header>
  );
}
