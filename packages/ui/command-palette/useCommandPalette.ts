import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Command } from './CommandPalette';

interface UseCommandPaletteOptions {
  enabled?: boolean;
  onCommand?: (command: Command) => void;
}

interface CommandGroup {
  category: string;
  commands: Command[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let lastIndex = -1;
  for (const char of needle) {
    const nextIndex = haystack.indexOf(char, lastIndex + 1);
    if (nextIndex === -1) return false;
    lastIndex = nextIndex;
  }
  return true;
}

function scoreCommand(command: Command, query: string): number {
  if (!query) {
    return 1;
  }
  const normalizedQuery = query.toLowerCase();
  const name = command.name.toLowerCase();
  const description = command.description?.toLowerCase() ?? '';
  const category = command.category?.toLowerCase() ?? '';
  const haystack = `${name} ${description} ${category}`;

  let score = 0;
  if (name.startsWith(normalizedQuery)) {
    score += 6;
  }
  if (category.startsWith(normalizedQuery)) {
    score += 3;
  }
  if (name.split(/\s+/).some((segment) => segment.startsWith(normalizedQuery))) {
    score += 4;
  }
  if (description.includes(normalizedQuery)) {
    score += 2;
  }
  if (haystack.includes(normalizedQuery)) {
    score += 2;
  }
  if (fuzzyIncludes(haystack, normalizedQuery)) {
    score += 1;
  }
  return score;
}

export function useCommandPalette(
  commands: Command[],
  { enabled = true, onCommand }: UseCommandPaletteOptions = {},
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!enabled && open) {
      setOpen(false);
    }
  }, [enabled, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const visibleCommands = useMemo(() => {
    if (!enabled) {
      return [] as Command[];
    }

    const normalizedQuery = normalize(query);
    const tokens = normalizedQuery
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    return commands
      .filter((command) => {
        if (!command.hidden) {
          if (tokens.length === 0) {
            return true;
          }
        }

        const activationToken = command.activationKeyword?.toLowerCase();
        const hasActivationKeyword = activationToken
          ? tokens.some((token) => token.includes(activationToken) || activationToken.includes(token))
          : false;

        if (command.hidden && !hasActivationKeyword) {
          return false;
        }

        const filteredTokens = hasActivationKeyword
          ? tokens.filter((token) => !activationToken || token !== activationToken)
          : tokens;

        if (filteredTokens.length === 0) {
          return true;
        }

        const haystack = `${command.name} ${command.description ?? ''} ${command.category}`.toLowerCase();
        const name = command.name.toLowerCase();
        const description = command.description?.toLowerCase() ?? '';
        const category = command.category?.toLowerCase() ?? '';

        return filteredTokens.every((token) => {
          const t = token.toLowerCase();
          return (
            name.startsWith(t) ||
            category.startsWith(t) ||
            description.includes(t) ||
            haystack.includes(t) ||
            fuzzyIncludes(haystack, t)
          );
        });
      })
      .map((command) => ({ command, score: scoreCommand(command, normalizedQuery) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.command);
  }, [commands, enabled, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (visibleCommands.length === 0) {
        return -1;
      }
      if (current < 0) {
        return 0;
      }
      if (current >= visibleCommands.length) {
        return visibleCommands.length - 1;
      }
      return current;
    });
  }, [visibleCommands]);

  const groups = useMemo<CommandGroup[]>(() => {
    const grouped = new Map<string, Command[]>();
    for (const command of visibleCommands) {
      const category = command.category ?? 'General';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(command);
    }
    return Array.from(grouped.entries()).map(([category, items]) => ({ category, commands: items }));
  }, [visibleCommands]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!enabled) {
        setOpen(false);
        return;
      }
      setOpen(next);
    },
    [enabled],
  );

  const selectCommand = useCallback(
    (command: Command) => {
      onCommand?.(command);
      command.action();
      handleOpenChange(false);
    },
    [handleOpenChange, onCommand],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => {
          if (visibleCommands.length === 0) return -1;
          if (current < 0) return 0;
          return (current + 1) % visibleCommands.length;
        });
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => {
          if (visibleCommands.length === 0) return -1;
          if (current <= 0) return visibleCommands.length - 1;
          return current - 1;
        });
        return;
      }
      if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < visibleCommands.length) {
        event.preventDefault();
        selectCommand(visibleCommands[activeIndex]);
        return;
      }
      if (event.key === 'Escape') {
        handleOpenChange(false);
      }
    },
    [activeIndex, handleOpenChange, selectCommand, visibleCommands],
  );

  return {
    open,
    setOpen: handleOpenChange,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    groups,
    visibleCommands,
    handleInputKeyDown,
    selectCommand,
  };
}
