import { ChangeEvent, useMemo, useState, type KeyboardEvent } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea } from '@sdl/ui';
import { Columns, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { ApiRequest, RequestHeader } from '../../types/api';
import { useAppStore } from '../../store';
import { createId } from '../../store/utils';

interface HeadersEditorProps {
  request: ApiRequest;
  readOnly?: boolean;
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

export default function HeadersEditor({ request, readOnly }: HeadersEditorProps) {
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const updateHeader = (id: string, changes: Partial<RequestHeader>) => {
    if (readOnly) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: draft.headers.map((header) => (header.id === id ? { ...header, ...changes } : header))
    }));
  };

  const toggleHeader = (id: string) => {
    if (readOnly) return;
    const current = request.headers.find((header) => header.id === id);
    updateHeader(id, { enabled: !current?.enabled });
  };

  const removeHeader = (id: string) => {
    if (readOnly) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: draft.headers.filter((header) => header.id !== id)
    }));
  };

  const addHeader = () => {
    if (readOnly) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: [
        ...draft.headers,
        { id: createId(), key: '', value: '', description: '', enabled: true }
      ]
    }));
  };

  const applyPreset = (preset: (typeof headerPresets)[number]) => {
    if (readOnly) return;
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

  const parsedBulkHeaders = useMemo(() => {
    const lines = bulkText.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines
      .map((line) => {
        const separator = line.includes(':') ? ':' : line.includes('=') ? '=' : '\t';
        const [rawKey, ...rest] = line.split(separator);
        const value = rest.join(separator).trim();
        const key = rawKey?.trim();
        if (!key) return null;
        return { key, value };
      })
      .filter(Boolean) as Array<{ key: string; value: string }>;
  }, [bulkText]);

  const applyBulk = () => {
    if (!parsedBulkHeaders.length) {
      setBulkOpen(false);
      return;
    }
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: [
        ...draft.headers,
        ...parsedBulkHeaders.map((entry) => ({
          id: createId(),
          key: entry.key,
          value: entry.value,
          description: '',
          enabled: true
        }))
      ]
    }));
    setBulkOpen(false);
    setBulkText('');
  };

  const fieldClass =
    'h-10 w-full rounded-[10px] border border-border/60 bg-background/80 px-3 text-sm text-foreground transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={addHeader} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add header
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-2" disabled={readOnly}>
          <Columns className="h-3.5 w-3.5" aria-hidden />
          Bulk add
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
          <input type="checkbox" checked={header.enabled} onChange={() => toggleHeader(header.id as string)} disabled={readOnly} />
          <input
            value={header.key}
            onChange={handleChange(header.id as string, 'key')}
            onKeyDown={handleKeyDown}
            className={fieldClass}
            placeholder="Authorization"
            list="header-name-options"
            readOnly={readOnly}
          />
          <input
            value={header.value}
            onChange={handleChange(header.id as string, 'value')}
            onKeyDown={handleKeyDown}
            className={fieldClass}
            placeholder="Bearer token"
            list={`header-value-${header.id}`}
            readOnly={readOnly}
          />
          <input
            value={header.description ?? ''}
            onChange={handleChange(header.id as string, 'description')}
            className={fieldClass}
            placeholder="Usage"
            readOnly={readOnly}
          />
          <button
            type="button"
            onClick={() => removeHeader(header.id as string)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border/60 text-muted transition hover:bg-background/80 hover:text-foreground"
            disabled={readOnly}
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

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk add headers</DialogTitle>
            <DialogDescription>Paste key/value pairs (e.g. Authorization: Bearer abc or X-Id=123)</DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Authorization: Bearer {{token}}\nX-Request-ID: {{requestId}}"
            className="min-h-[180px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulk} disabled={!parsedBulkHeaders.length || readOnly}>
              Add {parsedBulkHeaders.length || ''} headers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
