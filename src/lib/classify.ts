/**
 * Pixel classification shared by the map-analysis service and its worker.
 * Classes: 0 terrain · 1 water · 2 vegetation · 3 road · 4 building
 *
 * Runs in stages: per-pixel color rules, two despeckle passes (photographic
 * input downsamples to noisy mush), then connected-component filtering so a
 * stray bluish rooftop or shadowed tree can't become a lake or a tower block.
 */

const TERRAIN = 0;
const WATER = 1;
const VEGETATION = 2;
const ROAD = 3;
const BUILDING = 4;

/** Minimum connected-region size per class; smaller islands revert to terrain. */
const MIN_REGION = [0, 28, 6, 8, 3];

/**
 * `data` is a (width × height) RGBA buffer; the returned grid is
 * (width/factor × height/factor). With factor > 1 each output cell averages a
 * factor² pixel block and measures its luminance texture — the key signal
 * separating real water (smooth) from photographed rooftops (noisy).
 */
export function classifyPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  factor = 1,
): number[] {
  const ow = Math.max(1, Math.floor(width / factor));
  const oh = Math.max(1, Math.floor(height / factor));
  const n = factor * factor;
  const cells = new Array<number>(ow * oh);
  const lums = new Float32Array(n);

  for (let oz = 0; oz < oh; oz++) {
    for (let ox = 0; ox < ow; ox++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dz = 0; dz < factor; dz++)
        for (let dx = 0; dx < factor; dx++) {
          const i = ((oz * factor + dz) * width + ox * factor + dx) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          lums[dz * factor + dx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
      r /= n;
      g /= n;
      b /= n;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Mean absolute luminance deviation inside the block: ~0 for flat map
      // art and open water, high for photographed urban fabric.
      let mad = 0;
      for (let k = 0; k < n; k++) mad += Math.abs(lums[k] - lum);
      mad /= n;

      let cls = TERRAIN;
      if (g > 120 && b > r + 30 && g > b + 12) cls = ROAD; // teal traffic/route overlays
      else if (sat > 90 && r > 200 && g > 140 && b < g - 60) cls = ROAD; // amber highways
      else if (r > 170 && g < 90 && b < 90) cls = ROAD; // red congestion overlays
      else if (b > r + 20 && b > g + 8 && b > 64 && mad < 15)
        cls = WATER; // blue-dominant AND smooth — bluish rooftops are noisy
      else if (g > r + 10 && g > b + 10 && g > 60) cls = VEGETATION; // bright greens
      else if (g > r + 2 && g > b + 8 && sat >= 10 && lum >= 40 && lum < 110)
        cls = VEGETATION; // dark satellite canopy
      else if (sat < 46 && lum < 92) cls = ROAD; // dark strokes → roads / walls
      else if (sat < 40 && lum >= 92 && lum < 185) cls = BUILDING; // mid grays → built mass
      else if (r > 130 && r > g + 28 && r > b + 45) cls = BUILDING; // brick / roof reds
      else if (mad > 30 && lum >= 60 && lum < 200) cls = BUILDING; // textured urban fabric
      cells[oz * ow + ox] = cls;
    }
  }

  despeckle(cells, ow, oh);
  despeckle(cells, ow, oh);
  dropSmallRegions(cells, ow, oh);
  return cells;
}

/**
 * Cells with at most one same-class neighbor adopt the local majority.
 * Thin lines (roads) have two same-class neighbors, so they survive.
 */
function despeckle(cells: number[], width: number, height: number): void {
  const src = cells.slice();
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      const i = z * width + x;
      const counts = [0, 0, 0, 0, 0];
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dz === 0) continue;
          counts[src[(z + dz) * width + (x + dx)]]++;
        }
      if (counts[src[i]] > 1) continue;
      let bestCls = src[i];
      let bestCount = 3; // adopt only a clear majority (≥4 of 8)
      for (let k = 0; k < 5; k++)
        if (counts[k] > bestCount) {
          bestCount = counts[k];
          bestCls = k;
        }
      cells[i] = bestCls;
    }
  }
}

/** Flood-fills each non-terrain region and reverts undersized ones to terrain. */
function dropSmallRegions(cells: number[], width: number, height: number): void {
  const seen = new Uint8Array(cells.length);
  const stack: number[] = [];
  const region: number[] = [];
  for (let start = 0; start < cells.length; start++) {
    const cls = cells[start];
    if (cls === TERRAIN || seen[start]) continue;
    stack.length = 0;
    region.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      region.push(i);
      const x = i % width;
      if (x > 0 && !seen[i - 1] && cells[i - 1] === cls) {
        seen[i - 1] = 1;
        stack.push(i - 1);
      }
      if (x < width - 1 && !seen[i + 1] && cells[i + 1] === cls) {
        seen[i + 1] = 1;
        stack.push(i + 1);
      }
      if (i >= width && !seen[i - width] && cells[i - width] === cls) {
        seen[i - width] = 1;
        stack.push(i - width);
      }
      if (i < cells.length - width && !seen[i + width] && cells[i + width] === cls) {
        seen[i + width] = 1;
        stack.push(i + width);
      }
    }
    if (region.length < MIN_REGION[cls]) for (const i of region) cells[i] = TERRAIN;
  }
}
