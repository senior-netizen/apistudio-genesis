import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '../../utils/cn';

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  onSelect: () => void;
  section?: string;
}

export interface CommandPaletteProps {
  actions?: CommandAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SectionWithActions {
  section: string;
  items: CommandAction[];
}

const normalize = (value: string) => value.trim().toLowerCase();

const actionMatchesQuery = (action: CommandAction, query: string) => {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [action.label, action.description, action.shortcut]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ actions = [], open, onOpenChange }) => {
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);

  const groupedActions = React.useMemo<SectionWithActions[]>(() => {
    const groups = actions.reduce<Record<string, CommandAction[]>>((acc, action) => {
      const key = action.section ?? 'General';
      acc[key] = acc[key] ? [...acc[key], action] : [action];
      return acc;
    }, {});

    const entries = Object.entries(groups).map<SectionWithActions>(([section, items]) => ({ section, items }));

    if (!query.trim()) {
      return entries;
    }

    return entries
      .map(({ section, items }) => ({
        section,
        items: items.filter((item) => actionMatchesQuery(item, query)),
      }))
      .filter(({ items }) => items.length > 0);
  }, [actions, query]);

  const flatActions = React.useMemo(() => groupedActions.flatMap(({ items }) => items), [groupedActions]);
  const activeAction = activeIndex >= 0 && activeIndex < flatActions.length ? flatActions[activeIndex] : undefined;
  const activeItemId = activeAction ? `command-item-${activeAction.id}` : undefined;

  React.useEffect(() => {
    setActiveIndex((current) => {
      if (flatActions.length === 0) {
        return -1;
      }

      if (current < 0) {
        return 0;
      }

      if (current >= flatActions.length) {
        return flatActions.length - 1;
      }

      return current;
    });
  }, [flatActions]);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const handleActionSelect = React.useCallback(
    (action: CommandAction) => {
      onOpenChange(false);
      action.onSelect();
    },
    [onOpenChange]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => {
        if (flatActions.length === 0) {
          return -1;
        }
        if (index < 0) {
          return 0;
        }
        return (index + 1) % flatActions.length;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => {
        if (flatActions.length === 0) {
          return -1;
        }
        if (index <= 0) {
          return flatActions.length - 1;
        }
        return index - 1;
      });
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < flatActions.length) {
      event.preventDefault();
      handleActionSelect(flatActions[activeIndex]);
    }
  };

  let runningIndex = -1;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-[20%] z-50 w-[min(640px,92vw)] -translate-x-1/2 rounded-2xl border border-border/40 bg-background/95 p-2 shadow-glass backdrop-blur-xl"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="w-full rounded-xl bg-transparent">
                  <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-sm text-muted">
                    <input
                      autoFocus
                      placeholder="Search commands..."
                      className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <kbd className="rounded-md border border-border/50 px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
                      Esc
                    </kbd>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto px-2 py-3" role="listbox" aria-activedescendant={activeItemId}>
                    {flatActions.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted">Nothing found. Refine your query.</div>
                    ) : (
                      groupedActions.map(({ section, items }) => (
                        <div key={section} className="px-2 pb-4 text-xs uppercase tracking-[0.18em] text-muted">
                          <div className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted">{section}</div>
                          <div className="space-y-1">
                            {items.map((action) => {
                              runningIndex += 1;
                              const itemIndex = runningIndex;
                              const isActive = itemIndex === activeIndex;
                              const itemDomId = `command-item-${action.id}`;
                              return (
                                <button
                                  type="button"
                                  key={action.id}
                                  role="option"
                                  id={itemDomId}
                                  aria-selected={isActive}
                                  className={cn(
                                    'group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-foreground outline-none transition',
                                    'data-[active=true]:bg-foreground/5 data-[active=true]:shadow-inner data-[active=true]:ring-1 data-[active=true]:ring-border/70'
                                  )}
                                  data-active={isActive}
                                  onMouseEnter={() => setActiveIndex(itemIndex)}
                                  onFocus={() => setActiveIndex(itemIndex)}
                                  onClick={() => handleActionSelect(action)}
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium tracking-tight">{action.label}</span>
                                    {action.description ? (
                                      <span className="text-xs text-muted">{action.description}</span>
                                    ) : null}
                                  </div>
                                  {action.shortcut ? (
                                    <kbd className="rounded-md border border-border/50 bg-white/40 px-2 py-1 text-[11px] font-medium tracking-[0.18em] text-muted dark:bg-white/10">
                                      {action.shortcut}
                                    </kbd>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
};
