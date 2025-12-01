import { ChangeEvent } from 'react';
import { Button } from '@sdl/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { ApiRequest, RequestParam } from '../../types/api';
import { useAppStore } from '../../store';
import { createId } from '../../store/utils';

interface ParamsEditorProps {
  request: ApiRequest;
}

export default function ParamsEditor({ request }: ParamsEditorProps) {
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);

  const updateParam = (id: string, changes: Partial<RequestParam>) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      params: draft.params.map((param) => (param.id === id ? { ...param, ...changes } : param))
    }));
  };

  const toggleParam = (id: string) => {
    updateParam(id, { enabled: !request.params.find((param) => param.id === id)?.enabled });
  };

  const removeParam = (id: string) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      params: draft.params.filter((param) => param.id !== id)
    }));
  };

  const addParam = () => {
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
              />
              <input
                value={param.key}
                onChange={handleChange(param.id as string, 'key')}
                placeholder="limit"
                className={fieldClass}
              />
              <input
                value={param.value}
                onChange={handleChange(param.id as string, 'value')}
                placeholder="100"
                className={fieldClass}
              />
              <input
                value={param.description ?? ''}
                onChange={handleChange(param.id as string, 'description')}
                placeholder="Page size"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => removeParam(param.id as string)}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border/60 text-muted transition hover:bg-background/80 hover:text-foreground"
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

      <Button variant="ghost" onClick={addParam} className="gap-2">
        <Plus className="h-4 w-4" aria-hidden />
        Add parameter
      </Button>
    </div>
  );
}
