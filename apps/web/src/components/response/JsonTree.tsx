import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface JsonTreeProps {
  data: unknown;
  path?: string;
  search?: string;
  expandAllToken?: number;
  collapseAllToken?: number;
  onCopyPath?: (path: string) => void;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type IdleHandle = number;

function schedulePretty(callback: () => void): IdleHandle {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as Window & { requestIdleCallback(cb: () => void): number }).requestIdleCallback(() => callback());
  }
  return setTimeout(callback, 0) as unknown as IdleHandle;
}

function cancelPretty(handle: IdleHandle) {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as Window & { cancelIdleCallback(handle: number): void }).cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle);
}

export default function JsonTree({ data, path = 'root', search, expandAllToken, collapseAllToken, onCopyPath }: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [stringified, setStringified] = useState('');

  useEffect(() => {
    let cancelled = false;
    const handle = schedulePretty(() => {
      if (cancelled) {
        return;
      }
      try {
        setStringified(JSON.stringify(data, null, 2));
      } catch (error) {
        setStringified(String(data));
      }
    });
    return () => {
      cancelled = true;
      cancelPretty(handle);
    };
  }, [data]);

  useEffect(() => {
    if (expandAllToken !== undefined) {
      setCollapsed(false);
    }
  }, [expandAllToken]);

  useEffect(() => {
    if (collapseAllToken !== undefined) {
      setCollapsed(true);
    }
  }, [collapseAllToken]);

  if (!isObject(data) && !Array.isArray(data)) {
    const match = search ? stringified.toLowerCase().includes(search.toLowerCase()) : true;
    return match ? <span className="font-mono text-xs text-foreground">{String(data)}</span> : null;
  }

  const entries = Array.isArray(data) ? data.map((value, index) => [index, value]) : Object.entries(data);

  const filtered = search
    ? entries.filter(([, value]) => JSON.stringify(value).toLowerCase().includes(search.toLowerCase()))
    : entries;

  if (filtered.length === 0) {
    return <p className="text-xs text-muted">No matches for "{search}".</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className="flex items-center gap-2 text-xs text-muted"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
        {Array.isArray(data) ? `Array(${data.length})` : 'Object'}
      </button>
      {!collapsed && (
        <div className="space-y-2 border-l border-border/50 pl-4">
          {filtered.map(([key, value]) => {
            const childPath = `${path}.${String(key)}`;
            const valueString = String(value);
            const match = search ? valueString.toLowerCase().includes(search.toLowerCase()) : false;
            return (
              <div key={key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => onCopyPath?.(childPath)}
                  className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted hover:text-foreground"
                >
                  {String(key)}
                </button>
                <div className="pl-3">
                  {isObject(value) || Array.isArray(value) ? (
                    <JsonTree
                      data={value}
                      path={childPath}
                      search={search}
                      expandAllToken={expandAllToken}
                      collapseAllToken={collapseAllToken}
                      onCopyPath={onCopyPath}
                    />
                  ) : (
                    <span className="font-mono text-xs text-foreground">
                      {match ? highlight(valueString, search!) : valueString}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function highlight(value: string, query: string) {
  const lower = value.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return value;
  return (
    <>
      {value.slice(0, idx)}
      <mark className="bg-amber-200/80 text-foreground">{value.slice(idx, idx + query.length)}</mark>
      {value.slice(idx + query.length)}
    </>
  );
}
