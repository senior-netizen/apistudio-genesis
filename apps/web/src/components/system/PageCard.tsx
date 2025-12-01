import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface PageCardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'danger' | 'success';
}

export function PageCard({ title, subtitle, actions, children, footer, className, tone = 'default' }: PageCardProps) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'border-white/5 bg-gradient-to-br from-[rgba(20,22,28,0.9)] via-[rgba(18,20,26,0.84)] to-[rgba(12,14,17,0.95)]',
    accent: 'border-[rgba(110,72,255,0.4)] bg-gradient-to-br from-[rgba(110,72,255,0.16)] via-[rgba(20,22,28,0.9)] to-[rgba(12,14,17,0.95)] shadow-[0_26px_80px_-52px_rgba(110,72,255,0.6)]',
    danger: 'border-rose-500/30 bg-rose-500/10',
    success: 'border-emerald-500/30 bg-emerald-500/10',
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={cn(
        'rounded-[18px] border p-6 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.9)] backdrop-blur-xl',
        'hover:-translate-y-[1px] hover:border-[rgba(110,72,255,0.4)] hover:shadow-[0_35px_100px_-46px_rgba(110,72,255,0.45)] transition duration-200',
        toneClasses[tone],
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="text-lg font-medium tracking-tight text-foreground">{title}</h2> : null}
            {subtitle ? <p className="text-sm font-light text-muted/90">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
      {footer ? <div className="mt-4 border-t border-white/5 pt-4 text-sm text-muted">{footer}</div> : null}
    </motion.section>
  );
}

export default PageCard;
