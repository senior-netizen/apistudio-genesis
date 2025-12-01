import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Signal, Sparkles, WifiOff, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Toaster, toast as baseToast } from 'sonner';
import type { ExternalToast } from 'sonner';
import ToastCard, { type ToastAction, type ToastTone } from './ToastCard';
import { useTheme } from '../../../providers/ThemeProvider';
import { sanitizeErrorMessage } from '../../../utils/errorSanitizer';

export type ToastChannel = 'auth' | 'network' | 'ai' | 'request' | 'system';

export interface ToastOptions {
  id?: string | number;
  title: string;
  description?: string;
  tone?: ToastTone;
  /**
   * @deprecated use tone instead
   */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  channel?: ToastChannel;
  actions?: ToastAction[];
  duration?: number;
  dismissible?: boolean;
  accent?: string;
  confetti?: boolean;
  icon?: LucideIcon;
}

interface ToastContextValue {
  push: (options: ToastOptions) => string | number;
  dismiss: (id?: string | number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const channelIcon: Record<ToastChannel, LucideIcon> = {
  auth: ShieldAlert,
  network: WifiOff,
  ai: Sparkles,
  request: Zap,
  system: Signal,
};

function resolveTone(option?: ToastTone | ToastOptions['variant']): ToastTone {
  if (!option) return 'neutral';
  if (option === 'success' || option === 'warning' || option === 'danger') return option;
  if (option === 'default') return 'neutral';
  return option as ToastTone;
}

function useResponsivePosition() {
  const [position, setPosition] = useState<'bottom-right' | 'top-center'>('bottom-right');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      setPosition(event.matches ? 'top-center' : 'bottom-right');
    };

    handler(media);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return position;
}

function ToastViewportOverlay() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useTheme();
  const position = useResponsivePosition();
  const lastMessages = useRef(new Set<string>());

  useEffect(() => {
    const cleanup = setInterval(() => {
      lastMessages.current.clear();
    }, 60_000);
    return () => clearInterval(cleanup);
  }, []);

  const push = ({
    id,
    title,
    description,
    tone,
    variant,
    channel = 'system',
    actions,
    duration = 6200,
    dismissible = true,
    accent,
    confetti,
    icon,
  }: ToastOptions) => {
    const resolvedTone = resolveTone(tone ?? variant ?? 'neutral');
    const safeTitle = sanitizeErrorMessage(title, 140);
    const safeDescription = sanitizeErrorMessage(description, 420);
    const duplicateKey = `${safeTitle}-${safeDescription}-${resolvedTone}`;

    if (lastMessages.current.has(duplicateKey)) {
      return id ?? duplicateKey;
    }
    lastMessages.current.add(duplicateKey);

    const toastId = baseToast.custom(
      (toastId) => (
        <ToastCard
          id={toastId}
          title={safeTitle}
          description={safeDescription}
          tone={resolvedTone}
          channel={channel}
          accent={accent}
          actions={actions}
          onDismiss={dismissible ? baseToast.dismiss : undefined}
          confetti={confetti}
          icon={icon ?? channelIcon[channel]}
        />
      ),
      {
        id,
        duration: duration === 0 ? Infinity : duration,
      } as ExternalToast,
    );

    return toastId;
  };

  const dismiss = (toastId?: string | number) => {
    baseToast.dismiss(toastId);
  };

  const value = useMemo<ToastContextValue>(() => ({ push, dismiss }), [dismiss, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position={position}
        theme={resolvedMode === 'system' ? 'system' : resolvedMode}
        toastOptions={{
          classNames: {
            toast:
              'pointer-events-auto w-full max-w-xl sm:max-w-sm rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80',
          },
        }}
        gap={12}
        offset={20}
        richColors
        closeButton
      />
      <ToastViewportOverlay />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
