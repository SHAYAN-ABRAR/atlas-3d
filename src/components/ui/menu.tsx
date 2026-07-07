'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface DropdownMenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: (MenuItem | 'separator')[];
  align?: 'left' | 'right';
  width?: number;
}

export function DropdownMenu({ trigger, items, align = 'right', width = 208 }: DropdownMenuProps) {
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

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{ width }}
            className={cn(
              'absolute z-[70] mt-1 origin-top rounded-md bg-raised p-1 shadow-float',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, i) =>
              item === 'separator' ? (
                <div key={`sep-${i}`} className="mx-1 my-1 h-px bg-line" />
              ) : (
                <button
                  key={item.label}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors',
                    'disabled:pointer-events-none disabled:opacity-40',
                    item.danger
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-ink-muted hover:bg-overlay hover:text-ink',
                  )}
                >
                  {item.icon && <span className="text-ink-faint">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.hint && (
                    <span className="font-mono text-2xs text-ink-faint">{item.hint}</span>
                  )}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
