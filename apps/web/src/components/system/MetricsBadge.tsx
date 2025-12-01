import { cn } from '../../lib/cn';

export interface MetricsBadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  pulsate?: boolean;
}

const toneStyles: Record<NonNullable<MetricsBadgeProps['tone']>, string> = {
  neutral: 'bg-foreground/10 text-foreground',
  success: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/40',
  warning: 'bg-amber-500/10 text-amber-200 ring-amber-400/40',
  danger: 'bg-rose-500/10 text-rose-200 ring-rose-400/40',
  accent: 'bg-[#6C4DFF]/15 text-[#d8d0ff] ring-[#6C4DFF]/40',
};

export function MetricsBadge({ label, tone = 'neutral', pulsate }: MetricsBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] shadow-soft ring-1 ring-inset',
        toneStyles[tone],
        pulsate && 'animate-[pulse_1.4s_ease-in-out_infinite] drop-shadow-[0_0_12px_rgba(108,77,255,0.45)]'
      )}
    >
      {pulsate ? <span className="h-2 w-2 rounded-full bg-[#6C4DFF]" /> : null}
      {label}
    </span>
  );
}

export default MetricsBadge;
