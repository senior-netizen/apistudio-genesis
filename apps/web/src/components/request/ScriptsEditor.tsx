import { useState } from 'react';
import { Button } from '@sdl/ui';
import { Code2, HelpCircle } from 'lucide-react';
import type { ApiRequest } from '../../types/api';
import { useAppStore } from '../../store';

interface ScriptsEditorProps {
  request: ApiRequest;
}

const scriptTabs = [
  { id: 'pre', label: 'Pre-request' },
  { id: 'test', label: 'Tests' }
] as const;

export default function ScriptsEditor({ request }: ScriptsEditorProps) {
  const [activeTab, setActiveTab] = useState<(typeof scriptTabs)[number]['id']>('pre');
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);

  const handleChange = (value: string) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      scripts:
        activeTab === 'pre'
          ? { ...draft.scripts, preRequest: value }
          : { ...draft.scripts, test: value }
    }));
  };

  const currentValue = activeTab === 'pre' ? request.scripts.preRequest : request.scripts.test;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {scriptTabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <Code2 className="h-4 w-4" aria-hidden />
          {activeTab === 'pre' ? 'Pre-request script' : 'Test script'}
          <span className="ml-auto flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden /> pm.expect, pm.response.json()
          </span>
        </div>
        <textarea
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          rows={12}
          className="mt-4 w-full rounded-xl border border-border/60 bg-background/80 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={`pm.expect(200).toBe(200);\nconsole.log('Hello from ${activeTab === 'pre' ? 'pre-request' : 'test'} script');`}
        />
      </div>
    </div>
  );
}
