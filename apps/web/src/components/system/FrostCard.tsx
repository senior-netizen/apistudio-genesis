import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { colors, glow, radius, frostedSurface } from '../../design/system/tokens';

export interface FrostCardProps {
  title?: string;
  subtitle?: string;
  kicker?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'success';
}

export function FrostCard({
  title,
  subtitle,
  kicker,
  actions,
  children,
  footer,
  className,
  tone = 'default'
}: FrostCardProps) {
  const toneStyles: Record<typeof tone, string> = {
    default: 'from-white/4 via-white/2 to-white/[0.01] border-white/5',
    accent: 'from-[rgba(110,72,255,0.16)] via-white/6 to-white/[0.03] border-[#6E48FF]/50 shadow-[0_25px_80px_-40px_rgba(110,72,255,0.35)]',
    success: 'from-[rgba(48,230,140,0.12)] via-white/4 to-white/[0.01] border-emerald-400/40'
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        background: `linear-gradient(145deg, ${colors.surfacePanel} 0%, ${colors.surfaceDark} 40%, rgba(255,255,255,0.02) 100%)`,
        boxShadow: tone === 'accent' ? glow.sm : glow.xs,
        borderRadius: radius.lg,
        backdropFilter: frostedSurface
      }}
      className={cn(
        'relative overflow-hidden border px-6 py-5 transition duration-200',
        'hover:-translate-y-[1px] hover:border-[rgba(110,72,255,0.35)] hover:shadow-[0_25px_70px_-38px_rgba(0,0,0,0.75)]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_20%,rgba(110,72,255,0.14),transparent_38%)] before:opacity-60',
        'after:pointer-events-none after:absolute after:inset-[-20%] after:opacity-30 after:blur-3xl after:bg-[conic-gradient(from_120deg_at_50%_50%,rgba(110,72,255,0.35),transparent,rgba(255,255,255,0.05),transparent)]',
        toneStyles[tone],
        className
      )}
    >
      <div className="relative z-[1] flex flex-col gap-4">
        {(kicker || title || actions) && (
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              {kicker ? (
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted/80">{kicker}</span>
              ) : null}
              {title ? (
                <h3 className="text-lg font-medium text-foreground/95 tracking-tight">{title}</h3>
              ) : null}
              {subtitle ? <p className="text-sm text-muted/85 leading-relaxed">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-2 text-sm text-muted">{actions}</div> : null}
          </div>
        )}
        <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
        {footer ? <div className="mt-4 border-t border-white/5 pt-4 text-xs text-muted/80">{footer}</div> : null}
      </div>
    </motion.section>
  );
}

export default FrostCard;
