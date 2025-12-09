import { useMemo, useState } from 'react';
import { Badge, Button } from '@sdl/ui';
import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { ResponseSnapshot } from '../../types/api';
import JsonTree from './JsonTree';

interface BodyPanelProps {
  response?: ResponseSnapshot;
  streamingBody?: string;
}

const bodyTabs = [
  { id: 'pretty', label: 'Pretty' },
  { id: 'raw', label: 'Raw' },
  { id: 'preview', label: 'Preview' }
] as const;

export default function BodyPanel({ response, streamingBody }: BodyPanelProps) {
  const [activeTab, setActiveTab] = useState<(typeof bodyTabs)[number]['id']>('pretty');
  const [search, setSearch] = useState('');
  const [expandAllToken, setExpandAllToken] = useState(0);
  const [collapseAllToken, setCollapseAllToken] = useState(0);

  const parsedJson = useMemo(() => {
    if (!response?.body) return undefined;
    try {
      return JSON.parse(response.body);
    } catch (error) {
      return undefined;
    }
  }, [response?.body]);

  const prettyBody = useMemo(() => {
    if (parsedJson) {
      return JSON.stringify(parsedJson, null, 2);
    }
    return response?.body ?? '';
  }, [parsedJson, response?.body]);

  if (!response) {
    if (streamingBody) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted">Streaming response…</p>
          <pre className="max-h-[400px] overflow-auto rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-foreground">
            {streamingBody}
          </pre>
        </div>
      );
    }
    return <p className="text-sm text-muted">Send a request to view the response body.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {bodyTabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
        {activeTab === 'pretty' && parsedJson && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setExpandAllToken((n) => n + 1)}>
              Expand all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCollapseAllToken((n) => n + 1)}>
              Collapse all
            </Button>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search JSON"
              className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {activeTab === 'pretty' ? (
        parsedJson ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge variant="secondary">{formatBytes(response.size)}</Badge>
              <Badge variant="secondary">{response.duration} ms</Badge>
              <span className="text-muted-foreground">Detected JSON</span>
            </div>
            <div className="max-h-[400px] overflow-auto rounded-2xl border border-border/60 bg-background/70 p-4">
              <JsonTree
                data={parsedJson}
                search={search}
                expandAllToken={expandAllToken}
                collapseAllToken={collapseAllToken}
                onCopyPath={(path) => navigator.clipboard.writeText(path)}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Unable to parse JSON.</p>
        )
      ) : activeTab === 'raw' ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge variant="secondary">{formatBytes(response.size)}</Badge>
            <Badge variant="secondary">{response.duration} ms</Badge>
          </div>
          <div className="max-h-[400px] overflow-auto rounded-2xl border border-border/60 bg-background/70">
            <SyntaxHighlighter language="json" customStyle={{ background: 'transparent', padding: '1.5rem' }}>
              {prettyBody}
            </SyntaxHighlighter>
          </div>
        </div>
      ) : (
        <iframe
          title="Response preview"
          srcDoc={response.body}
          className="h-[400px] w-full rounded-2xl border border-border/60 bg-white"
        />
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
