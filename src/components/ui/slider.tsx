'use client';

import { cn } from '@/lib/utils';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  className?: string;
}

/** Label + value + range control. The workhorse of the inspector. */
export function SliderField({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  className,
}: SliderFieldProps) {
  return (
    <label className={cn('block select-none', className)}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className="font-mono text-2xs tabular-nums text-ink-faint">
          {format ? format(value) : value.toFixed(step >= 1 ? 0 : 2)}
        </span>
      </div>
      <input
        type="range"
        className="atlas-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
