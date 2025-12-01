import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { colors, glow } from '../../design/system/tokens';

export interface PresenceIndicatorOrbProps {
  label: string;
  pulse?: boolean;
  color?: string;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export function PresenceIndicatorOrb({ label, pulse = true, color, tooltip, onClick, className }: PresenceIndicatorOrbProps) {
  const accent = color ?? colors.primary;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-left text-xs font-medium uppercase tracking-[0.14em] text-foreground/80 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.9)]',
        className
      )}
      title={tooltip ?? label}
      style={{ boxShadow: glow.xs }}
    >
      <span className="relative h-8 w-8">
        {pulse ? (
          <span
            className="absolute inset-0 animate-[pulse_1800ms_ease_in_out_infinite] rounded-full"
            style={{
              background: `radial-gradient(circle, ${accent} 0%, transparent 60%)`,
              filter: 'blur(6px)',
              opacity: 0.55
            }}
            aria-hidden
          />
        ) : null}
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-white/10 to-white/0 text-[11px] font-semibold text-white"
          style={{ boxShadow: `0 0 0 6px rgba(255,255,255,0.05), 0 0 32px -10px ${accent}`, backgroundImage: `radial-gradient(circle at 30% 30%, ${accent}, transparent 55%)` }}
        >
          {label.slice(0, 2).toUpperCase()}
        </span>
      </span>
      <span className="leading-tight">Present</span>
    </motion.button>
  );
}

export default PresenceIndicatorOrb;
