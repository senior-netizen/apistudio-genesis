import { useMemo, useState } from 'react';
import { Button, Card } from '@sdl/ui';
import { ArrowRight, BookOpen, Sparkles, Wand2 } from 'lucide-react';

export interface AIRequestComposerProps {
  onCompose?: (prompt: string) => void;
}

/**
 * AIRequestComposer renders a text area that lets the user describe intent in
 * natural language. For the scaffold we fire the optional callback and display
 * a synthesized response preview so the consuming screens can be wired without
 * waiting for the production AI backend to land.
 */
export function AIRequestComposer({ onCompose }: AIRequestComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const quickSuggestions = useMemo(
    () => [
      {
        title: 'User analytics snapshot',
        description: 'Summarise active users and churn risk for the last 7 days.',
        suggestion: 'Generate a report of active users, churn risk, and trial conversions for the last 7 days.',
      },
      {
        title: 'Checkout health monitor',
        description: 'Flag failed payment intents grouped by provider.',
        suggestion: 'List failed payment intents in the last 2 hours grouped by provider with error codes.',
      },
      {
        title: 'Realtime incident triage',
        description: 'Identify slow endpoints above 1.5s latency.',
        suggestion: 'Highlight API endpoints above 1.5s latency in the last 30 minutes and include top headers.',
      },
    ],
    [],
  );

  const handleSubmit = () => {
    if (!prompt.trim()) {
      return;
    }
    const formatted = `Suggested endpoint: GET /api/example\nHeaders: Authorization: Bearer <token>\nParameters: createdAfter=2024-01-01\nPrompt: ${prompt}`;
    onCompose?.(prompt);
    setPreview(formatted);
  };

  const handleApply = () => {
    if (!prompt.trim()) {
      return;
    }
    onCompose?.(preview ?? prompt);
  };

  return (
    <Card className="space-y-6 rounded-[18px] border border-border/60 bg-background/95 p-6 shadow-soft">
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden /> AI Request Composer
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Describe your API goal</h2>
        <p className="text-sm text-muted">
          Outline what you need in plain language. The assistant will propose endpoints, payloads, and test scaffolding that you can apply to the Request Builder.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground" htmlFor="ai-request-composer-input">
          Prompt
          <textarea
            id="ai-request-composer-input"
            className="min-h-[180px] rounded-[16px] border border-border/60 bg-background/90 px-4 py-4 text-base leading-relaxed text-foreground shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Get all users with admin role created after Jan 2024"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border/60 bg-background/90 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Wand2 className="h-4 w-4 text-accent" aria-hidden />
            Compose an intent and we will expand it into a full request.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-[10px] px-3"
              onClick={() => {
                setPrompt('');
                setPreview(null);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-11 gap-2 rounded-[12px] px-5 text-sm font-semibold shadow-soft"
              onClick={handleSubmit}
            >
              <Sparkles className="h-4 w-4" aria-hidden /> Compose with AI
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4 rounded-[16px] border border-border/60 bg-background/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Suggested prompts</p>
              <h3 className="text-base font-semibold text-foreground">Jump-start an idea</h3>
            </div>
            <BookOpen className="h-5 w-5 text-muted" aria-hidden />
          </div>
          <div className="grid gap-3">
            {quickSuggestions.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setPrompt(item.suggestion)}
                className="group flex flex-col gap-2 rounded-[14px] border border-border/60 bg-background/95 px-4 py-3 text-left transition hover:border-border hover:bg-background/85"
              >
                <span className="flex items-center justify-between text-sm font-semibold text-foreground">
                  {item.title}
                  <ArrowRight className="h-4 w-4 text-muted transition group-hover:text-foreground" aria-hidden />
                </span>
                <span className="text-xs text-muted">{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[16px] border border-border/60 bg-background/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Preview</p>
              <h3 className="text-base font-semibold text-foreground">AI proposal</h3>
            </div>
            <Button
              type="button"
              variant="primary"
              className="h-10 gap-2 rounded-[12px] px-4 text-xs font-semibold shadow-soft"
              onClick={handleApply}
              disabled={!prompt.trim()}
            >
              Apply to Request Builder
            </Button>
          </div>
          <div className="flex-1 overflow-hidden rounded-[14px] border border-border/50 bg-background/95">
            <pre className="h-full max-h-72 overflow-auto px-4 py-3 text-xs leading-relaxed text-muted" aria-live="polite">
              {preview ?? 'Compose to generate a draft request blueprint.'}
            </pre>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AIRequestComposer;
