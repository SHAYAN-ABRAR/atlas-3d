import { classifyPixels } from '@/lib/classify';

/** Classifies downsampled map pixels off the main thread. */
self.onmessage = (e: MessageEvent<{ data: Uint8ClampedArray; width: number; height: number }>) => {
  const { data, width, height } = e.data;
  const cells = classifyPixels(data, width, height);
  (self as unknown as Worker).postMessage({ cells });
};
