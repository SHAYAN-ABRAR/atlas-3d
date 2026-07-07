import type { WorldState } from './world';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Small JPEG data-url used on the landing page. */
  thumbnail: string | null;
}

export interface ProjectRecord extends ProjectMeta {
  world: WorldState;
  /** Original uploaded map image as data-url, if any. */
  mapImage: string | null;
}

export interface CameraBookmark {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

/** Portable file format for moving a project between machines (.atlas3d). */
export interface AtlasShareFile {
  format: 'atlas3d';
  version: 1;
  exportedAt: number;
  project: ProjectRecord;
}
