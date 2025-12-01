import { useMemo } from 'react';
import { useCollab } from './CollabProvider';
import { useAppStore } from '../../store';

export function CollaboratorAvatars() {
  const { members } = useCollab();
  const collaborationMembers = useAppStore((state) => state.collaboration.members);
  const roleLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const member of collaborationMembers) {
      if (member.email) {
        lookup.set(member.email.toLowerCase(), member.role);
      }
    }
    return lookup;
  }, [collaborationMembers]);
  const visible = useMemo(() => members.slice(0, 5), [members]);
  if (members.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {visible.map((member) => {
          const initials = member.displayName.slice(0, 2).toUpperCase();
          const role = member.email ? roleLookup.get(member.email.toLowerCase()) : undefined;
          const descriptor = role ? `${member.displayName} · ${role}` : member.displayName;
          return (
            <span
              key={member.socketId}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-foreground/90 text-xs font-semibold text-white shadow-sm ring-2 ring-white/40"
              style={{ backgroundColor: member.color }}
              title={descriptor}
              aria-label={descriptor}
              data-role={role ?? undefined}
            >
              {initials}
            </span>
          );
        })}
        {members.length > visible.length && (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-xs text-muted shadow-inner"
            aria-label={`${members.length - visible.length} more collaborators`}
          >
            +{members.length - visible.length}
          </span>
        )}
      </div>
      <span className="text-xs uppercase tracking-[0.3em] text-muted">Live</span>
    </div>
  );
}
