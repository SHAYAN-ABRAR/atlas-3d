import { BUILDING_STYLES } from '@/config/constants';
import { mulberry32, type Rng } from '@/lib/rng';
import { clamp, lerp } from '@/lib/utils';
import type { BuildingInstance, RoadSegment, WorldState } from '@/types/world';

export interface CityGenResult {
  roads: RoadSegment[];
  buildings: BuildingInstance[];
}

type Sampler = (x: number, z: number) => number;

const BASE_ROAD_WIDTH = 3.4;

export function generateCity(
  world: WorldState,
  sampler: Sampler,
  waterLevel: number,
  size: number,
): CityGenResult {
  if (!world.city.enabled) return { roads: [], buildings: [] };

  const rng = mulberry32(world.seed ^ 0x2c1b3c6d);
  const analysis = world.map.enabled ? world.map.analysis : null;
  if (analysis) return generateFromMap(world, sampler, waterLevel, size, rng);

  return world.city.layout === 'grid'
    ? generateGrid(world, sampler, waterLevel, size, rng)
    : generateRadial(world, sampler, waterLevel, size, rng);
}

/* ------------------------------------------------------------------ */

function makeBuilding(
  world: WorldState,
  rng: Rng,
  x: number,
  z: number,
  y: number,
  rotation: number,
  centrality: number, // 1 at city center, 0 at edge
  lotLimit: number,
): BuildingInstance {
  const style = BUILDING_STYLES[world.city.style];
  const w = clamp(
    style.minFootprint + rng() * (style.maxFootprint - style.minFootprint),
    3,
    lotLimit,
  );
  const d = clamp(
    style.minFootprint + rng() * (style.maxFootprint - style.minFootprint),
    3,
    lotLimit,
  );
  const downtownBoost = style.roofType === 'flat' ? 1 + centrality * centrality * 2.2 : 1;
  const floors = Math.max(
    1,
    Math.round(Math.pow(rng(), 1.5) * world.city.maxFloors * style.heightBias * downtownBoost),
  );
  return {
    x,
    z,
    w,
    d,
    h: floors * style.floorHeight,
    rotation,
    y,
    colorIndex: Math.floor(rng() * style.walls.length),
    hasRoof: style.roofType !== 'flat',
  };
}

function suitable(sampler: Sampler, waterLevel: number, x: number, z: number): number | null {
  const y = sampler(x, z);
  if (y < waterLevel + 0.6) return null;
  const s = 3;
  const dy =
    Math.max(
      Math.abs(sampler(x + s, z) - y),
      Math.abs(sampler(x - s, z) - y),
      Math.abs(sampler(x, z + s) - y),
      Math.abs(sampler(x, z - s) - y),
    ) / s;
  if (dy > 1.1) return null;
  return y;
}

/* ------------------------------------------------------------------ */
/* Grid layout                                                         */
/* ------------------------------------------------------------------ */

function generateGrid(
  world: WorldState,
  sampler: Sampler,
  waterLevel: number,
  size: number,
  rng: Rng,
): CityGenResult {
  const roads: RoadSegment[] = [];
  const buildings: BuildingInstance[] = [];
  const R = (world.city.extent * size) / 2;
  const roadW = BASE_ROAD_WIDTH * world.roads.widthScale;
  const spacing = lerp(44, 30, world.city.density);

  const lines: number[] = [];
  for (let p = -R; p <= R + 0.01; p += spacing) lines.push(p);

  for (const p of lines) {
    roads.push({ ax: p, az: -R, bx: p, bz: R, width: roadW });
    roads.push({ ax: -R, az: p, bx: R, bz: p, width: roadW });
  }

  const margin = roadW / 2 + 2.5;
  const styleDef = BUILDING_STYLES[world.city.style];
  const lotPitch = styleDef.minFootprint + 4;

  for (let bi = 0; bi < lines.length - 1; bi++) {
    for (let bj = 0; bj < lines.length - 1; bj++) {
      const x0 = lines[bi] + margin;
      const z0 = lines[bj] + margin;
      const inner = spacing - margin * 2;
      const nLots = Math.max(1, Math.round(inner / lotPitch));
      const pitch = inner / nLots;
      for (let li = 0; li < nLots; li++) {
        for (let lj = 0; lj < nLots; lj++) {
          const cx = x0 + pitch * (li + 0.5) + (rng() - 0.5) * 1.5;
          const cz = z0 + pitch * (lj + 0.5) + (rng() - 0.5) * 1.5;
          const r = Math.hypot(cx, cz) / R;
          if (r > 1) continue;
          const p = world.city.density * 1.3 * (1.05 - r * r * 0.55);
          if (rng() > p) continue;
          const y = suitable(sampler, waterLevel, cx, cz);
          if (y === null) continue;
          buildings.push(makeBuilding(world, rng, cx, cz, y, 0, 1 - r, pitch - 2));
        }
      }
    }
  }
  return { roads, buildings };
}

