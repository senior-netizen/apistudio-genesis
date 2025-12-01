import { ChangeEvent, useMemo, useRef } from 'react';
import { Button } from '@sdl/ui';
import { Info, Loader2, Play, TestTubes } from 'lucide-react';
import type { ApiRequest } from '../../types/api';
import { useAppStore } from '../../store';
import { resolveValue } from '../../lib/env/resolveVars';
import { useCollaborativeField } from '../../modules/collab/useCollaborativeField';
import { CollaborativeCursors } from '../../modules/collab/CollaborativeCursors';

interface UrlBarProps {
  request: ApiRequest;
}

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const methodStyles: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  POST: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
  PUT: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  PATCH: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300',
  DELETE: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
  HEAD: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  OPTIONS: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300',
};

export default function UrlBar({ request }: UrlBarProps) {
  const {
    updateWorkingRequest,
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    globalVariables,
    isSending,
  } = useAppStore((state) => ({
    updateWorkingRequest: state.updateWorkingRequest,
    environments: state.environments,
    activeEnvironmentId: state.activeEnvironmentId,
    setActiveEnvironment: state.setActiveEnvironment,
    globalVariables: state.globalVariables,
    isSending: state.isSending,
  }));
  const environment = environments.find((item) => item.id === activeEnvironmentId);
  const resolved = resolveValue(request.url, { globals: globalVariables, environment, locals: [] });

  const variableSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    globalVariables.forEach((variable) => suggestions.add(`{{${variable.key}}}`));
    environment?.variables.forEach((variable) => suggestions.add(`{{${variable.key}}}`));
    return Array.from(suggestions);
  }, [environment?.variables, globalVariables]);

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    updateWorkingRequest((draft) => ({ ...draft, url: value }));
  };

  const handleMethodChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    updateWorkingRequest((draft) => ({ ...draft, method: value }));
  };

  const inputRef = useRef<HTMLInputElement>(null);
  useCollaborativeField('request.url', inputRef, true);

  const baseFieldClass =
    'h-11 rounded-xl border border-border/60 bg-background/80 px-3 text-sm text-foreground shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-nowrap items-center gap-2 rounded-2xl bg-background/70 px-3 py-2 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.45)] ring-1 ring-border/50">
        <select
          value={request.method}
          onChange={handleMethodChange}
          className={`${baseFieldClass} min-w-[88px] truncate text-[12px] font-semibold uppercase tracking-[0.25em] ${methodStyles[request.method] ?? 'bg-background/80 text-foreground'}`}
          aria-label="HTTP method"
        >
          {methodOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={request.url}
            onChange={handleUrlChange}
            className={`${baseFieldClass} w-full truncate font-mono`}
            placeholder="https://api.example.com/resource"
            aria-label="Request URL"
            autoComplete="off"
            list="request-url-variables"
          />
          <CollaborativeCursors field="request.url" />
          <datalist id="request-url-variables">
            {variableSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
        <select
          value={activeEnvironmentId ?? ''}
          onChange={(event) => setActiveEnvironment(event.target.value)}
          className={`${baseFieldClass} w-[160px] text-sm`}
          aria-label="Active environment"
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id as string}>
              {env.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => useAppStore.getState().sendRequest()}
            disabled={isSending}
            className="h-10 min-w-[110px] justify-center gap-2 rounded-xl text-sm font-semibold"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {isSending ? 'Sending…' : 'Send'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => useAppStore.getState().sendRequest()}
            disabled={isSending}
            className="h-10 min-w-[110px] items-center justify-center gap-2 rounded-xl text-sm"
          >
            <TestTubes className="h-4 w-4" aria-hidden /> Run tests
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2 text-[12px] text-muted ring-1 ring-border/40">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Info className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px] text-foreground">
            {resolved.value || '—'}
          </div>
        </div>
        {resolved.unresolved.length > 0 && (
          <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
            {resolved.unresolved.length} unresolved
          </span>
        )}
      </div>
    </div>
  );
}
