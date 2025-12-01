import { Card } from '@sdl/ui';
import { LoadingSpinner } from './system/LoadingSpinner';

interface LoadingProps {
  label?: string;
  inCard?: boolean;
}

export default function Loading({ label, inCard = false }: LoadingProps) {
  const content = <LoadingSpinner label={label ? `Loading ${label}` : 'Loading…'} />;

  if (inCard) {
    return (
      <Card className="border border-border/60 bg-background/80 p-4">
        {content}
      </Card>
    );
  }

  return content;
}
