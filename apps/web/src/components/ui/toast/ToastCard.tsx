import { motion } from 'framer-motion';
import React from 'react';
import { cn } from '../../../lib/cn';
import { CircleCheck, Info, ShieldAlert, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  emphasis?: 'primary' | 'ghost';
}

export interface ToastCardProps {
  id: string | number;
  title: string;
  description?: string;
  tone: ToastTone;
  channel?: 'auth' | 'network' | 'ai' | 'request' | 'system';
  accent?: string;
  actions?: ToastAction[];
  onDismiss?: (id: string | number) => void;
  confetti?: boolean;
  icon?: LucideIcon | ReactNode;
}

const toneStyles: Record<ToastTone, string> = {
  neutral: 'border-white/30 bg-white/60 text-foreground shadow-[6px_6px_18px_rgba(0,0,0,0.08),_-6px_-6px_18px_rgba(255,255,255,0.35)] dark:border-white/10 dark:bg-white/5',
  success: 'border-emerald-200/60 bg-emerald-50/80 text-emerald-900 shadow-[6px_6px_18px_rgba(16,185,129,0.15),_-6px_-6px_18px_rgba(209,250,229,0.4)] dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50',
  warning: 'border-amber-200/70 bg-amber-50/85 text-amber-900 shadow-[6px_6px_18px_rgba(245,158,11,0.14),_-6px_-6px_18px_rgba(254,243,199,0.4)] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50',
  danger: 'border-rose-200/70 bg-rose-50/85 text-rose-900 shadow-[6px_6px_18px_rgba(244,63,94,0.14),_-6px_-6px_18px_rgba(254,226,226,0.4)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50',
  info: 'border-sky-200/70 bg-sky-50/85 text-sky-900 shadow-[6px_6px_18px_rgba(14,165,233,0.14),_-6px_-6px_18px_rgba(224,242,254,0.4)] dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50',
};

const channelBadge: Record<NonNullable<ToastCardProps['channel']>, string> = {
  auth: 'bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white',
  network: 'bg-gradient-to-r from-sky-500/80 to-cyan-500/80 text-white',
  ai: 'bg-gradient-to-r from-amber-400/90 to-pink-500/90 text-white',
  request: 'bg-gradient-to-r from-emerald-500/80 to-blue-500/80 text-white',
  system: 'bg-foreground/10 text-foreground',
};

const defaultIcons: Partial<Record<ToastTone, LucideIcon>> = {
  success: CircleCheck,
  warning: ShieldAlert,
  danger: ShieldAlert,
  info: Info,
};

function ConfettiBurst({ active }: { active?: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 10 }).map((_, index) => {
        const delay = index * 0.05;
        const left = 5 + index * 9;
        return (
          <span
            key={index}
            className="absolute h-1.5 w-2 rounded-full bg-gradient-to-br from-pink-500 via-amber-400 to-emerald-400 opacity-0"
            style={{
              left: `${left}%`,
              top: `${20 + (index % 3) * 10}%`,
              animation: `toast-confetti 0.9s ease-out ${delay}s forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ToastCard({
  id,
  title,
  description,
  tone,
  channel,
  accent,
  actions,
  onDismiss,
  confetti,
  icon,
}: ToastCardProps) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="h-5 w-5" aria-hidden />;
    }
    if (icon && typeof icon === 'object') {
      const IconComponent = icon as unknown as LucideIcon;
      return <IconComponent className="h-5 w-5" aria-hidden />;
    }
    const FallbackIcon = defaultIcons[tone] ?? Sparkles;
    return <FallbackIcon className="h-5 w-5" aria-hidden />;
  };
  const iconNode = renderIcon();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.9 }}
      style={{ willChange: 'transform, opacity' }}
      className={cn(
        'relative w-full max-w-xl overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5',
        'pointer-events-auto shadow-soft',
        toneStyles[tone],
      )}
    >
      <ConfettiBurst active={confetti} />
      <div className="flex items-start gap-3 min-w-0">
        <motion.span
          whileHover={{ scale: 1.08, rotate: -3 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-foreground shadow-[inset_2px_2px_6px_rgba(0,0,0,0.08)]',
            'dark:bg-white/10 dark:text-white/90',
            accent,
          )}
        >
          {iconNode}
        </motion.span>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold leading-tight tracking-tight break-words">{title}</p>
              {description ? (
                <p className="text-sm text-foreground/80 dark:text-white/80 break-words whitespace-pre-wrap">
                  {description}
                </p>
              ) : null}
            </div>
            {channel ? (
              <span
                className={cn(
                  'ml-auto inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em]',
                  channelBadge[channel],
                )}
              >
                {channel}
              </span>
            ) : null}
          </div>
          {actions?.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      'group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition',
                      action.emphasis === 'primary'
                        ? 'bg-foreground/10 text-foreground backdrop-blur hover:bg-foreground/15 dark:bg-white/10 dark:text-white'
                        : 'border border-foreground/10 bg-white/60 text-foreground hover:border-foreground/20 dark:border-white/10 dark:bg-white/5 dark:text-white',
                    )}
                  >
                    {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" aria-hidden /> : null}
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(id)}
            className="ml-auto rounded-full p-2 text-sm font-semibold text-foreground/70 transition hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
          >
            ×
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export default ToastCard;
