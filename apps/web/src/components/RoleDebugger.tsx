import { Badge, Card } from '@sdl/ui';
import { can, getEffectiveRole, RoleLevels } from '@sdl/frontend/utils/roles';

interface RoleDebuggerProps {
  user: { role?: string | null; isFounder?: boolean | null } | null;
  profile: { role?: string | null } | null;
  effectiveRole?: string;
}

export function RoleDebugger({ user, profile, effectiveRole }: RoleDebuggerProps) {
  const computedRole = effectiveRole ?? getEffectiveRole(user ?? profile ?? null);
  const adminAccess = can(user ?? profile ?? null, 'admin');

  if (import.meta.env.PROD) return null;

  return (
    <Card className="mb-4 border border-dashed border-border/60 bg-muted/30 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Role Debugger (dev only)</span>
          <span>Profile role: {profile?.role ?? 'unknown'}</span>
          <span>Session role: {user?.role ?? 'unknown'}</span>
          <span>Effective role: {computedRole}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={adminAccess ? 'success' : 'destructive'}>Admin access</Badge>
          <Badge variant="secondary">Level {RoleLevels[computedRole] ?? 0}</Badge>
        </div>
      </div>
    </Card>
  );
}
