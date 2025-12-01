import { ChangeEvent, useRef } from 'react';
import { Button } from '@sdl/ui';
import { Code2, ListChecks, Upload } from 'lucide-react';
import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { ApiRequest, RequestBody } from '../../types/api';
import { useAppStore } from '../../store';
import { createId } from '../../store/utils';
import { useCollaborativeField } from '../../modules/collab/useCollaborativeField';
import { CollaborativeCursors } from '../../modules/collab/CollaborativeCursors';

interface BodyEditorProps {
  request: ApiRequest;
}

const bodyModes: Array<{ id: RequestBody['mode']; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'raw', label: 'Raw' },
  { id: 'json', label: 'JSON' },
  { id: 'x-www-form-urlencoded', label: 'Query' },
  { id: 'form-data', label: 'Multipart' },
  { id: 'xml', label: 'XML' },
  { id: 'binary', label: 'Binary' }
];

export default function BodyEditor({ request }: BodyEditorProps) {
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);
  const jsonRef = useRef<HTMLTextAreaElement>(null);
  const xmlRef = useRef<HTMLTextAreaElement>(null);
  const rawRef = useRef<HTMLTextAreaElement>(null);
  useCollaborativeField('body.json', jsonRef, request.body?.mode === 'json');
  useCollaborativeField('body.xml', xmlRef, request.body?.mode === 'xml');
  useCollaborativeField('body.raw', rawRef, request.body?.mode === 'raw');

  const setMode = (mode: RequestBody['mode']) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      body: { ...(draft.body ?? { mode }), mode }
    }));
    if (mode === 'json') {
      ensureContentType('application/json');
    } else if (mode === 'xml') {
      ensureContentType('application/xml');
    } else if (mode === 'form-data') {
      ensureContentType('multipart/form-data');
    }
  };

  const ensureContentType = (value: string) => {
    const hasHeader = request.headers.some((header) => header.key.toLowerCase() === 'content-type');
    if (hasHeader) return;
    updateWorkingRequest((draft) => ({
      ...draft,
      headers: [
        ...draft.headers,
        { id: createId(), key: 'Content-Type', value, enabled: true }
      ]
    }));
  };

  const updateBody = (changes: Partial<RequestBody>) => {
    updateWorkingRequest((draft) => {
      const existingBody: RequestBody = draft.body ?? { mode: 'none' };
      return {
        ...draft,
        body: { ...existingBody, ...changes }
      };
    });
  };

  const handleTextChange = (field: 'json' | 'xml' | 'raw') => (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateBody({ [field]: event.target.value } as Partial<RequestBody>);
  };

  const addFormDataRow = () => {
    updateBody({
      formData: [...(request.body?.formData ?? []), { id: createId(), key: '', value: '', enabled: true }]
    });
  };

  const updateFormData = (id: string, field: 'key' | 'value') => (event: ChangeEvent<HTMLInputElement>) => {
    updateBody({
      formData: (request.body?.formData ?? []).map((item) => (item.id === id ? { ...item, [field]: event.target.value } : item))
    });
  };

  const toggleFormData = (id: string) => {
    updateBody({
      formData: (request.body?.formData ?? []).map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    });
  };

  const addUrlEncodedRow = () => {
    updateBody({
      urlEncoded: [...(request.body?.urlEncoded ?? []), { id: createId(), key: '', value: '', enabled: true }]
    });
  };

  const updateUrlEncoded = (id: string, field: 'key' | 'value') => (event: ChangeEvent<HTMLInputElement>) => {
    updateBody({
      urlEncoded: (request.body?.urlEncoded ?? []).map((item) => (item.id === id ? { ...item, [field]: event.target.value } : item))
    });
  };

  const toggleUrlEncoded = (id: string) => {
    updateBody({
      urlEncoded: (request.body?.urlEncoded ?? []).map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    });
  };

  const prettyPrint = () => {
    if (request.body?.mode === 'json' && request.body.json) {
      try {
        const parsed = JSON.parse(request.body.json);
        updateBody({ json: JSON.stringify(parsed, null, 2) });
      } catch (error) {
        // ignore
      }
    }
  };

  const minify = () => {
    if (request.body?.mode === 'json' && request.body.json) {
      try {
        const parsed = JSON.parse(request.body.json);
        updateBody({ json: JSON.stringify(parsed) });
      } catch (error) {
        // ignore
      }
    }
  };

  const renderMode = () => {
    const body = request.body ?? { mode: 'none' };
    switch (body.mode) {
      case 'json':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="subtle" onClick={prettyPrint}>
                  <Code2 className="mr-2 h-4 w-4" aria-hidden />
                  Pretty print
                </Button>
                <Button size="sm" variant="ghost" onClick={minify}>
                  Minify
                </Button>
              </div>
              <div className="relative">
                <textarea
                  ref={jsonRef}
                  value={body.json ?? ''}
                  onChange={handleTextChange('json')}
                  rows={12}
                  className="w-full rounded-xl border border-border/60 bg-background/80 p-4 font-mono text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <CollaborativeCursors field="body.json" />
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Preview</p>
              <div className="mt-3 max-h-[280px] overflow-auto rounded-lg bg-background/80 p-3 text-sm">
                <SyntaxHighlighter language="json" customStyle={{ background: 'transparent', fontSize: '0.85rem' }}>
                  {body.json ?? ''}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        );
      case 'xml':
        return (
          <div className="relative">
            <textarea
              ref={xmlRef}
              value={body.xml ?? ''}
              onChange={handleTextChange('xml')}
              rows={10}
              className="w-full rounded-xl border border-border/60 bg-background/80 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <CollaborativeCursors field="body.xml" />
          </div>
        );
      case 'raw':
        return (
          <div className="relative">
            <textarea
              ref={rawRef}
              value={body.raw ?? ''}
              onChange={handleTextChange('raw')}
              rows={10}
              className="w-full rounded-xl border border-border/60 bg-background/80 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <CollaborativeCursors field="body.raw" />
          </div>
        );
      case 'form-data':
        return (
          <div className="space-y-3">
            {(body.formData ?? []).map((item) => (
              <div key={item.id} className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                <input type="checkbox" checked={item.enabled} onChange={() => toggleFormData(item.id as string)} />
                <input
                  value={item.key}
                  onChange={updateFormData(item.id as string, 'key')}
                  placeholder="file"
                  className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={item.value}
                  onChange={updateFormData(item.id as string, 'value')}
                  placeholder="README.md"
                  className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={addFormDataRow}>
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              Add form field
            </Button>
          </div>
        );
      case 'x-www-form-urlencoded':
        return (
          <div className="space-y-3">
            {(body.urlEncoded ?? []).map((item) => (
              <div key={item.id} className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                <input type="checkbox" checked={item.enabled} onChange={() => toggleUrlEncoded(item.id as string)} />
                <input
                  value={item.key}
                  onChange={updateUrlEncoded(item.id as string, 'key')}
                  placeholder="filter"
                  className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={item.value}
                  onChange={updateUrlEncoded(item.id as string, 'value')}
                  placeholder="archived"
                  className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={addUrlEncodedRow}>
              <ListChecks className="mr-2 h-4 w-4" aria-hidden />
              Add field
            </Button>
          </div>
        );
      case 'binary':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Filename</label>
              <input
                value={body.fileName ?? ''}
                onChange={(event) => updateBody({ fileName: event.target.value })}
                className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">MIME type</label>
              <input
                value={body.mimeType ?? ''}
                onChange={(event) => updateBody({ mimeType: event.target.value })}
                className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Base64 payload</label>
              <textarea
                value={body.raw ?? ''}
                onChange={handleTextChange('raw')}
                rows={6}
                className="w-full rounded-xl border border-border/60 bg-background/80 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );
      default:
        return <p className="text-sm text-muted">No body attached to this request.</p>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {bodyModes.map((mode) => (
          <Button
            key={mode.id}
            size="sm"
            variant={request.body?.mode === mode.id ? 'primary' : 'ghost'}
            onClick={() => setMode(mode.id)}
          >
            {mode.label}
          </Button>
        ))}
      </div>
      {renderMode()}
    </div>
  );
}
