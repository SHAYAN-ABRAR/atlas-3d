import { DB_NAME, DB_VERSION, STORAGE_PREFIX } from '@/config/constants';
import type { ProjectRecord } from '@/types/project';

/** Hand-rolled typed IndexedDB access. One store: projects. */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction('projects', mode);
        const req = run(t.objectStore('projects'));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await tx<ProjectRecord[]>('readonly', (s) => s.getAll() as IDBRequest<ProjectRecord[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Promise<ProjectRecord | undefined> {
  return tx<ProjectRecord | undefined>('readonly', (s) => s.get(id) as IDBRequest<ProjectRecord | undefined>);
}

export function putProject(record: ProjectRecord): Promise<IDBValidKey> {
  return tx<IDBValidKey>('readwrite', (s) => s.put(record));
}

export function deleteProject(id: string): Promise<undefined> {
  return tx<undefined>('readwrite', (s) => s.delete(id) as IDBRequest<undefined>);
}

/* ------------------------------------------------------------------ */
/* localStorage helpers (namespaced, JSON, SSR-safe)                   */
/* ------------------------------------------------------------------ */

export function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — non-fatal.
  }
}

export function removeLocal(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_PREFIX + key);
}
