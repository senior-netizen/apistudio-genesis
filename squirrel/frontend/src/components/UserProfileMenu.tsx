import { FounderBadge } from '@sdl/ui';
import { useCurrentUser } from '../lib/data/useCurrentUser';

export function UserProfileMenu() {
  const { user, isOwner, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div
        className="h-10 w-32 animate-pulse rounded-full border border-border/60 bg-foreground/5"
        aria-hidden
      />
    );
  }

  if (!user) {
    return null;
  }

  const primaryLabel = user.displayName?.trim() ? user.displayName : user.email;
  const secondaryLabel = user.displayName?.trim() ? user.email : undefined;

  return (
    <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
      <div className="leading-tight">
        <p className="text-sm font-medium text-foreground">{primaryLabel}</p>
        {secondaryLabel ? <p className="text-xs text-muted">{secondaryLabel}</p> : null}
      </div>
      {isOwner ? <FounderBadge aria-label="Founder account" /> : null}
    </div>
  );
}

export default UserProfileMenu;
