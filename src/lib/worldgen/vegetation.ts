import { VEGETATION_STYLES } from '@/config/constants';
import { SimplexNoise } from '@/lib/noise';
import { mulberry32 } from '@/lib/rng';
import { lerp } from '@/lib/utils';
import type { TreeInstance, WorldState } from '@/types/world';

type Sampler = (x: number, z: number) => number;

export function generateVegetation(
  world: WorldState,
  sampler: Sampler,
  waterLevel: number,
  size: number,
  isOccupied: (x: number, z: number) => boolean,
): TreeInstance[] {
  if (!world.vegetation.enabled || world.vegetation.density <= 0.01) return [];

  const trees: TreeInstance[] = [];
  const rng = mulberry32(world.seed ^ 0x7f4a7c15);
  const mask = new SimplexNoise(world.seed ^ 0x1234abcd);
  const styleDef = VEGETATION_STYLES[world.vegetation.style];
  const density = world.vegetation.density;
  const spacing = lerp(17, 6.5, density);
  const threshold = lerp(0.42, -0.38, density);
  const half = size / 2 - 4;
  const analysis = world.map.enabled ? world.map.analysis : null;
  const maxTrees = 9000;

  for (let z = -half; z < half; z += spacing) {
    for (let x = -half; x < half; x += spacing) {
      const px = x + (rng() - 0.5) * spacing * 0.9;
      const pz = z + (rng() - 0.5) * spacing * 0.9;

      let m = mask.fbm((px / size) * 5, (pz / size) * 5, 3);
      if (analysis) {
        const mx = Math.floor(((px + size / 2) / size) * analysis.width);
        const mz = Math.floor(((pz + size / 2) / size) * analysis.height);
        const cls =
          mx >= 0 && mz >= 0 && mx < analysis.width && mz < analysis.height
            ? analysis.cells[mz * analysis.width + mx]
            : 0;
        if (cls === 2) m += 0.8;
        else if (cls === 3 || cls === 4 || cls === 1) continue;
      }
      if (m < threshold) continue;

      const y = sampler(px, pz);
      if (y < waterLevel + 0.7) continue;
      const slope = Math.abs(sampler(px + 2.5, pz) - y) + Math.abs(sampler(px, pz + 2.5) - y);
      if (slope > 3.4) continue;
      if (isOccupied(px, pz)) continue;

      trees.push({
        x: px,
        z: pz,
        y,
        scale: lerp(styleDef.scale[0], styleDef.scale[1], rng()),
        kind: rng() < styleDef.coniferBias ? 0 : 1,
        tint: rng(),
      });
      if (trees.length >= maxTrees) return trees;
    }
  }
  return trees;
}
