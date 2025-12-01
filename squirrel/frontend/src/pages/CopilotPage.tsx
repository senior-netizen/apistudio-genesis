import { Button, Card } from '@sdl/ui';
import { MessageSquarePlus, RefreshCw, Sparkles } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';

type Message = {
  id: number;
  role: 'user' | 'copilot';
  content: string;
};

const promptTemplates = [
  'Design a REST endpoint for creating invoices with validation rules.',
  'Generate contract tests for the payments webhook consumer.',
  'Summarise the changes between schema versions v1.2.0 and v1.3.0.'
];

function craftCopilotResponse(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('test')) {
    return 'I have scaffolded deterministic contract tests with seeded fixtures. You can run them with `yarn test:contracts` and view coverage in Watchtower.';
  }

  if (normalized.includes('schema') || normalized.includes('design')) {
    return 'Here is a proposed schema diff with backwards compatibility notes. The new version includes pagination cursors, stronger typing for identifiers, and optimistic locking headers.';
  }

  if (normalized.includes('webhook')) {
    return 'The webhook consumer will acknowledge events within 45ms and retries with exponential backoff. I also generated a replay script so you can reproduce incidents locally.';
  }

  return 'I have analysed your request and generated an execution plan with linting, schema migration scripts, and release notes. You can review each step before applying it to staging.';
}

export function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'copilot',
      content: 'Welcome back! I can draft endpoints, tests, and release checklists for you. What should we assemble today?'
    }
  ]);
  const [input, setInput] = useState('');
  const { prefillRequestFromAi } = useNavigationFlows();

  const conversation = useMemo(() => messages.slice(-6), [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    const reply: Message = {
      id: Date.now() + 1,
      role: 'copilot',
      content: craftCopilotResponse(input)
    };

    setMessages((prev) => [...prev, userMessage, reply]);
    setInput('');
    prefillRequestFromAi(userMessage.content, reply.content);
  };

  const injectTemplate = (template: string) => {
    setInput(template);
  };

  const resetConversation = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'copilot',
        content: 'Conversation cleared. Ready for a fresh architectural brief whenever you are.'
      }
    ]);
    setInput('');
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Copilot workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Squirrel Copilot</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Draft full API blueprints, generate regression tests, and orchestrate deployment rituals with a single prompt.
            Copilot synthesises SDL primitives into a guided execution plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={resetConversation}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Reset session
          </Button>
          <Button variant="subtle">
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            Open prompt library
          </Button>
        </div>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Active conversation</h2>
        </div>

        <div className="mt-6 space-y-4">
          {conversation.map((message) => (
            <div
              key={message.id}
              className="rounded-xl border border-border/40 bg-white/60 p-4 text-sm shadow-sm dark:bg-white/5"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-muted">{message.role === 'user' ? 'You' : 'Copilot'}</p>
              <p className="mt-2 whitespace-pre-wrap text-foreground">{message.content}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs uppercase tracking-[0.3em] text-muted" htmlFor="copilot-input">
            Ask Copilot
          </label>
          <textarea
            id="copilot-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border/50 bg-background/80 p-4 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Describe the workflow you would like Copilot to assemble..."
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {promptTemplates.map((template) => (
                <Button key={template} type="button" size="sm" variant="ghost" onClick={() => injectTemplate(template)}>
                  {template}
                </Button>
              ))}
            </div>
            <Button type="submit" variant="primary">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Stream plan
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export default CopilotPage;
