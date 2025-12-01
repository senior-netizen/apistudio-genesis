import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface JsonTreeProps {
  data: unknown;
  path?: string;
  search?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function JsonTree({ data, path = 'root', search }: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const stringified = useMemo(() => JSON.stringify(data, null, 2), [data]);

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
          {filtered.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">{key}</span>
              <div className="pl-3">
                {isObject(value) || Array.isArray(value) ? (
                  <JsonTree data={value} path={`${path}.${String(key)}`} search={search} />
                ) : (
                  <span className="font-mono text-xs text-foreground">{String(value)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
