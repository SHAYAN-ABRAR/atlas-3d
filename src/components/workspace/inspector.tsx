'use client';

import {
  Building2,
  CloudSun,
  Dices,
  Gauge,
  Layers,
  Mountain,
  Route,
  Sparkles,
  Trees,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { SelectField } from '@/components/ui/select';
import { SliderField } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  BUILDING_STYLES,
  LIGHTING_PRESETS,
  MATERIAL_OVERRIDES,
  QUALITY_LEVELS,
  VEGETATION_STYLES,
  type QualityLevel,
} from '@/config/constants';
import { useProjectStore, type WorldPatch } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import type {
  BuildingStyle,
  CityLayout,
  LightingPreset,
  MaterialOverride,
  ParticleMode,
  TerrainStyle,
  VegetationStyle,
} from '@/types/world';

/** Slider wrapper that produces exactly one undo step per drag. */
function WorldSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  patch: (v: number) => WorldPatch;
  commitLabel: string;
  format?: (v: number) => string;
}) {
  const updateWorld = useProjectStore((s) => s.updateWorld);
  const beginTransient = useProjectStore((s) => s.beginTransient);
  const endTransient = useProjectStore((s) => s.endTransient);
  return (
    <div
      onPointerDownCapture={beginTransient}
      onPointerUp={() => endTransient(props.commitLabel)}
      onKeyUp={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') endTransient(props.commitLabel);
      }}
    >
      <SliderField
        label={props.label}
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        format={props.format}
        onChange={(v) => updateWorld(props.patch(v), props.commitLabel, { commit: false })}
      />
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function Inspector() {
  const world = useProjectStore((s) => s.world);
  const updateWorld = useProjectStore((s) => s.updateWorld);
  const ui = useUIStore();

  return (
    <div className="pb-6">
      {/* World */}
      <Section title="World" icon={<Layers size={13} />} id="sec-world">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <div className="mb-1 text-xs text-ink-muted">Seed</div>
            <div className="flex h-8 items-center rounded border border-line bg-surface px-2.5 font-mono text-xs tabular-nums text-ink-muted">
              {world.seed}
            </div>
          </div>
          <Button
            size="icon"
            aria-label="New random seed"
            onClick={() =>
              updateWorld({ seed: Math.floor(Math.random() * 2 ** 31) }, 'New seed')
            }
          >
            <Dices size={14} />
          </Button>
        </div>
      </Section>

      {/* Terrain */}
      <Section title="Terrain" icon={<Mountain size={13} />} id="sec-terrain">
        <SelectField<TerrainStyle>
          label="Style"
          value={world.terrain.style}
          options={[
            { value: 'flat', label: 'Flat' },
            { value: 'plains', label: 'Plains' },
            { value: 'rolling', label: 'Rolling hills' },
            { value: 'mountains', label: 'Mountains' },
            { value: 'islands', label: 'Islands' },
            { value: 'canyon', label: 'Canyon' },
          ]}
          onChange={(v) => updateWorld({ terrain: { style: v } }, `Terrain → ${v}`)}
        />
        <WorldSlider
          label="Elevation"
          value={world.terrain.amplitude}
          min={2}
          max={80}
          step={1}
          format={(v) => `${v.toFixed(0)} m`}
          patch={(v) => ({ terrain: { amplitude: v } })}
          commitLabel="Terrain elevation"
        />
        <WorldSlider
          label="Water level"
          value={world.terrain.waterLevel}
          min={0}
          max={0.7}
          format={pct}
          patch={(v) => ({ terrain: { waterLevel: v } })}
          commitLabel="Water level"
        />
        <WorldSlider
          label="Rivers"
          value={world.terrain.rivers}
          min={0}
          max={5}
          step={1}
          patch={(v) => ({ terrain: { rivers: v } })}
          commitLabel="Rivers"
        />
        <Switch
          label="Water surface"
          checked={world.water.enabled}
          onChange={(v) => updateWorld({ water: { enabled: v } }, v ? 'Show water' : 'Hide water')}
        />
      </Section>

      {/* Buildings */}
      <Section title="Buildings" icon={<Building2 size={13} />} id="sec-buildings">
        <Switch
          label="Generate city"
          checked={world.city.enabled}
          onChange={(v) => updateWorld({ city: { enabled: v } }, v ? 'Enable city' : 'Disable city')}
        />
        <SelectField<BuildingStyle>
          label="Architecture"
          value={world.city.style}
          options={(Object.keys(BUILDING_STYLES) as BuildingStyle[]).map((k) => ({
            value: k,
            label: BUILDING_STYLES[k].label,
          }))}
          onChange={(v) => updateWorld({ city: { style: v } }, `Architecture → ${v}`)}
        />
        <SelectField<CityLayout>
          label="Layout"
          value={world.city.layout}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'radial', label: 'Radial' },
            { value: 'organic', label: 'Organic' },
          ]}
          onChange={(v) => updateWorld({ city: { layout: v } }, `Layout → ${v}`)}
        />
        <WorldSlider
          label="Density"
          value={world.city.density}
          min={0.05}
          max={1}
          format={pct}
          patch={(v) => ({ city: { density: v } })}
          commitLabel="City density"
        />
        <WorldSlider
          label="Max floors"
          value={world.city.maxFloors}
          min={1}
          max={40}
          step={1}
          patch={(v) => ({ city: { maxFloors: v } })}
          commitLabel="Max floors"
        />
        <WorldSlider
          label="City extent"
          value={world.city.extent}
          min={0.15}
          max={0.9}
          format={pct}
          patch={(v) => ({ city: { extent: v } })}
          commitLabel="City extent"
        />
      </Section>

      {/* Roads */}
      <Section title="Roads" icon={<Route size={13} />} id="sec-roads" defaultOpen={false}>
        <WorldSlider
          label="Width"
          value={world.roads.widthScale}
          min={0.4}
          max={3}
          format={(v) => `${v.toFixed(2)}×`}
          patch={(v) => ({ roads: { widthScale: v } })}
          commitLabel="Road width"
        />
        <Switch
          label="Sidewalks"
          checked={world.roads.sidewalks}
          onChange={(v) => updateWorld({ roads: { sidewalks: v } }, v ? 'Add sidewalks' : 'Remove sidewalks')}
        />
      </Section>

      {/* Vegetation */}
      <Section title="Vegetation" icon={<Trees size={13} />} id="sec-vegetation" defaultOpen={false}>
        <Switch
          label="Enabled"
          checked={world.vegetation.enabled}
          onChange={(v) => updateWorld({ vegetation: { enabled: v } }, v ? 'Enable vegetation' : 'Clear vegetation')}
        />
        <SelectField<VegetationStyle>
          label="Species"
          value={world.vegetation.style}
          options={(Object.keys(VEGETATION_STYLES) as VegetationStyle[]).map((k) => ({
            value: k,
            label: VEGETATION_STYLES[k].label,
          }))}
          onChange={(v) => updateWorld({ vegetation: { style: v } }, `Vegetation → ${v}`)}
        />
        <WorldSlider
          label="Density"
          value={world.vegetation.density}
          min={0}
          max={1}
          format={pct}
          patch={(v) => ({ vegetation: { density: v } })}
          commitLabel="Vegetation density"
        />
      </Section>

      {/* Lighting */}
      <Section title="Lighting & atmosphere" icon={<CloudSun size={13} />} id="sec-lighting">
        <SelectField<LightingPreset>
          label="Preset"
          value={world.lighting.preset}
          options={(Object.keys(LIGHTING_PRESETS) as LightingPreset[]).map((k) => ({
            value: k,
            label: LIGHTING_PRESETS[k].label,
          }))}
          onChange={(v) => updateWorld({ lighting: { preset: v } }, `Lighting → ${v}`)}
        />
        <WorldSlider
          label="Fog"
          value={world.lighting.fog}
          min={0}
          max={1}
          format={pct}
          patch={(v) => ({ lighting: { fog: v } })}
          commitLabel="Fog"
        />
        <WorldSlider
          label="Exposure"
          value={world.lighting.exposure}
          min={0.4}
          max={1.8}
          format={(v) => `${v.toFixed(2)}×`}
          patch={(v) => ({ lighting: { exposure: v } })}
          commitLabel="Exposure"
        />
        <SelectField<ParticleMode>
          label="Weather particles"
          value={world.effects.particles}
          options={[
            { value: 'none', label: 'None' },
            { value: 'rain', label: 'Rain' },
            { value: 'snow', label: 'Snow' },
            { value: 'fireflies', label: 'Fireflies' },
            { value: 'embers', label: 'Embers' },
          ]}
          onChange={(v) => updateWorld({ effects: { particles: v } }, `Weather → ${v}`)}
        />
      </Section>

      {/* Materials */}
      <Section title="Materials" icon={<Sparkles size={13} />} id="sec-materials" defaultOpen={false}>
        <SelectField<MaterialOverride>
          label="Override"
          value={world.materials.override}
          options={[
            { value: 'none', label: 'Original (per style)' },
            ...(Object.keys(MATERIAL_OVERRIDES) as Exclude<MaterialOverride, 'none'>[]).map(
              (k) => ({ value: k, label: MATERIAL_OVERRIDES[k].label }),
            ),
          ]}
          onChange={(v) => updateWorld({ materials: { override: v } }, `Materials → ${v}`)}
        />
        <p className="text-2xs leading-relaxed text-ink-faint">
          Overrides re-skin every building in the scene. “Original” restores each
          architecture’s native palette.
        </p>
      </Section>

      {/* Quality */}
      <Section title="Performance" icon={<Gauge size={13} />} id="sec-quality" defaultOpen={false}>
        <SelectField<QualityLevel>
          label="Quality"
          value={ui.quality}
          options={(Object.keys(QUALITY_LEVELS) as QualityLevel[]).map((k) => ({
            value: k,
            label: QUALITY_LEVELS[k].label,
          }))}
          onChange={(v) => ui.set({ quality: v })}
        />
        <Switch
          label="Auto-degrade on low FPS"
          checked={ui.autoQuality}
          onChange={(v) => ui.set({ autoQuality: v })}
        />
        <Switch label="Orientation gizmo" checked={ui.showGizmo} onChange={(v) => ui.set({ showGizmo: v })} />
        <Switch label="Performance overlay" checked={ui.showPerf} onChange={(v) => ui.set({ showPerf: v })} />
      </Section>
    </div>
  );
}
