import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '../src/utils/cn';

export type Command = {
  id: string;
  name: string;
  description?: string;
  category: string;
  action: () => void;
  hidden?: boolean;
  activationKeyword?: string;
};

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  groups: Array<{ category: string; commands: Command[] }>;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: Command) => void;
  onInputKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onInputKeyDown,
}) => {
  const flatCommands = React.useMemo(
    () => groups.flatMap((group) => group.commands.map((command) => ({ command, category: group.category }))),
    [groups],
  );

  const activeCommand =
    activeIndex >= 0 && activeIndex < flatCommands.length ? flatCommands[activeIndex]?.command : undefined;
  const activeItemId = activeCommand ? `command-${activeCommand.id}` : undefined;

  const handleMouseEnter = (commandId: string) => {
    const index = flatCommands.findIndex(({ command }) => command.id === commandId);
    if (index !== -1) {
      onActiveIndexChange(index);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-[130] w-[min(720px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-zinc-950/90 p-2 text-white shadow-[0_40px_120px_-25px_rgba(15,23,42,0.6)] backdrop-blur-2xl"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-300">
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      onInputKeyDown?.(event);
                      if (event.defaultPrevented) return;
                      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                      }
                    }}
                    placeholder="Search commands"
                    className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-500"
                    aria-activedescendant={activeItemId}
                    role="combobox"
                    aria-expanded={open}
                    aria-autocomplete="list"
                  />
                  <kbd className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] tracking-[0.2em] text-zinc-400">
                    ESC
                  </kbd>
                </div>
                <div className="mt-2 max-h-[360px] overflow-y-auto rounded-2xl bg-white/2 p-2" role="listbox" aria-activedescendant={activeItemId}>
                  {flatCommands.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-zinc-500">No commands matched. Try another keyword.</div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.category} className="mb-4 last:mb-0" role="group" aria-label={group.category}>
                        <div className="px-4 pb-2 text-xs uppercase tracking-[0.24em] text-zinc-500">{group.category}</div>
                        <div className="space-y-1">
                          {group.commands.map((command) => {
                            const index = flatCommands.findIndex((entry) => entry.command.id === command.id);
                            const isActive = index === activeIndex;
                            return (
                              <button
                                type="button"
                                key={command.id}
                                id={`command-${command.id}`}
                                role="option"
                                data-active={isActive}
                                aria-selected={isActive}
                                onMouseEnter={() => handleMouseEnter(command.id)}
                                onFocus={() => onActiveIndexChange(index)}
                                onClick={() => onSelect(command)}
                                className={cn(
                                  'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                                  'bg-white/3 text-white/90 hover:bg-white/6 data-[active=true]:bg-white/10 data-[active=true]:ring-2 data-[active=true]:ring-white/30',
                                )}
                              >
                                <div>
                                  <div className="font-medium tracking-tight text-white">{command.name}</div>
                                  {command.description ? (
                                    <div className="mt-1 text-xs text-zinc-400">{command.description}</div>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
};
