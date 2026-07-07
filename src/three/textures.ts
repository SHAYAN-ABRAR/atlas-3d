import * as THREE from 'three';
import { mulberry32 } from '@/lib/rng';

/**
 * All surface detail in Atlas 3D is painted procedurally onto canvases —
 * no downloaded assets, deterministic per seed.
 */

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Terrain grain — near-white noise that modulates vertex colors.      */
/* ------------------------------------------------------------------ */

export function createDetailTexture(seed = 101): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = mulberry32(seed);

  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 226 + rng() * 29;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Soft mottling so the grain has structure at two scales.
  for (let i = 0; i < 90; i++) {
    const r = 6 + rng() * 22;
    ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,255,255' : '20,26,14'},0.05)`;
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* Roads — asphalt or packed dirt, optional curbs and lane dashes.     */
/* One tile maps to (width × 2·width) world units along the ribbon.    */
/* ------------------------------------------------------------------ */

export interface RoadLook {
  base: string;
  dirt: boolean;
  dashes: boolean;
  curbs: boolean;
}

export function createRoadTexture(seed: number, look: RoadLook): THREE.CanvasTexture {
  const W = 128;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const rng = mulberry32(seed);

  ctx.fillStyle = look.base;
  ctx.fillRect(0, 0, W, H);

  // Speckle grain
  for (let i = 0; i < 2600; i++) {
    const l = rng();
    ctx.fillStyle =
      l > 0.5 ? `rgba(255,255,255,${0.02 + rng() * 0.05})` : `rgba(0,0,0,${0.03 + rng() * 0.07})`;
    ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 2, 1 + rng() * 2);
  }

  if (look.dirt) {
    // Wheel ruts and scattered stones
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.fillRect(W * 0.24, 0, W * 0.1, H);
    ctx.fillRect(W * 0.66, 0, W * 0.1, H);
    for (let i = 0; i < 46; i++) {
      ctx.fillStyle = `rgba(${180 + rng() * 40},${170 + rng() * 35},${150 + rng() * 30},${0.14 + rng() * 0.2})`;
      ctx.beginPath();
      ctx.arc(rng() * W, rng() * H, 1 + rng() * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Grassy verge bleed at the edges
    ctx.fillStyle = 'rgba(52,66,36,0.35)';
    ctx.fillRect(0, 0, 5, H);
    ctx.fillRect(W - 5, 0, 5, H);
  } else {
    // Subtle tar seams
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const y = rng() * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(W * 0.3, y + rng() * 16 - 8, W * 0.7, y + rng() * 16 - 8, W, y);
      ctx.stroke();
    }
  }

  if (look.curbs) {
    const cw = 9;
    const curb = look.dirt ? '#8f8874' : '#93938e';
    const curbDark = look.dirt ? '#77705e' : '#77776f';
    for (const x of [0, W - cw]) {
      ctx.fillStyle = curb;
      ctx.fillRect(x, 0, cw, H);
      // Paver joints
      ctx.fillStyle = curbDark;
      for (let y = 0; y < H; y += 18) ctx.fillRect(x, y + (rng() * 4 - 2), cw, 1.6);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(cw, 0, 1.6, H);
    ctx.fillRect(W - cw - 1.6, 0, 1.6, H);
  }

  if (look.dashes && !look.dirt) {
    ctx.fillStyle = 'rgba(216,208,172,0.8)';
    for (let y = 8; y < H; y += 56) ctx.fillRect(W / 2 - 1.6, y, 3.2, 26);
  }

  return canvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* Building facades — daytime glass + aligned night emissive windows.  */
/* ------------------------------------------------------------------ */

export interface FacadeTextures {
  map: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
}

export function createFacadeTextures(kind: 'tower' | 'cottage', seed = 913): FacadeTextures {
  const W = 128;
  const H = 256;
  const mapCanvas = document.createElement('canvas');
  const emiCanvas = document.createElement('canvas');
  mapCanvas.width = emiCanvas.width = W;
  mapCanvas.height = emiCanvas.height = H;
  const mctx = mapCanvas.getContext('2d')!;
  const ectx = emiCanvas.getContext('2d')!;
  const rng = mulberry32(seed + (kind === 'tower' ? 0 : 7));

  // Wall base: near-white so per-instance palette colors dominate.
  mctx.fillStyle = '#efedea';
  mctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 1600; i++) {
    mctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(60,55,48,0.04)';
    mctx.fillRect(rng() * W, rng() * H, 2, 2);
  }
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, W, H);

  const cols = kind === 'tower' ? 5 : 2;
  const rows = kind === 'tower' ? 11 : 2;
  const cw = W / cols;
  const ch = H / rows;
  const inset = kind === 'tower' ? 4.5 : 9;

  for (let r = 0; r < rows; r++) {
    // Floor slab shadow line (towers only)
    if (kind === 'tower') {
      mctx.fillStyle = 'rgba(50,46,40,0.18)';
      mctx.fillRect(0, r * ch, W, 2);
    }
    for (let c = 0; c < cols; c++) {
      const x = c * cw + inset;
      const y = r * ch + inset;
      const w = cw - inset * 2;
      const h = ch - inset * 2;

      // Day glass: sky-reflecting, light at the top, cooler below.
      const glassL = kind === 'tower' ? 96 + rng() * 52 : 62 + rng() * 34;
      const grad = mctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, `rgb(${glassL + 58},${glassL + 66},${glassL + 74})`);
      grad.addColorStop(0.4, `rgb(${glassL},${glassL + 10},${glassL + 20})`);
      grad.addColorStop(1, `rgb(${glassL - 22},${glassL - 14},${glassL - 4})`);
      mctx.fillStyle = grad;
      mctx.fillRect(x, y, w, h);
      // Frame
      mctx.strokeStyle = 'rgba(35,32,28,0.55)';
      mctx.lineWidth = 1.4;
      mctx.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4);
      if (kind === 'cottage') {
        // Muntin cross
        mctx.fillStyle = 'rgba(240,238,232,0.9)';
        mctx.fillRect(x + w / 2 - 1.2, y, 2.4, h);
        mctx.fillRect(x, y + h / 2 - 1.2, w, 2.4);
      }

      // Night: a subset of windows glow warm.
      if (rng() < (kind === 'tower' ? 0.46 : 0.68)) {
        ectx.fillStyle = `rgba(255,255,255,${0.4 + rng() * 0.6})`;
        ectx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
    }
  }

  const map = canvasTexture(mapCanvas);
  const emissive = canvasTexture(emiCanvas);
  const repeat: [number, number] = kind === 'tower' ? [2, 3] : [1, 1];
  map.repeat.set(...repeat);
  emissive.repeat.set(...repeat);
  return { map, emissive };
}
