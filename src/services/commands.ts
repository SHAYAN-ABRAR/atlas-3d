import { WORLD_TEMPLATES, findTemplate } from '@/config/world-templates';
import { emit } from '@/lib/bus';
import { clamp } from '@/lib/utils';
import { generateWorld } from '@/lib/worldgen';
import { useProjectStore, type WorldPatch } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import type { CommandResult, SceneCommand } from '@/types/commands';

/**
 * Applies structured scene commands (from the AI or the offline interpreter).
 * A whole batch collapses into a single undo step.
 */
export function applyCommands(commands: SceneCommand[]): CommandResult {
  const applied: string[] = [];
  let note: string | undefined;
  let committed = false;

  const patchWorld = (patch: WorldPatch, label: string) => {
    useProjectStore.getState().updateWorld(patch, label, { commit: !committed });
    committed = true;
    applied.push(label);
  };

  for (const cmd of commands) {
    const world = useProjectStore.getState().world;
    try {
      switch (cmd.action) {
        case 'generate_world': {
          const template =
            WORLD_TEMPLATES.find((t) => t.id === cmd.template) ??
            (cmd.template ? findTemplate(cmd.template) : null);
          if (template) {
            const patch = template.patch(world) as WorldPatch;
            patch.seed = cmd.seed ?? Math.floor(Math.random() * 2 ** 31);
            if (cmd.terrainStyle) patch.terrain = { ...patch.terrain, style: cmd.terrainStyle };
            if (cmd.buildingStyle) patch.city = { ...patch.city, style: cmd.buildingStyle };
            patchWorld(patch, `Generate ${template.name}`);
          } else {
            patchWorld(
              {
                seed: Math.floor(Math.random() * 2 ** 31),
                ...(cmd.terrainStyle ? { terrain: { style: cmd.terrainStyle } } : {}),
                ...(cmd.buildingStyle ? { city: { style: cmd.buildingStyle } } : {}),
              },
              'Generate world',
            );
          }
          break;
        }
        case 'reseed':
          patchWorld({ seed: Math.floor(Math.random() * 2 ** 31) }, 'New seed');
          break;
        case 'set_terrain': {
          const patch: WorldPatch = { terrain: {} };
          if (cmd.style) patch.terrain!.style = cmd.style;
          if (cmd.amplitude !== undefined)
            patch.terrain!.amplitude = clamp(cmd.amplitude, 1, 90);
          if (cmd.waterLevel !== undefined)
            patch.terrain!.waterLevel = clamp(cmd.waterLevel, 0, 0.9);
          if (cmd.rivers !== undefined) patch.terrain!.rivers = clamp(Math.round(cmd.rivers), 0, 6);
          patchWorld(patch, 'Terrain change');
          break;
        }
        case 'set_buildings': {
          const patch: WorldPatch = { city: {} };
          if (cmd.style) patch.city!.style = cmd.style;
          if (cmd.layout) patch.city!.layout = cmd.layout;
          if (cmd.density !== undefined) patch.city!.density = clamp(cmd.density, 0, 1);
          if (cmd.maxFloors !== undefined)
            patch.city!.maxFloors = clamp(Math.round(cmd.maxFloors), 1, 60);
          if (cmd.enabled !== undefined) patch.city!.enabled = cmd.enabled;
          patchWorld(patch, 'Buildings change');
          break;
        }
        case 'set_roads': {
          const patch: WorldPatch = { roads: {} };
          const mult = cmd.widthMultiplier ?? undefined;
          if (mult !== undefined)
            patch.roads!.widthScale = clamp(world.roads.widthScale * mult, 0.3, 3.5);
          else if (cmd.widthScale !== undefined)
            patch.roads!.widthScale = clamp(cmd.widthScale, 0.3, 3.5);
          if (cmd.sidewalks !== undefined) patch.roads!.sidewalks = cmd.sidewalks;
          patchWorld(patch, 'Roads change');
          break;
        }
        case 'set_vegetation': {
          const patch: WorldPatch = { vegetation: {} };
          if (cmd.style) patch.vegetation!.style = cmd.style;
          if (cmd.density !== undefined) patch.vegetation!.density = clamp(cmd.density, 0, 1);
          if (cmd.enabled !== undefined) patch.vegetation!.enabled = cmd.enabled;
          patchWorld(patch, 'Vegetation change');
          break;
        }
        case 'set_water': {
          const patch: WorldPatch = {};
          if (cmd.enabled !== undefined) patch.water = { enabled: cmd.enabled };
          if (cmd.level !== undefined) patch.terrain = { waterLevel: clamp(cmd.level, 0, 0.9) };
          patchWorld(patch, 'Water change');
          break;
        }
        case 'set_lighting': {
          const patch: WorldPatch = { lighting: {} };
          if (cmd.preset) patch.lighting!.preset = cmd.preset;
          if (cmd.fog !== undefined) patch.lighting!.fog = clamp(cmd.fog, 0, 1);
          if (cmd.exposure !== undefined) patch.lighting!.exposure = clamp(cmd.exposure, 0.3, 2);
          patchWorld(patch, `Lighting → ${cmd.preset ?? 'adjusted'}`);
          break;
        }
        case 'set_weather':
          if (cmd.particles)
            patchWorld({ effects: { particles: cmd.particles } }, `Weather → ${cmd.particles}`);
          break;
        case 'set_materials':
          if (cmd.override)
            patchWorld({ materials: { override: cmd.override } }, `Materials → ${cmd.override}`);
          break;
        case 'camera_flythrough':
          emit('camera:flythrough');
          applied.push('Cinematic fly-through');
          break;
        case 'optimize': {
          const level = cmd.level ?? 'balanced';
          useUIStore.getState().set({ quality: level === 'quality' ? 'quality' : level });
          if (level === 'mobile') {
            const veg = useProjectStore.getState().world.vegetation.density;
            patchWorld(
              { vegetation: { density: Math.min(veg, 0.35) } },
              'Optimize for mobile',
            );
          } else {
            applied.push(`Quality → ${level}`);
          }
          useProjectStore
            .getState()
            .log('success', `Scene optimized (${level}): resolution scale, shadows and density adjusted`);
          break;
        }
        case 'stats': {
          const gen = generateWorld(world);
          const st = gen.stats;
          note = [
            `${st.buildings.toLocaleString()} buildings — tallest ${st.tallestBuilding.toFixed(0)} m`,
            `${st.trees.toLocaleString()} trees · green coverage ≈ ${(st.greenCoverage * 100).toFixed(0)}% of land`,
            `${(st.roadLength / 1000).toFixed(2)} km of roads`,
            `water covers ${(st.waterCoverage * 100).toFixed(0)}% of the map`,
            `≈ ${(st.triangleEstimate / 1000).toFixed(0)}k triangles`,
          ].join('\n');
          applied.push('Scene stats');
          break;
        }
        case 'analyze_map':
          applied.push('Map analysis');
          break;
        default:
          break;
      }
    } catch (err) {
      useProjectStore
        .getState()
        .log('error', `Command failed: ${(cmd as { action?: string }).action} — ${String(err)}`);
    }
  }

  if (applied.length > 0) {
    useProjectStore
      .getState()
      .log('success', `Assistant applied: ${applied.join(' · ')}`);
  }
  return { applied, note };
}
