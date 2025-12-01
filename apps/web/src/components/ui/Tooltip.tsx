import {
  cloneElement,
  useId,
  useState,
  type FocusEvent,
  type MouseEvent,
  forwardRef,
  type Ref,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  disabled?: boolean;
  delay?: number;
}

export const Tooltip = forwardRef<HTMLElement, TooltipProps>(function Tooltip(
  {
    content,
    children,
    side = 'top',
    className,
    disabled = false,
    delay = 120,
  }: TooltipProps,
  forwardedRef: Ref<HTMLElement>,
) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const id = useId();

  const show = () => {
    if (disabled) return;
    if (typeof window === 'undefined') {
      setOpen(true);
      return;
    }
    const handle = window.setTimeout(() => setOpen(true), delay);
    setTimer(handle);
  };

  const hide = () => {
    if (timer) {
      if (typeof window !== 'undefined') {
        window.clearTimeout(timer);
      }
      setTimer(null);
    }
    setOpen(false);
  };

  const sideClasses: Record<NonNullable<TooltipProps['side']>, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2 origin-top',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2 origin-right',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2 origin-left',
  };

  return (
    <span className="relative inline-flex">
      {cloneElement(children, {
        ref: forwardedRef,
        onMouseEnter: (event: MouseEvent<Element>) => {
          children.props.onMouseEnter?.(event);
          show();
        },
        onMouseLeave: (event: MouseEvent<Element>) => {
          children.props.onMouseLeave?.(event);
          hide();
        },
        onFocus: (event: FocusEvent<Element>) => {
          children.props.onFocus?.(event);
          show();
        },
        onBlur: (event: FocusEvent<Element>) => {
          children.props.onBlur?.(event);
          hide();
        },
        'aria-describedby': open ? id : undefined,
      })}
      <AnimatePresence>
        {open && !disabled ? (
          <motion.span
            key="tooltip"
            role="tooltip"
            id={id}
            initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute z-50 rounded-[10px] border border-border/60 bg-background/95 px-3 py-2 text-xs text-foreground shadow-soft backdrop-blur',
              sideClasses[side ?? 'top'],
              className,
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
});

export default Tooltip;
