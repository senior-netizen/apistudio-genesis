import { Button, Card } from '@sdl/ui';
import { formatDistanceToNow } from 'date-fns';
import type { ProductAnnouncement } from '../../types/announcements';

interface AnnouncementBannerProps {
  announcement: ProductAnnouncement | null;
  isLoading?: boolean;
  isError?: boolean;
}

export function AnnouncementBanner({ announcement, isLoading, isError }: AnnouncementBannerProps) {
  if (isLoading) {
    return (
      <Card className="flex items-center justify-between gap-4 border border-border/40 bg-background/80 px-6 py-4 shadow-md shadow-black/5">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-foreground/10" />
          <div className="h-4 w-64 animate-pulse rounded-full bg-foreground/10" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-full bg-foreground/10" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card
        role="status"
        aria-live="polite"
        className="flex items-center justify-between gap-4 border border-destructive/50 bg-destructive/10 px-6 py-4 text-destructive"
      >
        <span className="text-sm font-medium">We could not load what’s new right now. Please try again later.</span>
      </Card>
    );
  }

  if (!announcement) {
    return null;
  }

  const publishedLabel = formatDistanceToNow(new Date(announcement.publishedAt), { addSuffix: true });

  return (
    <Card
      role="region"
      aria-label={`Product announcement: ${announcement.title}`}
      className="flex flex-col gap-4 border border-border/40 bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5 text-foreground shadow-md shadow-black/5 md:flex-row md:items-center md:justify-between"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary">
          {announcement.tag ?? 'Update'}
          <span className="text-muted">• {publishedLabel}</span>
        </div>
        <p className="text-lg font-semibold tracking-tight">{announcement.title}</p>
        <p className="text-sm text-muted md:max-w-xl">{announcement.description}</p>
      </div>
      <Button asChild variant="primary" className="whitespace-nowrap">
        <a href={announcement.href}>{announcement.ctaLabel}</a>
      </Button>
    </Card>
  );
}

export default AnnouncementBanner;
