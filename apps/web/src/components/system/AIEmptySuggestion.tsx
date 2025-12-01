import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import FrostCard from './FrostCard';

export interface AISuggestionAction {
  label: string;
  description?: string;
  onSelect?: () => void;
  icon?: ReactNode;
}

export interface AIEmptySuggestionProps {
  headline?: string;
  body?: string;
  actions?: AISuggestionAction[];
  className?: string;
}

const defaultSuggestions: AISuggestionAction[] = [
  {
    label: 'Generate Request Example',
    description: 'Let AI craft a ready-to-run request with headers and payloads.'
  },
  {
    label: 'Suggest Schema Format',
    description: 'Instantly outline a schema structure for consistent responses.'
  },
  {
    label: 'Auto-Document Endpoint',
    description: 'Produce elegant endpoint documentation and usage notes.'
  }
];

export function AIEmptySuggestion({ headline, body, actions, className }: AIEmptySuggestionProps) {
  const suggestionItems = actions?.length ? actions : defaultSuggestions;

  return (
    <FrostCard
      title={headline ?? 'AI can jumpstart this space'}
      subtitle={body ?? 'Use Squirrel AI to scaffold requests, schemas, or documentation instantly.'}
      kicker="Assistive Mode"
      className={cn('relative overflow-hidden', className)}
      tone="accent"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {suggestionItems.map((action) => (
          <motion.button
            key={action.label}
            type="button"
            onClick={action.onSelect}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="group flex h-full flex-col justify-between rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[rgba(110,72,255,0.35)] hover:shadow-[0_18px_44px_-26px_rgba(110,72,255,0.55)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/10 text-accent">
                {action.icon ?? <Sparkles className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground/90">{action.label}</p>
                {action.description ? <p className="text-xs text-muted/80">{action.description}</p> : null}
              </div>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted/70">
              <Sparkles className="h-3 w-3 text-accent" />
              Generate
            </span>
          </motion.button>
        ))}
      </div>
    </FrostCard>
  );
}

export default AIEmptySuggestion;
