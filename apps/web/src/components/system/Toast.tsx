import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastMessage {
  id: string | number;
  title: string;
  description?: string;
  tone?: ToastTone;
  icon?: ReactNode;
}

export interface ToastProps {
  messages: ToastMessage[];
  onDismiss?: (id: string | number) => void;
}

const toneStyles: Record<ToastTone, string> = {
  neutral: 'border-white/10 bg-background/80',
  success: 'border-emerald-400/40 bg-emerald-500/5',
  warning: 'border-amber-400/40 bg-amber-500/5',
  danger: 'border-rose-400/40 bg-rose-500/5',
};

export function Toast({ messages, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'pointer-events-auto w-full max-w-xl overflow-hidden rounded-[14px] border px-4 py-3 shadow-glass backdrop-blur-lg',
              toneStyles[message.tone ?? 'neutral'],
              'from-background/90 to-background/60'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-foreground/10 text-foreground">
                {message.icon ?? <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#6C4DFF]" />}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">{message.title}</p>
                {message.description ? <p className="text-sm text-muted">{message.description}</p> : null}
              </div>
              {onDismiss ? (
                <button
                  type="button"
                  onClick={() => onDismiss(message.id)}
                  className="rounded-full p-2 text-sm text-muted transition hover:bg-foreground/5 hover:text-foreground"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Toast;
