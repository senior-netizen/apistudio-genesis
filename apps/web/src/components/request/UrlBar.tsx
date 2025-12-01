import { ChangeEvent, useMemo } from 'react';
import { Button } from '@sdl/ui';
import { Info, Loader2, Play } from 'lucide-react';
import type { ApiRequest } from '../../types/api';
import { useAppStore } from '../../store';
import { resolveValue } from '../../lib/env/resolveVars';

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
  OPTIONS: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300'
};

export default function UrlBar({ request }: UrlBarProps) {
  const {
    updateWorkingRequest,
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    globalVariables,
    isSending
  } = useAppStore((state) => ({
    updateWorkingRequest: state.updateWorkingRequest,
    environments: state.environments,
    activeEnvironmentId: state.activeEnvironmentId,
    setActiveEnvironment: state.setActiveEnvironment,
    globalVariables: state.globalVariables,
    isSending: state.isSending
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

  const baseFieldClass =
    'h-12 rounded-[12px] border border-border/60 bg-background/95 px-4 text-sm text-foreground shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-[11px] uppercase tracking-[0.3em] text-muted">Request target</label>
        <div className="space-y-3 rounded-[16px] border border-border/60 bg-background/90 p-4 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={request.method}
              onChange={handleMethodChange}
              className={`${baseFieldClass} min-w-[108px] font-semibold uppercase tracking-[0.3em] ${
                methodStyles[request.method] ?? 'bg-background/95 text-foreground'
              }`}
              aria-label="HTTP method"
            >
              {methodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <input
                value={request.url}
                onChange={handleUrlChange}
                className={`${baseFieldClass} w-full font-mono`}
                placeholder="https://api.example.com/resource"
                aria-label="Request URL"
                autoComplete="off"
                list="request-url-variables"
              />
              <datalist id="request-url-variables">
                {variableSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
            <Button
              variant="primary"
              onClick={() => useAppStore.getState().sendRequest()}
              disabled={isSending}
              className="h-12 min-w-[148px] justify-center gap-2 rounded-[12px] text-sm font-semibold shadow-soft transition duration-200 ease-out"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {isSending ? 'Sending…' : 'Send'}
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={activeEnvironmentId ?? ''}
              onChange={(event) => setActiveEnvironment(event.target.value)}
              className={`${baseFieldClass} md:w-[220px]`}
              aria-label="Active environment"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id as string}>
                  {env.name}
                </option>
              ))}
            </select>
            <p className="flex-1 text-xs text-muted">
              Choose an environment to resolve variables and secrets before sending.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-border/60 bg-background/85 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <Info className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex-1 space-y-2 text-xs text-muted">
            <p className="font-semibold uppercase tracking-[0.3em] text-foreground/70">Resolved URL</p>
            <div className="overflow-hidden rounded-[12px] border border-border/50 bg-background/90">
              <div className="overflow-x-auto">
                <code className="block min-w-full whitespace-nowrap px-3 py-2 font-mono text-sm text-foreground">{resolved.value}</code>
              </div>
            </div>
            {resolved.unresolved.length > 0 && (
              <p className="text-xs text-accent">Unresolved variables: {resolved.unresolved.join(', ')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
