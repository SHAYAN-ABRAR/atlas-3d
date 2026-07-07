'use client';

import { useEffect } from 'react';
import { debounce } from '@/lib/utils';
import { renderThumbnail } from '@/lib/minimap-draw';
import { generateWorld } from '@/lib/worldgen';
import { putProject } from '@/services/db';
import { useProjectStore } from '@/stores/project-store';

/**
 * Debounced autosave to IndexedDB. Every world/name/map change persists ~1.2s
 * after the user stops editing; `atlas:save-now` (Ctrl+S) flushes immediately.
 */
export function useAutosave() {
  useEffect(() => {
    let disposed = false;

    const save = async () => {
      const st = useProjectStore.getState();
      if (!st.projectId || !st.dirty || disposed) return;
      let thumbnail: string | null = null;
      try {
        thumbnail = renderThumbnail(generateWorld(st.world), st.world);
      } catch {
        // Thumbnail is decorative — never block a save on it.
      }
      const record = st.toRecord(thumbnail);
      if (!record) return;
      try {
        await putProject(record);
        st.markSaved();
      } catch (err) {
        st.log('error', `Autosave failed: ${String(err)}`);
      }
    };

    const debounced = debounce(save, 1200);
    const unsub = useProjectStore.subscribe((state, prev) => {
      if (state.world !== prev.world || state.name !== prev.name || state.mapImage !== prev.mapImage) {
        debounced();
      }
    });

    const saveNow = () => void save();
    window.addEventListener('atlas:save-now', saveNow);
    window.addEventListener('beforeunload', saveNow);
    return () => {
      disposed = true;
      debounced.cancel();
      unsub();
      window.removeEventListener('atlas:save-now', saveNow);
      window.removeEventListener('beforeunload', saveNow);
    };
  }, []);
}
