/**
 * Tiny typed event bus for imperative viewport actions (camera moves, exports,
 * screenshots) that don't belong in reactive state.
 */

export interface BusEvents {
  'camera:pose': { position: [number, number, number]; target: [number, number, number] };
  'camera:flythrough': void;
  'camera:frame': void;
  'viewport:screenshot': void;
  'viewport:fullscreen': void;
  'export:gltf': void;
  'export:obj': void;
  'minimap:teleport': { x: number; z: number };
}

type Handler<T> = (payload: T) => void;

const handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

export function on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(fn as Handler<never>);
  return () => set!.delete(fn as Handler<never>);
}

export function emit<K extends keyof BusEvents>(
  event: K,
  ...payload: BusEvents[K] extends void ? [] : [BusEvents[K]]
) {
  handlers.get(event)?.forEach((fn) => (fn as Handler<BusEvents[K] | undefined>)(payload[0]));
}

/**
 * Live (non-reactive) values written every frame by the viewport and read by
 * the minimap / status bar on their own cadence. Kept out of React state on purpose.
 */
export const viewportRuntime = {
  cameraPosition: [80, 60, 80] as [number, number, number],
  cameraHeading: 0,
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  flythrough: false,
};
