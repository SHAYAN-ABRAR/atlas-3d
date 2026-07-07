'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Kbd } from '@/components/ui/kbd';
import { buildActions, type AppAction } from '@/config/actions';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  const set = useUIStore((s) => s.set);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = useMemo(() => buildActions(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.title} ${a.group} ${a.keywords ?? ''}`.toLowerCase().includes(q),
    );
  }, [actions, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, AppAction[]>();
    for (const a of filtered) {
      const g = groups.get(a.group) ?? [];
      g.push(a);
      groups.set(a.group, g);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = (action: AppAction) => {
    set({ paletteOpen: false });
    // Let the palette close before the action mutates heavy state.
    requestAnimationFrame(() => action.run());
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-[1px]"
          onPointerDown={(e) => e.target === e.currentTarget && set({ paletteOpen: false })}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ type: 'spring', stiffness: 550, damping: 40 }}
            className="mx-auto mt-[14vh] w-full max-w-lg overflow-hidden rounded-lg bg-raised shadow-float"
            role="dialog"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3.5">
              <Search size={14} className="text-ink-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setIndex((i) => Math.min(filtered.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter' && filtered[index]) {
                    run(filtered[index]);
                  }
                }}
                placeholder="Type a command…"
                className="h-11 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
              {grouped.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-ink-faint">
                  No matching commands
                </div>
              )}
              {grouped.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <div className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-ink-faint">
                    {group}
                  </div>
                  {items.map((a) => {
                    const i = filtered.indexOf(a);
                    return (
                      <button
                        key={a.id}
                        data-active={i === index}
                        onPointerMove={() => setIndex(i)}
                        onClick={() => run(a)}
                        className={cn(
                          'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[13px]',
                          i === index ? 'bg-overlay text-ink' : 'text-ink-muted',
                        )}
                      >
                        {a.title}
                        {a.shortcut && (
                          <span className="font-mono text-2xs text-ink-faint">{a.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
