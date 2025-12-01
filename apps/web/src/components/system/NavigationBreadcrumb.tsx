import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface NavigationBreadcrumbItem {
  label: string;
  href?: string;
  onSelect?: () => void;
}

export interface NavigationBreadcrumbProps {
  items: NavigationBreadcrumbItem[];
}

export function NavigationBreadcrumb({ items }: NavigationBreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const className = cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 transition',
            isLast ? 'bg-foreground/5 text-foreground' : 'hover:bg-foreground/5 hover:text-foreground/90',
          );
          return (
            <li key={item.label} className="flex items-center gap-2">
              <button type="button" onClick={item.onSelect} className={className} disabled={isLast && !item.onSelect}>
                <span>{item.label}</span>
              </button>
              {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default NavigationBreadcrumb;
