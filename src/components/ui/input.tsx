'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-8 w-full rounded border border-line bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-faint',
          'outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded border border-line bg-surface px-2.5 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink-faint',
        'outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25',
        className,
      )}
      {...props}
    />
  );
});
