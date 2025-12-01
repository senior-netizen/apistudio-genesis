import { Button, Card } from '@sdl/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface OverlayModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose(): void;
  footer?: ReactNode;
}

export function OverlayModal({ isOpen, title, description, children, onClose, footer }: OverlayModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <Card className="relative w-full max-w-lg space-y-6 border border-border/60 bg-background/95 p-6 shadow-xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>
        <div className="space-y-4 text-sm text-foreground">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </Card>
    </div>
  );
}

export default OverlayModal;
