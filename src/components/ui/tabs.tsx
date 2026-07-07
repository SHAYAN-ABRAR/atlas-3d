'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string }[];
  className?: string;
  /** Unique id so multiple tab strips don't share the sliding pill. */
  layoutId: string;
}

/** Segmented tab strip with a sliding highlight. */
export function Tabs<T extends string>({ value, onChange, tabs, className, layoutId }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-0.5 rounded-md bg-surface p-0.5', className)}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'relative flex-1 rounded px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40',
            value === t.value ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
          )}
        >
          {value === t.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded bg-raised shadow-soft"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative z-10">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
