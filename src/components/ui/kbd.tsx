import { cn } from '@/lib/utils';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-line bg-surface px-1.5 font-mono text-2xs text-ink-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
