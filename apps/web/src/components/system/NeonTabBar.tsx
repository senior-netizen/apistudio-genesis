import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { glow, motion as motionTokens } from '../../design/system/tokens';

export interface NeonTab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  active?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface NeonTabBarProps {
  tabs: NeonTab[];
  className?: string;
  rightAccessory?: ReactNode;
}

export function NeonTabBar({ tabs, className, rightAccessory }: NeonTabBarProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-between rounded-[18px] border border-white/5 bg-gradient-to-r from-white/5 via-white/5 to-white/0 px-2 py-1',
        'backdrop-blur-xl shadow-[0_25px_60px_-34px_rgba(0,0,0,0.55)]',
        className
      )}
      style={{ boxShadow: glow.xs }}
    >
      <div className="flex flex-1 items-center gap-1">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            type="button"
            onClick={tab.onSelect}
            disabled={tab.disabled}
            whileHover={{ y: -1 }}
            className={cn(
              'relative flex items-center gap-2 rounded-[14px] px-3 py-2 text-sm transition',
              'tracking-[0.01em] text-foreground/80 hover:text-foreground',
              tab.active
                ? 'bg-gradient-to-r from-[rgba(110,72,255,0.25)] via-[rgba(110,72,255,0.18)] to-white/5 text-foreground shadow-[0_12px_38px_-18px_rgba(110,72,255,0.75)] ring-1 ring-[rgba(110,72,255,0.35)]'
                : 'bg-transparent text-muted/80 hover:bg-white/5',
              tab.disabled && 'cursor-not-allowed opacity-60'
            )}
            style={{ transition: `all ${motionTokens.pageTransition}` }}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-[12px] border border-white/10 text-xs',
                tab.active && 'border-[rgba(110,72,255,0.45)] bg-white/5 backdrop-blur'
              )}
            >
              {tab.icon}
            </span>
            <span className="font-medium leading-none">{tab.label}</span>
            {tab.badge ? (
              <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground/80">
                {tab.badge}
              </span>
            ) : null}
            {tab.active ? (
              <span
                className="absolute inset-0 -z-10 animate-[pulse_1800ms_ease_in_out_infinite] rounded-[14px] bg-[rgba(110,72,255,0.14)] blur-lg"
                aria-hidden
              />
            ) : null}
          </motion.button>
        ))}
      </div>
      {rightAccessory ? <div className="ml-3 flex items-center gap-2 text-xs text-muted/70">{rightAccessory}</div> : null}
    </div>
  );
}

export default NeonTabBar;
