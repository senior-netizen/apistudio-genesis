import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { colors, glow, radius } from '../../design/system/tokens';

export interface WalletPanelProps {
  planName: string;
  creditsAvailable: string | number;
  renewalDate?: string;
  currencyLabel?: string;
  accentChip?: string;
  footer?: ReactNode;
  actions?: ReactNode;
  className?: string;
  secondaryMetric?: { label: string; value: string | number };
}

export function WalletPanel({
  planName,
  creditsAvailable,
  renewalDate,
  currencyLabel,
  accentChip,
  footer,
  actions,
  className,
  secondaryMetric
}: WalletPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-[20px] border border-white/5 bg-gradient-to-br from-[rgba(20,22,28,0.9)] via-[rgba(20,22,28,0.8)] to-[rgba(12,14,17,0.98)] p-5 text-left shadow-[0_25px_70px_-36px_rgba(0,0,0,0.75)]',
        className
      )}
      style={{ boxShadow: glow.sm, borderRadius: radius.lg }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(110,72,255,0.18),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl" style={{ background: colors.accentGlow }} />
      <div className="relative z-[1] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted/80">Plan & Credits</p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-medium tracking-tight text-foreground/95">{planName}</span>
              {accentChip ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80">
                  {accentChip}
                </span>
              ) : null}
            </div>
            {renewalDate ? <p className="text-xs text-muted/75">Renews on {renewalDate}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2 text-sm text-muted">{actions}</div> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-[16px] border border-white/5 bg-white/5 px-4 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-muted/70">Available Credits</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-medium leading-none tracking-tight text-white">{creditsAvailable}</span>
              {currencyLabel ? <span className="text-sm text-muted/80">{currencyLabel}</span> : null}
            </div>
          </div>
          {secondaryMetric ? (
            <div className="flex items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.04] px-4 py-3 backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted/70">{secondaryMetric.label}</p>
                <p className="mt-1 text-xl font-medium tracking-tight text-foreground/95">{secondaryMetric.value}</p>
              </div>
              <div className="rounded-full bg-white/10 p-2 text-muted">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          ) : null}
        </div>

        {footer ? <div className="border-t border-white/5 pt-3 text-xs text-muted/80">{footer}</div> : null}
      </div>
    </motion.div>
  );
}

export default WalletPanel;
