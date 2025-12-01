import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { colors, glow } from '../../design/system/tokens';

export type PulseTone = 'accent' | 'success' | 'warning' | 'neutral';

export interface PulseStatusBadgeProps {
  label: string;
  tone?: PulseTone;
  className?: string;
}

const toneMap: Record<PulseTone, { bg: string; ring: string; text: string }> = {
  accent: {
    bg: 'from-[rgba(110,72,255,0.3)] to-[rgba(110,72,255,0.15)]',
    ring: colors.accentGlow,
    text: 'text-foreground'
  },
  success: {
    bg: 'from-[rgba(48,230,140,0.32)] to-[rgba(48,230,140,0.12)]',
    ring: colors.successPulse,
    text: 'text-emerald-100'
  },
  warning: {
    bg: 'from-amber-400/30 to-amber-400/10',
    ring: 'rgba(255, 196, 118, 0.45)',
    text: 'text-amber-50'
  },
  neutral: {
    bg: 'from-white/12 to-white/5',
    ring: 'rgba(255, 255, 255, 0.18)',
    text: 'text-foreground/80'
  }
};

export function PulseStatusBadge({ label, tone = 'accent', className }: PulseStatusBadgeProps) {
  const toneConfig = toneMap[tone];

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <motion.span
        aria-hidden
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: 1.08, opacity: 0 }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 0 12px transparent, 0 0 40px 4px ${toneConfig.ring}` }}
      />
      <span
        className={cn(
          'relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]',
          `bg-gradient-to-r ${toneConfig.bg} ${toneConfig.text} shadow-[0_10px_35px_-18px_rgba(0,0,0,0.75)]`
        )}
        style={{ boxShadow: glow.xs }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_0_6px_rgba(255,255,255,0.08)]" aria-hidden />
        {label}
      </span>
    </div>
  );
}

export default PulseStatusBadge;
