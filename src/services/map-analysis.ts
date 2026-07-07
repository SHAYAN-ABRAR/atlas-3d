import { MAP_ANALYSIS_RES } from '@/config/constants';
import { classifyPixels } from '@/lib/classify';
import type { MapAnalysis } from '@/types/world';

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

function classifyInWorker(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('../workers/map-analysis.worker.ts', import.meta.url));
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('worker timeout'));
      }, 4000);
      worker.onmessage = (e: MessageEvent<{ cells: number[] }>) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(e.data.cells);
      };
      worker.onerror = () => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error('worker failed'));
      };
      worker.postMessage({ data, width, height });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Downsamples an uploaded map and classifies every cell as
 * terrain / water / vegetation / road / building.
 */
export async function analyzeMapImage(dataUrl: string, sourceName: string): Promise<MapAnalysis> {
  const img = await loadImage(dataUrl);
  const res = MAP_ANALYSIS_RES;
  const canvas = document.createElement('canvas');
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  // Cover-fit so aspect ratio doesn't skew classification.
  const scale = Math.max(res / img.width, res / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (res - dw) / 2, (res - dh) / 2, dw, dh);
  const { data } = ctx.getImageData(0, 0, res, res);

  let cells: number[];
  try {
    cells = await classifyInWorker(data, res, res);
  } catch {
    cells = classifyPixels(data, res, res); // main-thread fallback
  }

  const counts = [0, 0, 0, 0, 0];
  for (const c of cells) counts[c]++;
  const total = cells.length;

  return {
    width: res,
    height: res,
    cells,
    sourceName,
    coverage: {
      water: counts[1] / total,
      vegetation: counts[2] / total,
      road: counts[3] / total,
      building: counts[4] / total,
    },
  };
}
