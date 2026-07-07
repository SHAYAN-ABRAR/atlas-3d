import { TERRAIN_PALETTES } from '@/config/constants';
import type { GeneratedWorld, WorldState } from '@/types/world';

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Renders a top-down map of the generated world onto a 2D canvas.
 * Shared by the viewport minimap and project thumbnails.
 */
export function drawWorldToCanvas(
  gen: GeneratedWorld,
  world: WorldState,
  canvas: HTMLCanvasElement,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H } = canvas;
  const { res, heights, waterLevel, size } = gen;
  const palette = TERRAIN_PALETTES[world.terrain.style].stops.map(hexToRgb);
  const water = hexToRgb('#3b6b8f');
  const amp = Math.max(1, world.terrain.amplitude);

  const img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const gx = Math.min(res - 1, Math.floor((px / W) * res));
      const gz = Math.min(res - 1, Math.floor((py / H) * res));
      const h = heights[gz * res + gx];
      let r: number, g: number, b: number;
      if (h < waterLevel) {
        const depth = Math.min(1, (waterLevel - h) / (amp * 0.35));
        r = water[0] * (1 - depth * 0.55);
        g = water[1] * (1 - depth * 0.5);
        b = water[2] * (1 - depth * 0.35);
      } else {
        const t = Math.min(0.999, Math.max(0, (h - waterLevel) / Math.max(1, amp - waterLevel)));
        const seg = t * (palette.length - 1);
        const i0 = Math.floor(seg);
        const f = seg - i0;
        const c0 = palette[i0];
        const c1 = palette[Math.min(palette.length - 1, i0 + 1)];
        // Cheap hillshade from the height gradient.
        const hx = heights[gz * res + Math.min(res - 1, gx + 1)] - h;
        const shade = 1 - Math.max(-0.5, Math.min(0.5, hx * 0.12));
        r = (c0[0] + (c1[0] - c0[0]) * f) * shade;
        g = (c0[1] + (c1[1] - c0[1]) * f) * shade;
        b = (c0[2] + (c1[2] - c0[2]) * f) * shade;
      }
      const idx = (py * W + px) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const toPx = (x: number) => ((x + size / 2) / size) * W;
  const toPy = (z: number) => ((z + size / 2) / size) * H;

  // Roads
  ctx.strokeStyle = 'rgba(30,30,32,0.75)';
  ctx.lineCap = 'round';
  for (const road of gen.roads) {
    ctx.lineWidth = Math.max(0.6, (road.width / size) * W);
    ctx.beginPath();
    ctx.moveTo(toPx(road.ax), toPy(road.az));
    ctx.lineTo(toPx(road.bx), toPy(road.bz));
    ctx.stroke();
  }

  // Buildings
  ctx.fillStyle = 'rgba(235,232,225,0.85)';
  for (const b of gen.buildings) {
    const w = Math.max(1, (b.w / size) * W);
    const d = Math.max(1, (b.d / size) * H);
    ctx.fillRect(toPx(b.x) - w / 2, toPy(b.z) - d / 2, w, d);
  }
}

/** Small JPEG thumbnail for the project gallery. */
export function renderThumbnail(gen: GeneratedWorld, world: WorldState, px = 320): string {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = Math.round(px * 0.625);
  drawWorldToCanvas(gen, world, canvas);
  return canvas.toDataURL('image/jpeg', 0.72);
}
