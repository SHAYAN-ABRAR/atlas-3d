import { LIGHTING_PRESETS } from '@/config/constants';
import { WORLD_TEMPLATES } from '@/config/world-templates';
import { emit, viewportRuntime } from '@/lib/bus';
import { modKey, uid } from '@/lib/utils';
import { applyCommands } from '@/services/commands';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import type { LightingPreset } from '@/types/world';

export interface AppAction {
  id: string;
  title: string;
  group: string;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

/** Single registry powering the command palette and shortcut hints. */
export function buildActions(): AppAction[] {
  const ui = () => useUIStore.getState();
  const project = () => useProjectStore.getState();

  const actions: AppAction[] = [
    // Project
    {
      id: 'save', title: 'Save project', group: 'Project', shortcut: `${modKey} S`,
      run: () => window.dispatchEvent(new Event('atlas:save-now')),
    },
    {
      id: 'undo', title: 'Undo', group: 'Project', shortcut: `${modKey} Z`,
      run: () => project().undo(),
    },
    {
      id: 'redo', title: 'Redo', group: 'Project', shortcut: `${modKey} ⇧ Z`,
      run: () => project().redo(),
    },
    {
      id: 'reseed', title: 'Regenerate with new seed', group: 'Project', keywords: 'shuffle variation',
      run: () => applyCommands([{ action: 'reseed' }]),
    },
    // Camera
    {
      id: 'cam-orbit', title: 'Camera: Orbit', group: 'Camera', shortcut: '1',
      run: () => ui().set({ cameraMode: 'orbit' }),
    },
    {
      id: 'cam-walk', title: 'Camera: Walk', group: 'Camera', shortcut: '2', keywords: 'first person wasd',
      run: () => ui().set({ cameraMode: 'walk' }),
    },
    {
      id: 'cam-fly', title: 'Camera: Fly', group: 'Camera', shortcut: '3',
      run: () => ui().set({ cameraMode: 'fly' }),
    },
    {
      id: 'cam-frame', title: 'Frame world', group: 'Camera', shortcut: 'F', keywords: 'fit zoom home',
      run: () => emit('camera:frame'),
    },
    {
      id: 'cam-flythrough', title: 'Cinematic fly-through', group: 'Camera', keywords: 'tour movie',
      run: () => emit('camera:flythrough'),
    },
    {
      id: 'cam-bookmark', title: 'Bookmark current camera', group: 'Camera', shortcut: '⇧ B',
      run: () => {
        const pos = viewportRuntime.cameraPosition;
        const heading = viewportRuntime.cameraHeading;
        ui().addBookmark({
          id: uid('bm'),
          name: `View ${ui().bookmarks.length + 1}`,
          position: [...pos] as [number, number, number],
          target: [pos[0] + Math.sin(heading) * 40, Math.max(0, pos[1] - 20), pos[2] + Math.cos(heading) * 40],
        });
        project().log('success', 'Camera bookmarked');
      },
    },
    {
      id: 'screenshot', title: 'Export screenshot (PNG)', group: 'Export', keywords: 'capture image',
      run: () => emit('viewport:screenshot'),
    },
    {
      id: 'export-gltf', title: 'Export scene as GLB', group: 'Export', keywords: 'gltf model 3d',
      run: () => emit('export:gltf'),
    },
    {
      id: 'export-obj', title: 'Export scene as OBJ', group: 'Export', keywords: 'wavefront model',
      run: () => emit('export:obj'),
    },
    {
      id: 'fullscreen', title: 'Fullscreen viewport', group: 'View', shortcut: '⇧ F',
      run: () => emit('viewport:fullscreen'),
    },
    // View
    {
      id: 'toggle-left', title: 'Toggle left panel', group: 'View', shortcut: `${modKey} B`,
      run: () => ui().togglePanel('left'),
    },
    {
      id: 'toggle-right', title: 'Toggle right panel', group: 'View', shortcut: `${modKey} I`,
      run: () => ui().togglePanel('right'),
    },
    {
      id: 'toggle-bottom', title: 'Toggle bottom panel', group: 'View', shortcut: `${modKey} J`,
      run: () => ui().togglePanel('bottom'),
    },
    {
      id: 'toggle-grid', title: 'Toggle grid', group: 'View', shortcut: 'G',
      run: () => ui().set({ showGrid: !ui().showGrid }),
    },
    {
      id: 'toggle-minimap', title: 'Toggle minimap', group: 'View', shortcut: 'M',
      run: () => ui().set({ showMinimap: !ui().showMinimap }),
    },
    {
      id: 'toggle-perf', title: 'Toggle performance overlay', group: 'View', shortcut: 'P', keywords: 'fps stats',
      run: () => ui().set({ showPerf: !ui().showPerf }),
    },
    {
      id: 'toggle-gizmo', title: 'Toggle orientation gizmo', group: 'View', keywords: 'axis helper',
      run: () => ui().set({ showGizmo: !ui().showGizmo }),
    },
    {
      id: 'toggle-tuning', title: 'Advanced tuning panel (Leva)', group: 'View', keywords: 'debug fov',
      run: () => ui().set({ showTuning: !ui().showTuning }),
    },
    {
      id: 'toggle-theme', title: 'Toggle light / dark theme', group: 'View', keywords: 'appearance mode',
      run: () => ui().toggleTheme(),
    },
    {
      id: 'settings', title: 'Open settings', group: 'View', keywords: 'preferences ollama',
      run: () => ui().set({ settingsOpen: true }),
    },
    {
      id: 'shortcuts', title: 'Keyboard shortcuts', group: 'Help', shortcut: '?',
      run: () => ui().set({ shortcutsOpen: true }),
    },
  ];

  for (const t of WORLD_TEMPLATES) {
    actions.push({
      id: `gen-${t.id}`,
      title: `Generate: ${t.name}`,
      group: 'Generate',
      keywords: t.keywords.join(' '),
      run: () => applyCommands([{ action: 'generate_world', template: t.id }]),
    });
  }
  for (const key of Object.keys(LIGHTING_PRESETS) as LightingPreset[]) {
    actions.push({
      id: `light-${key}`,
      title: `Lighting: ${LIGHTING_PRESETS[key].label}`,
      group: 'Lighting',
      keywords: 'sun sky mood atmosphere',
      run: () => applyCommands([{ action: 'set_lighting', preset: key }]),
    });
  }
  return actions;
}
