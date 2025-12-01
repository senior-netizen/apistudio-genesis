import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { motion as motionTokens } from '../../design/system/tokens';

export interface ToolbarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface MicroToolbarMenuProps {
  items: ToolbarItem[];
  className?: string;
  accessory?: ReactNode;
}

export function MicroToolbarMenu({ items, className, accessory }: MicroToolbarMenuProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-[14px] border border-white/5 bg-white/5 px-2 py-1 backdrop-blur-md shadow-[0_20px_60px_-32px_rgba(0,0,0,0.65)]',
        className
      )}
    >
      {items.map((item) => (
        <motion.button
          key={item.id}
          type="button"
          onClick={item.onSelect}
          disabled={item.disabled}
          whileHover={{ y: -0.5 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-2 rounded-[12px] px-3 py-2 text-xs uppercase tracking-[0.14em] transition',
            item.active
              ? 'bg-gradient-to-r from-[rgba(110,72,255,0.22)] via-white/6 to-white/10 text-foreground shadow-[0_10px_30px_-18px_rgba(110,72,255,0.75)] ring-1 ring-[rgba(110,72,255,0.35)]'
              : 'text-muted/80 hover:bg-white/5 hover:text-foreground',
            item.disabled && 'cursor-not-allowed opacity-60'
          )}
          style={{ transition: `all ${motionTokens.pageTransition}` }}
        >
          {item.icon ? <span className="text-sm">{item.icon}</span> : null}
          <span className="font-medium">{item.label}</span>
        </motion.button>
      ))}
      {accessory ? <div className="ml-2 text-[11px] uppercase tracking-[0.16em] text-muted/70">{accessory}</div> : null}
    </div>
  );
}

export default MicroToolbarMenu;
