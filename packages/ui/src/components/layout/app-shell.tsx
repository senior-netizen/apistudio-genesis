import * as React from 'react';
import './app-shell.css';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LucideIcon, Moon, Search, Sun } from 'lucide-react';

import { useSDLTheme } from '../../providers/theme-provider';
import { cn } from '../../utils/cn';
import { Button } from '../primitives/button';
import { CommandAction, CommandPalette } from './command-palette';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode | LucideIcon;
  href?: string;
  onSelect?: () => void;
  active?: boolean;
  badge?: string;
  description?: string;
}

export interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onSelect?: () => void;
}

export interface AppShellProps {
  workspaceName: string;
  workspaceBadge?: string;
  sidebarGroups: SidebarGroup[];
  sidebarFooter?: React.ReactNode;
  commandActions?: CommandAction[];
  children: React.ReactNode;
  topTitle?: string;
  contentKey?: string;
  breadcrumbs?: BreadcrumbItem[];
  topActions?: React.ReactNode;
  announcement?: React.ReactNode;
}

function renderIcon(icon?: React.ReactNode | LucideIcon) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;

  const IconComponent = icon as LucideIcon;
  return <IconComponent className="h-4 w-4" aria-hidden />;
}

const sidebarItemMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 }
};

export const AppShell: React.FC<AppShellProps> = ({
  workspaceName,
  workspaceBadge,
  sidebarGroups,
  sidebarFooter,
  commandActions = [],
  children,
  topTitle,
  contentKey,
  breadcrumbs,
  topActions,
  announcement
}) => {
  const { mode, setMode } = useSDLTheme();
  const prefersReducedMotion = useReducedMotion();
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>
      <aside className="hidden h-screen w-[240px] shrink-0 overflow-hidden border-r border-border/60 bg-background/40 px-5 py-8 backdrop-blur xl:flex xl:flex-col">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Workspace</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{workspaceName}</p>
          </div>
          {workspaceBadge ? (
            <span className="rounded-full border border-border/60 bg-white/50 px-3 py-1 text-xs font-medium text-muted dark:bg-white/10">
              {workspaceBadge}
            </span>
          ) : null}
        </div>
        <nav aria-label="Primary" className="ui-sidebar-scroll mt-8 flex-1 space-y-6 overflow-y-auto pr-1">
          {sidebarGroups.map((group, groupIndex) => (
            <div key={group.label ?? groupIndex} className="space-y-3">
              {group.label ? (
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted">{group.label}</p>
              ) : null}
              <ul className="space-y-1">
                <AnimatePresence initial={false}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const content = (
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-3 text-sm font-medium tracking-tight">
                          {renderIcon(Icon)}
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                            {item.badge}
                          </span>
                        ) : null}
                      </span>
                    );

                    const baseClasses = cn(
                      'group/nav flex w-full items-center rounded-lg px-3 py-2 text-sm transition',
                      item.active
                        ? 'bg-foreground/10 text-foreground shadow-inner'
                        : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                    );

                    const handleClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
                      if (item.onSelect) {
                        event.preventDefault();
                        item.onSelect();
                      }
                    };

                    const inner = item.onSelect
                      ? (
                          <button
                            type="button"
                            onClick={handleClick}
                            className={baseClasses}
                            aria-current={item.active ? 'page' : undefined}
                          >
                            {content}
                          </button>
                        )
                      : item.href
                      ? (
                          <a
                            href={item.href}
                            className={baseClasses}
                            aria-current={item.active ? 'page' : undefined}
                          >
                            {content}
                          </a>
                        )
                      : (
                          <button type="button" className={baseClasses} aria-current={item.active ? 'page' : undefined}>
                            {content}
                          </button>
                        );

                    return (
                      <motion.li
                        layout
                        key={item.id}
                        variants={sidebarItemMotion}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {inner}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          ))}
        </nav>
        {sidebarFooter ? <div className="mt-6 pt-6">{sidebarFooter}</div> : null}
      </aside>
      <div className="flex min-h-screen flex-1 flex-col bg-background/70">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              
              {breadcrumbs && breadcrumbs.length ? (
                
                <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm md:flex">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.label}>
                      {index !== 0 ? <span className="text-muted">/</span> : null}
                      {crumb.href ? (
                        <a
                          href={crumb.href}
                          onClick={(event) => {
                            if (crumb.onSelect) {
                              event.preventDefault();
                              crumb.onSelect();
                            }
                          }}
                          className="text-muted transition hover:text-foreground"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span
                          className="text-foreground"
                          role={crumb.onSelect ? 'button' : undefined}
                          tabIndex={crumb.onSelect ? 0 : undefined}
                          onClick={crumb.onSelect}
                          onKeyDown={(event) => {
                            if (crumb.onSelect && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              crumb.onSelect();
                            }
                          }}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {topActions}
             
            </div>
          </div>
        </header>
        <main
          id="main-content"
          className="relative flex-1 overflow-y-auto px-6 py-10"
          aria-live="polite"
          aria-busy={false}
        >
          <div className="mx-auto w-full max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={contentKey ?? topTitle ?? 'content'}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -12 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-10"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <CommandPalette actions={commandActions} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
};
