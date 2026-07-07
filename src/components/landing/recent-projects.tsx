'use client';

import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/utils';
import { deleteProject, listProjects, saveLocal } from '@/services/db';
import type { ProjectRecord } from '@/types/project';

export function RecentProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  if (!projects || projects.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-20">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
        Recent projects
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {projects.slice(0, 8).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-line-strong"
          >
            <button
              onClick={() => {
                saveLocal('current-project', p.id);
                router.push('/studio');
              }}
              className="block w-full text-left"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-overlay">
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 ease-swift group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xs text-ink-faint">
                    No preview yet
                  </div>
                )}
              </div>
              <div className="px-2.5 py-2">
                <div className="truncate text-xs font-medium text-ink">{p.name}</div>
                <div className="mt-0.5 text-2xs text-ink-faint">{timeAgo(p.updatedAt)}</div>
              </div>
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await deleteProject(p.id);
                setProjects((cur) => cur?.filter((x) => x.id !== p.id) ?? null);
              }}
              className="absolute right-1.5 top-1.5 rounded bg-black/45 p-1 text-white/80 opacity-0 backdrop-blur-sm transition-opacity hover:text-white group-hover:opacity-100"
              aria-label={`Delete ${p.name}`}
            >
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
