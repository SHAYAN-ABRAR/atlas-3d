import { classifyPixels } from '@/lib/classify';

/** Classifies downsampled map pixels off the main thread. */
self.onmessage = (
  e: MessageEvent<{ data: Uint8ClampedArray; width: number; height: number; factor?: number }>,
) => {
  const { data, width, height, factor } = e.data;
  const cells = classifyPixels(data, width, height, factor ?? 1);
  (self as unknown as Worker).postMessage({ cells });
};
