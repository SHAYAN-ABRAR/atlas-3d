'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  label: string;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
  className?: string;
}

const sideClass = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export function Tooltip({ label, shortcut, side = 'bottom', children, className }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={() => {
        timer.current = setTimeout(() => setShow(true), 450);
      }}
      onPointerLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setShow(false);
      }}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            role="tooltip"
            className={cn(
              'pointer-events-none absolute z-[80] flex items-center gap-1.5 whitespace-nowrap rounded bg-raised px-2 py-1 text-2xs text-ink shadow-float',
              sideClass[side],
            )}
          >
            {label}
            {shortcut && <kbd className="font-mono text-2xs text-ink-faint">{shortcut}</kbd>}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
