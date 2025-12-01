import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { glow } from '../../design/system/tokens';

export interface FrostModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FrostModal({ open, title, description, onClose, children, footer, className }: FrostModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'relative w-full max-w-3xl overflow-hidden rounded-[22px] border border-white/8 bg-gradient-to-br from-[rgba(20,22,28,0.95)] via-[rgba(20,22,28,0.9)] to-[rgba(12,14,17,0.98)] p-6 text-left shadow-[0_30px_120px_-50px_rgba(0,0,0,0.85)]',
              className
            )}
            style={{ boxShadow: glow.sm }}
            role="dialog"
            aria-modal
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(110,72,255,0.24),transparent_38%)]" />
            <div className="relative z-[1] flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  {title ? <h2 className="text-2xl font-medium tracking-tight text-foreground">{title}</h2> : null}
                  {description ? <p className="text-sm text-muted/85 leading-relaxed">{description}</p> : null}
                </div>
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-muted transition hover:border-white/40 hover:text-foreground"
                    aria-label="Close dialog"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                ) : null}
              </div>

              <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>

              {footer ? <div className="mt-2 border-t border-white/10 pt-4 text-sm text-muted/85">{footer}</div> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default FrostModal;
