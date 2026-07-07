import { SimplexNoise } from '@/lib/noise';
import { mulberry32 } from '@/lib/rng';
import { clamp, lerp } from '@/lib/utils';
import type { WorldState } from '@/types/world';

export interface HeightfieldResult {
  heights: Float32Array;
  waterLevel: number;
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Bilinear height sampler over the grid. x/z are world coords in [-size/2, size/2]. */
export function makeSampler(heights: Float32Array, res: number, size: number) {
  const half = size / 2;
  const scale = (res - 1) / size;
  return (x: number, z: number): number => {
    const gx = clamp((x + half) * scale, 0, res - 1.001);
    const gz = clamp((z + half) * scale, 0, res - 1.001);
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const fx = gx - x0;
    const fz = gz - z0;
    const i = z0 * res + x0;
    const h00 = heights[i];
    const h10 = heights[i + 1];
    const h01 = heights[i + res];
    const h11 = heights[i + res + 1];
    return (
      h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz
    );
  };
}

export function buildHeightfield(world: WorldState, res: number, size: number): HeightfieldResult {
  const { terrain } = world;
  const amp = Math.max(1, terrain.amplitude);
  const noise = new SimplexNoise(world.seed);
  const warp = new SimplexNoise(world.seed ^ 0x9e3779b9);
  const heights = new Float32Array(res * res);
  const half = size / 2;
  const baseScale = 2.6 * terrain.frequency;
  const octaves = clamp(Math.round(terrain.octaves), 1, 8);
  const waterLevel = amp * clamp(terrain.waterLevel, 0, 0.95);

  const analysis = world.map.enabled ? world.map.analysis : null;

  for (let iz = 0; iz < res; iz++) {
    for (let ix = 0; ix < res; ix++) {
      // Normalized coords in [-0.5, 0.5].
      const u = ix / (res - 1) - 0.5;
      const v = iz / (res - 1) - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2; // 0 center, ~1.41 corner

      let h01: number; // normalized 0..1 before amplitude
      switch (terrain.style) {
        case 'flat':
          h01 = 0.3 + 0.08 * noise.fbm(u * baseScale, v * baseScale, 3);
          break;
        case 'plains':
          h01 = 0.32 + 0.16 * noise.fbm(u * baseScale, v * baseScale, octaves);
          break;
        case 'rolling': {
          const f = noise.fbm(u * baseScale, v * baseScale, octaves);
          h01 = 0.38 + 0.3 * f;
          break;
        }
        case 'mountains': {
          const wx = 0.7 * warp.fbm(u * 2 + 13.7, v * 2, 3);
          const wz = 0.7 * warp.fbm(u * 2, v * 2 + 41.3, 3);
          const ridge = noise.ridged((u + wx * 0.12) * baseScale, (v + wz * 0.12) * baseScale, octaves);
          const mask = 0.5 + 0.5 * noise.fbm(u * 1.4 + 7, v * 1.4 - 3, 3);
          h01 = 0.1 + Math.pow(ridge, 1.6) * (0.35 + 0.65 * mask);
          break;
        }
        case 'islands': {
          const f = 0.5 + 0.5 * noise.fbm(u * baseScale * 1.3, v * baseScale * 1.3, octaves);
          const falloff = smoothstep(1.15, 0.35, r);
          h01 = Math.pow(f, 1.3) * falloff;
          break;
        }
        case 'canyon': {
          const f = 0.5 + 0.5 * noise.fbm(u * baseScale, v * baseScale, octaves);
          const t = f * 3.2;
          const step = Math.floor(t);
          const frac = t - step;
          h01 = (step + smoothstep(0.55, 0.95, frac)) / 3.2;
          break;
        }
      }

      let h = h01 * amp;

      // Uploaded map guidance: water cells sink, built cells settle onto a plateau.
      if (analysis) {
        const mx = clamp(Math.floor(((u + 0.5) * analysis.width) | 0), 0, analysis.width - 1);
        const mz = clamp(Math.floor(((v + 0.5) * analysis.height) | 0), 0, analysis.height - 1);
        const cls = analysis.cells[mz * analysis.width + mx];
        if (cls === 1) {
          h = Math.min(h, waterLevel - amp * 0.08 - 1.5);
        } else if (cls === 3 || cls === 4) {
          const plateau = Math.max(waterLevel + amp * 0.06 + 1, amp * 0.34);
          h = lerp(h, plateau, 0.8);
        } else if (cls === 2) {
          h = Math.max(h, waterLevel + 0.8);
        }
      }

      heights[iz * res + ix] = h;
    }
  }

  carveRivers(world, heights, res, size, waterLevel);
  return { heights, waterLevel };
}

/** Walks downhill from high ground, carving smooth channels until reaching water. */
function carveRivers(
  world: WorldState,
  heights: Float32Array,
  res: number,
  size: number,
  waterLevel: number,
) {
  const count = clamp(Math.round(world.terrain.rivers), 0, 6);
  if (count === 0) return;
  const rng = mulberry32(world.seed ^ 0x51ed270b);
  const depth = Math.max(2, world.terrain.amplitude * 0.09);
  const radius = Math.max(2, Math.round(res * 0.014));

  for (let riverIdx = 0; riverIdx < count; riverIdx++) {
    // Start from a random high-ish sample.
    let best = -1;
    let bestH = -Infinity;
    for (let attempt = 0; attempt < 24; attempt++) {
      const i = Math.floor(rng() * heights.length);
      if (heights[i] > bestH) {
        bestH = heights[i];
        best = i;
      }
    }
    if (best < 0) continue;
    let x = best % res;
    let z = Math.floor(best / res);
    let dx = rng() * 2 - 1;
    let dz = rng() * 2 - 1;

    for (let step = 0; step < res * 2; step++) {
      const i = z * res + x;
      if (heights[i] <= waterLevel - 1) break;

      // Carve a soft channel around the current point.
      for (let oz = -radius; oz <= radius; oz++) {
        for (let ox = -radius; ox <= radius; ox++) {
          const cx = x + ox;
          const cz = z + oz;
          if (cx < 0 || cz < 0 || cx >= res || cz >= res) continue;
          const d = Math.sqrt(ox * ox + oz * oz) / radius;
          if (d > 1) continue;
          const ci = cz * res + cx;
          const dig = depth * (1 - d * d);
          heights[ci] = Math.min(heights[ci], Math.max(heights[ci] - dig, waterLevel - depth));
        }
      }

      // Steepest descent with momentum + jitter so rivers meander.
      let gx = 0;
      let gz = 0;
      const xm = Math.max(0, x - 1);
      const xp = Math.min(res - 1, x + 1);
      const zm = Math.max(0, z - 1);
      const zp = Math.min(res - 1, z + 1);
      gx = heights[z * res + xp] - heights[z * res + xm];
      gz = heights[zp * res + x] - heights[zm * res + x];
      const len = Math.hypot(gx, gz) || 1;
      dx = dx * 0.6 - (gx / len) * 0.4 + (rng() - 0.5) * 0.25;
      dz = dz * 0.6 - (gz / len) * 0.4 + (rng() - 0.5) * 0.25;
      const dlen = Math.hypot(dx, dz) || 1;
      x = Math.round(x + (dx / dlen) * 1.5);
      z = Math.round(z + (dz / dlen) * 1.5);
      if (x < 1 || z < 1 || x >= res - 1 || z >= res - 1) break;
    }
  }
}
