'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  id?: string;
}

/** Collapsible inspector section with an animated disclosure. */
export function Section({ title, icon, defaultOpen = true, children, actions, id }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line" id={id}>
      <div className="flex items-center pr-2">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 select-none items-center gap-1.5 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ChevronRight
            size={12}
            className={cn(
              'text-ink-faint transition-transform duration-150 ease-swift',
              open && 'rotate-90',
            )}
          />
          {icon && <span className="text-ink-faint">{icon}</span>}
          <span className="text-xs font-medium tracking-wide text-ink">{title}</span>
        </button>
        {actions}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-3 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
