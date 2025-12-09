import { ChangeEvent, useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea } from '@sdl/ui';
import { Plus, Trash2, Upload } from 'lucide-react';
import type { ApiRequest, RequestParam } from '../../types/api';
import { useAppStore } from '../../store';
import { createId } from '../../store/utils';

interface ParamsEditorProps {
  request: ApiRequest;
  readOnly?: boolean;
}

export default function ParamsEditor({ request, readOnly }: ParamsEditorProps) {
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const updateParam = (id: string, changes: Partial<RequestParam>) => {
    if (readOnly) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      params: draft.params.map((param) => (param.id === id ? { ...param, ...changes } : param))
    }));
  };

  const toggleParam = (id: string) => {
    if (readOnly) return;
    updateParam(id, { enabled: !request.params.find((param) => param.id === id)?.enabled });
  };

  const removeParam = (id: string) => {
    if (readOnly) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      params: draft.params.filter((param) => param.id !== id)
    }));
  };

  const addParam = () => {
    if (readOnly) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      params: [
        ...draft.params,
        { id: createId(), key: '', value: '', description: '', enabled: true }
      ]
    }));
  };

  const handleChange = (id: string, field: keyof RequestParam) => (event: ChangeEvent<HTMLInputElement>) => {
    updateParam(id, { [field]: event.target.value } as Partial<RequestParam>);
  };

  const parsedBulkParams = useMemo(() => {
    const text = bulkText.trim();
    if (!text) return [];
    // Support querystring paste
    const looksLikeQuery = text.startsWith('?') || text.includes('=');
    if (looksLikeQuery && !text.includes('\n')) {
      const search = new URLSearchParams(text.startsWith('?') ? text : `?${text}`);
      return Array.from(search.entries()).map(([key, value]) => ({ key, value }));
    }
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines
      .map((line) => {
        const separator = line.includes('=') ? '=' : line.includes(':') ? ':' : '\t';
        const [rawKey, ...rest] = line.split(separator);
        const value = rest.join(separator).trim();
        const key = rawKey?.trim();
        if (!key) return null;
        return { key, value };
      })
      .filter(Boolean) as Array<{ key: string; value: string }>;
  }, [bulkText]);

  const applyBulk = () => {
    if (!parsedBulkParams.length) {
      setBulkOpen(false);
      return;
    }
    updateWorkingRequest((draft) => ({
      ...draft,
      params: [
        ...draft.params,
        ...parsedBulkParams.map((entry) => ({
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

  const tableContent = (
    <div className="overflow-hidden rounded-[12px] border border-border/60 bg-background/75 shadow-inner">
      <div className="overflow-x-auto">
        <div className="min-w-[720px] divide-y divide-border/40">
          <div className="grid grid-cols-[88px_1fr_1fr_180px_72px] items-center gap-4 bg-background/60 px-4 py-3 text-xs uppercase tracking-[0.3em] text-muted">
            <span>Enabled</span>
            <span>Key</span>
            <span>Value</span>
            <span>Description</span>
            <span className="text-right">Actions</span>
          </div>
          {request.params.map((param) => (
            <div key={param.id} className="grid grid-cols-[88px_1fr_1fr_180px_72px] items-center gap-4 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={param.enabled}
                onChange={() => toggleParam(param.id as string)}
                aria-label="Toggle parameter"
                disabled={readOnly}
              />
              <input
                value={param.key}
                onChange={handleChange(param.id as string, 'key')}
                placeholder="limit"
                className={fieldClass}
                readOnly={readOnly}
              />
              <input
                value={param.value}
                onChange={handleChange(param.id as string, 'value')}
                placeholder="100"
                className={fieldClass}
                readOnly={readOnly}
              />
              <input
                value={param.description ?? ''}
                onChange={handleChange(param.id as string, 'description')}
                placeholder="Page size"
                className={fieldClass}
                readOnly={readOnly}
              />
              <button
                type="button"
                onClick={() => removeParam(param.id as string)}
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
  );

  return (
    <div className="space-y-4">
      {request.params.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border/60 bg-background/60 px-6 py-8 text-center">
          <p className="text-sm text-muted">No query parameters yet.</p>
          <Button variant="subtle" onClick={addParam} className="mt-4">
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add query param
          </Button>
        </div>
      ) : (
        tableContent
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={addParam} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add parameter
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-2" disabled={readOnly}>
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Bulk add / paste query
        </Button>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk add query parameters</DialogTitle>
            <DialogDescription>Paste a querystring or key/value pairs (e.g. limit=100 or user:42)</DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="?limit=100&search=abc or\nlimit=100\nsearch=abc"
            className="min-h-[160px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulk} disabled={!parsedBulkParams.length || readOnly}>
              Add {parsedBulkParams.length || ''} params
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
