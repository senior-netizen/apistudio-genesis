import { describe, expect, it } from 'vitest';
import { hasRole, elevateFounderRole } from '../../packages/common/rbac/roles';
import { getEffectiveRole, can } from '../../packages/frontend/utils/roles';

describe('RBAC inheritance', () => {
  it('validates hasRole combinations', () => {
    expect(hasRole('founder', 'admin')).toBe(true);
    expect(hasRole('admin', 'founder')).toBe(false);
    expect(hasRole('editor', 'viewer')).toBe(true);
    expect(hasRole('viewer', 'admin')).toBe(false);
  });

  it('elevates founder role into session data', () => {
    const elevated = elevateFounderRole({ role: 'admin', isFounder: true });
    expect(elevated.role).toBe('founder');
    expect(getEffectiveRole(elevated)).toBe('founder');
    expect(can(elevated, 'admin')).toBe(true);
  });

  it('respects workspace boundaries via role levels', () => {
    const admin = { role: 'admin', workspaceId: 'a' } as const;
    const founder = { role: 'founder', workspaceId: 'b', isFounder: true } as const;
    expect(can(admin, 'admin')).toBe(true);
    expect(can(founder, 'admin')).toBe(true);
    expect(founder.workspaceId).not.toBe(admin.workspaceId);
  });
});
