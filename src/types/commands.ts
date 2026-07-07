import type {
  BuildingStyle,
  CityLayout,
  LightingPreset,
  MaterialOverride,
  ParticleMode,
  TerrainStyle,
  VegetationStyle,
} from './world';

/**
 * Structured scene commands. The AI (or the offline interpreter) emits these;
 * `services/commands.ts` validates and applies them to the world.
 */
export type SceneCommand =
  | {
      action: 'generate_world';
      template?: string;
      terrainStyle?: TerrainStyle;
      buildingStyle?: BuildingStyle;
      seed?: number;
    }
  | { action: 'reseed' }
  | {
      action: 'set_terrain';
      style?: TerrainStyle;
      amplitude?: number;
      waterLevel?: number;
      rivers?: number;
    }
  | {
      action: 'set_buildings';
      style?: BuildingStyle;
      layout?: CityLayout;
      density?: number;
      maxFloors?: number;
      enabled?: boolean;
    }
  | { action: 'set_roads'; widthScale?: number; widthMultiplier?: number; sidewalks?: boolean }
  | { action: 'set_vegetation'; style?: VegetationStyle; density?: number; enabled?: boolean }
  | { action: 'set_water'; enabled?: boolean; level?: number }
  | { action: 'set_lighting'; preset?: LightingPreset; fog?: number; exposure?: number }
  | { action: 'set_weather'; particles?: ParticleMode }
  | { action: 'set_materials'; override?: MaterialOverride }
  | { action: 'camera_flythrough' }
  | { action: 'optimize'; level?: 'mobile' | 'balanced' | 'quality' }
  | { action: 'stats' }
  | { action: 'analyze_map' };

export interface CommandResult {
  applied: string[];
  /** Extra text the app wants to show (e.g. computed stats). */
  note?: string;
}