/* ------------------------------------------------------------------ */
/* Radial / organic layout                                             */
/* ------------------------------------------------------------------ */

function generateRadial(
  world: WorldState,
  sampler: Sampler,
  waterLevel: number,
  size: number,
  rng: Rng,
): CityGenResult {
  const roads: RoadSegment[] = [];
  const buildings: BuildingInstance[] = [];
  const organic = world.city.layout === 'organic';
  const R = (world.city.extent * size) / 2;
  const roadW = BASE_ROAD_WIDTH * world.roads.widthScale;
  const ringSpacing = lerp(40, 26, world.city.density);
  const styleDef = BUILDING_STYLES[world.city.style];

  // Spokes
  const spokes = organic ? 5 + Math.floor(rng() * 3) : 8 + Math.floor(rng() * 4);
  const spokeOffset = rng() * Math.PI;
  for (let sIdx = 0; sIdx < spokes; sIdx++) {
    const a = spokeOffset + (sIdx / spokes) * Math.PI * 2 + (organic ? (rng() - 0.5) * 0.4 : 0);
    roads.push({
      ax: Math.cos(a) * ringSpacing * 0.35,
      az: Math.sin(a) * ringSpacing * 0.35,
      bx: Math.cos(a) * R,
      bz: Math.sin(a) * R,
      width: roadW,
    });
  }

  // Rings (polylines) with lots on both sides
  for (let r = ringSpacing * 0.8; r <= R; r += ringSpacing) {
    const segs = Math.max(12, Math.round((Math.PI * 2 * r) / 16));
    const wobble = organic ? 0.08 : 0.015;
    const phase = rng() * Math.PI * 2;
    let prevX = 0;
    let prevZ = 0;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rr = r * (1 + Math.sin(a * 3 + phase) * wobble);
      const px = Math.cos(a) * rr;
      const pz = Math.sin(a) * rr;
      if (i > 0) roads.push({ ax: prevX, az: prevZ, bx: px, bz: pz, width: roadW });
      prevX = px;
      prevZ = pz;

      // Lots flanking the ring
      if (i < segs && i % 2 === 0) {
        const centrality = 1 - r / R;
        for (const side of [-1, 1]) {
          if (rng() > world.city.density * (1.1 - (r / R) * 0.5)) continue;
          const off = side * (roadW / 2 + 2 + styleDef.maxFootprint * 0.55);
          const bx = Math.cos(a) * (rr + off) + (organic ? (rng() - 0.5) * 4 : 0);
          const bz = Math.sin(a) * (rr + off) + (organic ? (rng() - 0.5) * 4 : 0);
          const y = suitable(sampler, waterLevel, bx, bz);
          if (y === null) continue;
          const rot = a + Math.PI / 2 + (organic ? (rng() - 0.5) * 0.5 : 0);
          buildings.push(
            makeBuilding(world, rng, bx, bz, y, rot, centrality, styleDef.maxFootprint + 2),
          );
        }
      }
    }
  }

  // A keep at the heart of medieval towns.
  if (world.city.style === 'medieval') {
    const y = suitable(sampler, waterLevel, 0, 0);
    if (y !== null) {
      buildings.push({
        x: 0, z: 0, w: 17, d: 17, h: 26, rotation: spokeOffset, y,
        colorIndex: 2, hasRoof: true,
      });
      for (let t = 0; t < 4; t++) {
        const a = spokeOffset + (t / 4) * Math.PI * 2 + Math.PI / 4;
        buildings.push({
          x: Math.cos(a) * 14, z: Math.sin(a) * 14, w: 6, d: 6, h: 32,
          rotation: spokeOffset, y, colorIndex: 4, hasRoof: true,
        });
      }
    }
  }

  return { roads, buildings };
}

