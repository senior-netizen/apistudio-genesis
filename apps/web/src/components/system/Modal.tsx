import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, description, onClose, children, footer }: ModalProps) {
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
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-[rgba(20,22,28,0.95)] via-[rgba(18,20,26,0.9)] to-[rgba(12,14,17,0.96)] p-6 shadow-[0_35px_110px_-60px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-modal
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(110,72,255,0.24),transparent_42%)]" aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <div>
                {title ? <h2 className="text-xl font-medium tracking-tight text-foreground">{title}</h2> : null}
                {description ? <p className="mt-1 text-sm font-light text-muted">{description}</p> : null}
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
            <div className="mt-4 text-sm leading-relaxed text-foreground/90">{children}</div>
            {footer ? <div className="mt-6 border-t border-white/10 pt-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default Modal;
