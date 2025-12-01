import { Card } from '@sdl/ui';

interface LoadingProps {
  label?: string;
  inCard?: boolean;
}

export default function Loading({ label, inCard = false }: LoadingProps) {
  const content = (
    <div className="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-border/70 border-t-accent" />
      <span>Loading{label ? ` ${label}` : ''}…</span>
    </div>
  );

  if (inCard) {
    return (
      <Card className="border border-border/60 bg-background/80 p-4">
        {content}
      </Card>
    );
  }

  return content;
}