/* ------------------------------------------------------------------ */
/* Map-guided layout                                                   */
/* ------------------------------------------------------------------ */

function generateFromMap(
  world: WorldState,
  sampler: Sampler,
  waterLevel: number,
  size: number,
  rng: Rng,
): CityGenResult {
  const analysis = world.map.analysis!;
  const roads: RoadSegment[] = [];
  const buildings: BuildingInstance[] = [];
  const { width: mw, height: mh, cells } = analysis;
  const cellW = size / mw;
  const cellH = size / mh;
  const half = size / 2;
  const roadW = BASE_ROAD_WIDTH * world.roads.widthScale;

  const at = (x: number, z: number) => (x < 0 || z < 0 || x >= mw || z >= mh ? 0 : cells[z * mw + x]);
  const toWorldX = (x: number) => -half + (x + 0.5) * cellW;
  const toWorldZ = (z: number) => -half + (z + 0.5) * cellH;

  // Horizontal + vertical road runs from consecutive road cells.
  for (let z = 0; z < mh; z++) {
    let run = -1;
    for (let x = 0; x <= mw; x++) {
      const isRoad = at(x, z) === 3;
      if (isRoad && run < 0) run = x;
      if (!isRoad && run >= 0) {
        if (x - run >= 2)
          roads.push({ ax: toWorldX(run), az: toWorldZ(z), bx: toWorldX(x - 1), bz: toWorldZ(z), width: roadW });
        run = -1;
      }
    }
  }
  for (let x = 0; x < mw; x++) {
    let run = -1;
    for (let z = 0; z <= mh; z++) {
      const isRoad = at(x, z) === 3;
      if (isRoad && run < 0) run = z;
      if (!isRoad && run >= 0) {
        if (z - run >= 2)
          roads.push({ ax: toWorldX(x), az: toWorldZ(run), bx: toWorldX(x), bz: toWorldZ(z - 1), width: roadW });
        run = -1;
      }
    }
  }

  // Buildings on classified building cells.
  const styleDef = BUILDING_STYLES[world.city.style];
  for (let z = 0; z < mh; z++) {
    for (let x = 0; x < mw; x++) {
      if (at(x, z) !== 4) continue;
      if (rng() > clamp(world.city.density * 1.5, 0.1, 0.97)) continue;
      const cx = toWorldX(x) + (rng() - 0.5) * cellW * 0.3;
      const cz = toWorldZ(z) + (rng() - 0.5) * cellH * 0.3;
      const y = suitable(sampler, waterLevel, cx, cz);
      if (y === null) continue;
      const b = makeBuilding(world, rng, cx, cz, y, 0, 0.5, Math.min(cellW, cellH) * 1.4);
      b.w = Math.min(b.w, cellW * 1.15);
      b.d = Math.min(b.d, cellH * 1.15);
      buildings.push(b);
    }
  }

  // Fall back to a small procedural district when the map has no built areas.
  if (buildings.length === 0 && roads.length === 0) {
    return generateGrid(world, sampler, waterLevel, size, rng);
  }
  return { roads, buildings };
}
