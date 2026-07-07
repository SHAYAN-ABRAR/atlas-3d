import { uid, downloadText } from '@/lib/utils';
import type { AtlasShareFile, ProjectRecord } from '@/types/project';

/**
 * Portable project transfer. The .atlas3d file contains the full world
 * description plus the source map image — drop it into Atlas 3D on any
 * machine and the identical world regenerates from the same seed.
 */

export function exportProjectFile(record: ProjectRecord) {
  const file: AtlasShareFile = {
    format: 'atlas3d',
    version: 1,
    exportedAt: Date.now(),
    project: record,
  };
  const safe = record.name.replace(/[^\w\- ]+/g, '').trim() || 'world';
  downloadText(JSON.stringify(file, null, 2), `${safe}.atlas3d`);
}

export async function readShareFile(file: File): Promise<ProjectRecord> {
  const text = await file.text();
  const parsed = JSON.parse(text) as AtlasShareFile;
  if (parsed.format !== 'atlas3d' || !parsed.project?.world) {
    throw new Error('Not a valid .atlas3d file');
  }
  return {
    ...parsed.project,
    id: uid('p_'), // Always a fresh id so imports never clobber local projects.
    updatedAt: Date.now(),
  };
}

export function isShareFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.atlas3d') || file.type === 'application/json';
}
