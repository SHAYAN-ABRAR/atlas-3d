'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={cn('select-none', className)} ref={ref}>
      {label && <div className="mb-1 text-xs text-ink-muted">{label}</div>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded border border-line bg-surface px-2.5 text-[13px] text-ink',
            'outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/40',
          )}
        >
          <span className="truncate">{current?.label ?? value}</span>
          <ChevronDown
            size={13}
            className={cn('text-ink-faint transition-transform duration-150', open && 'rotate-180')}
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 z-50 mt-1 max-h-56 origin-top overflow-auto rounded-md bg-raised p-1 shadow-float"
            >
              {options.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px]',
                      o.value === value
                        ? 'bg-overlay text-ink'
                        : 'text-ink-muted hover:bg-overlay hover:text-ink',
                    )}
                  >
                    {o.label}
                    {o.value === value && <Check size={12} className="text-accent" />}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
