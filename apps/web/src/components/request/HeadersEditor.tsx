import { ChangeEvent, type KeyboardEvent } from 'react';
import { Button } from '@sdl/ui';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import type { ApiRequest, RequestHeader } from '../../types/api';
import { useAppStore } from '../../store';
import { createId } from '../../store/utils';

interface HeadersEditorProps {
  request: ApiRequest;
}

const headerPresets: Array<{ key: string; value: string; description: string }> = [
  { key: 'Content-Type', value: 'application/json', description: 'JSON payload' },
  { key: 'Accept', value: 'application/json', description: 'Request JSON response' },
  { key: 'User-Agent', value: 'Squirrel-API-Studio', description: 'Identify client' }
];

const headerNameOptions = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'If-None-Match',
  'User-Agent',
  'X-Request-ID',
  'X-Trace-Id'
];

const headerValueSuggestions: Record<string, string[]> = {
  Accept: ['application/json', 'application/xml', 'text/plain'],
  'Accept-Encoding': ['gzip, deflate, br'],
  'Accept-Language': ['en-US,en;q=0.9'],
  Authorization: ['Bearer {{token}}'],
  'Cache-Control': ['no-cache', 'no-store'],
  'Content-Type': ['application/json', 'application/xml', 'multipart/form-data', 'application/x-www-form-urlencoded'],
  'User-Agent': ['Squirrel-API-Studio'],
  'X-Request-ID': ['{{requestId}}'],
  'X-Trace-Id': ['{{traceId}}']
};

export default function HeadersEditor({ request }: HeadersEditorProps) {
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);

  const updateHeader = (id: string, changes: Partial<RequestHeader>) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: draft.headers.map((header) => (header.id === id ? { ...header, ...changes } : header))
    }));
  };

  const toggleHeader = (id: string) => {
    const current = request.headers.find((header) => header.id === id);
    updateHeader(id, { enabled: !current?.enabled });
  };

  const removeHeader = (id: string) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: draft.headers.filter((header) => header.id !== id)
    }));
  };

  const addHeader = () => {
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: [
        ...draft.headers,
        { id: createId(), key: '', value: '', description: '', enabled: true }
      ]
    }));
  };

  const applyPreset = (preset: (typeof headerPresets)[number]) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: [
        ...draft.headers,
        {
          id: createId(),
          key: preset.key,
          value: preset.value,
          description: preset.description,
          enabled: true,
          preset: true
        }
      ]
    }));
  };

  const handleChange = (id: string, field: keyof RequestHeader) => (event: ChangeEvent<HTMLInputElement>) => {
    updateHeader(id, { [field]: event.target.value } as Partial<RequestHeader>);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addHeader();
    }
  };

  const fieldClass =
    'h-10 w-full rounded-[10px] border border-border/60 bg-background/80 px-3 text-sm text-foreground transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={addHeader} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add header
        </Button>
        {headerPresets.map((preset) => (
          <Button key={preset.key} size="sm" variant="subtle" onClick={() => applyPreset(preset)} className="gap-2">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {preset.key}
          </Button>
        ))}
      </div>

      {request.headers.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border/60 bg-background/60 px-6 py-8 text-center">
          <p className="text-sm text-muted">No headers defined yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-border/60 bg-background/75 shadow-inner">
          <div className="overflow-x-auto">
            <div className="min-w-[760px] divide-y divide-border/40">
              <div className="grid grid-cols-[88px_1fr_1fr_200px_72px] items-center gap-4 bg-background/60 px-4 py-3 text-xs uppercase tracking-[0.3em] text-muted">
                <span>Enabled</span>
                <span>Name</span>
                <span>Value</span>
                <span>Description</span>
                <span className="text-right">Actions</span>
              </div>
              {request.headers.map((header) => (
                <div key={header.id} className="grid grid-cols-[88px_1fr_1fr_200px_72px] items-center gap-4 px-4 py-3 text-sm">
                  <input type="checkbox" checked={header.enabled} onChange={() => toggleHeader(header.id as string)} />
                  <input
                    value={header.key}
                    onChange={handleChange(header.id as string, 'key')}
                    onKeyDown={handleKeyDown}
                    className={fieldClass}
                    placeholder="Authorization"
                    list="header-name-options"
                  />
                  <input
                    value={header.value}
                    onChange={handleChange(header.id as string, 'value')}
                    onKeyDown={handleKeyDown}
                    className={fieldClass}
                    placeholder="Bearer token"
                    list={`header-value-${header.id}`}
                  />
                  <input
                    value={header.description ?? ''}
                    onChange={handleChange(header.id as string, 'description')}
                    className={fieldClass}
                    placeholder="Usage"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(header.id as string)}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border/60 text-muted transition hover:bg-background/80 hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <datalist id="header-name-options">
        {headerNameOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {request.headers.map((header) => (
        <datalist key={`values-${header.id}`} id={`header-value-${header.id}`}>
          {(headerValueSuggestions[header.key] ?? []).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      ))}
    </div>
  );
}
