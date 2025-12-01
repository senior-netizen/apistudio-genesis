import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface SidebarItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
  tone?: 'accent' | 'success' | 'warning' | 'neutral';
}

export interface AppSidebarProps {
  items: SidebarItem[];
  footer?: ReactNode;
  title?: string;
}

export function AppSidebar({ items, footer, title }: AppSidebarProps) {
  return (
    <aside className="relative flex h-full flex-col gap-4 rounded-[18px] border border-white/5 bg-gradient-to-b from-[rgba(20,22,28,0.9)] via-[rgba(18,20,26,0.85)] to-[rgba(12,14,17,0.95)] p-4 shadow-[0_26px_80px_-46px_rgba(0,0,0,0.85)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(110,72,255,0.18),transparent_40%)]" aria-hidden />
      {title ? <p className="relative z-[1] text-[11px] uppercase tracking-[0.28em] text-muted/80">{title}</p> : null}
      <nav className="relative z-[1] space-y-1" aria-label="Primary">
        {items.map((item) => (
          <motion.button
            key={item.label}
            type="button"
            onClick={item.onClick}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'group flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-sm transition duration-150',
              item.active
                ? 'bg-gradient-to-r from-[rgba(110,72,255,0.26)] via-[rgba(110,72,255,0.12)] to-white/5 text-foreground shadow-[0_16px_38px_-28px_rgba(110,72,255,0.65)] ring-1 ring-[rgba(110,72,255,0.35)]'
                : 'text-muted hover:bg-white/5 hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 text-muted shadow-[0_10px_30px_-18px_rgba(0,0,0,0.75)]',
                  item.active && 'border-[rgba(110,72,255,0.45)] bg-white/5 text-foreground'
                )}
              >
                {item.icon}
              </span>
              <span className="font-medium tracking-[0.01em]">{item.label}</span>
            </span>
            {item.badge ? (
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide backdrop-blur',
                  item.tone === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : item.tone === 'warning'
                      ? 'bg-amber-500/10 text-amber-200'
                      : 'bg-[#6C4DFF]/15 text-[#d8d0ff]'
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </motion.button>
        ))}
      </nav>
      {footer ? <div className="mt-auto pt-4 text-sm text-muted/70">{footer}</div> : null}
    </aside>
  );
}

export default AppSidebar;
