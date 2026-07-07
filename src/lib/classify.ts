/**
 * Pixel classification shared by the map-analysis service and its worker.
 * Classes: 0 terrain · 1 water · 2 vegetation · 3 road · 4 building
 */
export function classifyPixels(data: Uint8ClampedArray, width: number, height: number): number[] {
  const cells = new Array<number>(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let cls = 0;
    if (b > r + 14 && b > g + 8 && b > 70) cls = 1; // water
    else if (g > r + 10 && g > b + 10 && g > 60) cls = 2; // vegetation
    else if (sat < 46 && lum < 92) cls = 3; // dark strokes → roads / walls
    else if (sat < 40 && lum >= 92 && lum < 185) cls = 4; // mid grays → built mass
    else if (r > 130 && r > g + 28 && r > b + 45) cls = 4; // brick / roof reds
    cells[i] = cls;
  }

  // One denoise pass: isolated single cells adopt their dominant neighbor.
  const out = cells.slice();
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      const i = z * width + x;
      const c = cells[i];
      const counts = [0, 0, 0, 0, 0];
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dz === 0) continue;
          counts[cells[(z + dz) * width + (x + dx)]]++;
        }
      if (counts[c] === 0) {
        let bestCls = 0;
        let bestCount = -1;
        for (let k = 0; k < 5; k++)
          if (counts[k] > bestCount) {
            bestCount = counts[k];
            bestCls = k;
          }
        out[i] = bestCls;
      }
    }
  }
  return out;
}
