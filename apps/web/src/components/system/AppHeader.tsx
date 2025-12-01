import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import NavigationBreadcrumb from './NavigationBreadcrumb';
import MetricsBadge from './MetricsBadge';

export interface AppHeaderAction {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
  href?: string;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string; onSelect?: () => void }>;
  actions?: ReactNode;
  status?: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' };
  meta?: ReactNode;
}

export function AppHeader({ title, subtitle, breadcrumbs, actions, status, meta }: AppHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[18px] border border-white/5 bg-gradient-to-br from-[rgba(20,22,28,0.88)] via-[rgba(18,20,26,0.82)] to-[rgba(12,14,17,0.95)] p-7 shadow-[0_28px_90px_-52px_rgba(0,0,0,0.9)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(108,77,255,0.16),transparent_38%)]" aria-hidden />
      <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          {breadcrumbs?.length ? <NavigationBreadcrumb items={breadcrumbs} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-medium leading-tight tracking-tight text-foreground md:text-[2rem]">{title}</h1>
            {status ? <MetricsBadge label={status.label} tone={status.tone ?? 'accent'} pulsate={status.tone === 'accent'} /> : null}
          </div>
          {subtitle ? <p className="max-w-3xl text-sm font-light text-muted/90 md:text-base">{subtitle}</p> : null}
          {meta ? <div className="text-xs uppercase tracking-[0.2em] text-muted/70">{meta}</div> : null}
        </div>
        {actions ? <div className="flex items-center gap-3 rounded-[14px] border border-white/5 bg-white/5 px-3 py-2 backdrop-blur">{actions}</div> : null}
      </div>
    </motion.header>
  );
}

export default AppHeader;
