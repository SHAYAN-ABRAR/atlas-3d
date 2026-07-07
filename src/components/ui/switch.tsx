'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, className }: SwitchProps) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[18px] w-8 shrink-0 rounded-full border transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent/50',
        checked ? 'border-accent/50 bg-accent' : 'border-line-strong bg-raised',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        className={cn(
          'absolute top-[2px] h-3 w-3 rounded-full shadow-sm',
          checked ? 'right-[2px] bg-accent-fg' : 'left-[2px] bg-ink-faint',
        )}
      />
    </button>
  );
  if (!label) return control;
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-3', className)}>
      <span className="text-xs text-ink-muted">{label}</span>
      {control}
    </label>
  );
}
