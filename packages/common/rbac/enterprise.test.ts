import { describe, expect, it, vi } from 'vitest';

import { evaluateRole, getWorkspaceRole, resolveRoleConflicts } from './enterprise';

describe('enterprise RBAC conflict resolution', () => {
  it('favors founder over every other role', () => {
    expect(
      resolveRoleConflicts({
        founderFlag: true,
        organizationRole: 'org_admin',
        workspaceRole: 'viewer',
      }),
    ).toBe('founder');
  });

  it('resolves organization and workspace conflicts with priority order', () => {
    expect(
      resolveRoleConflicts({
        organizationRole: 'org_admin',
        workspaceRole: 'editor',
      }),
    ).toBe('org_admin');

    expect(
      resolveRoleConflicts({
        organizationRole: 'org_security',
        workspaceRole: 'workspace_owner',
      }),
    ).toBe('org_security');
  });
});

describe('evaluateRole', () => {
  const orgUser = {
    id: 'u1',
    organizationId: 'org-1',
    organizationRole: 'org_owner' as const,
    workspaceRoles: {},
    isFounder: false,
  };

  it('allows organization owners across all workspaces', () => {
    const logger = vi.fn();
    const result = evaluateRole(orgUser, 'ws-123', 'editor', { logger });

    expect(result.allowed).toBe(true);
    expect(result.effectiveRole).toBe('org_owner');
    expect(result.source).toBe('organization');
    expect(logger).toHaveBeenCalled();
  });

  it('inherits workspace admin for organization admins', () => {
    const logger = vi.fn();
    const result = evaluateRole(
      { ...orgUser, organizationRole: 'org_admin' },
      'ws-123',
      'admin',
      { logger },
    );

    expect(result.allowed).toBe(true);
    expect(result.effectiveRole).toBe('org_admin');
    expect(result.source).toBe('organization');
  });

  it('blocks billing roles from workspace content', () => {
    const logger = vi.fn();
    const result = evaluateRole(
      { ...orgUser, organizationRole: 'org_billing' },
      'ws-123',
      'editor',
      { logger },
    );

    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe('viewer');
    expect(result.source).toBe('fallback');
  });

  it('honors SSO role mappings with highest priority per context', () => {
    const logger = vi.fn();
    const result = evaluateRole(
      {
        ...orgUser,
        organizationRole: 'org_member',
        ssoGroups: ['OktaGroup:Engineering', 'OktaGroup:SecurityTeam'],
      },
      'ws-123',
      'org_security',
      {
        logger,
        ssoRoleMap: {
          'OktaGroup:Engineering': 'maintainer',
          'OktaGroup:SecurityTeam': 'org_security',
        },
      },
    );

    expect(result.allowed).toBe(true);
    expect(result.effectiveRole).toBe('org_security');
    expect(result.source).toBe('sso');
  });
});

describe('getWorkspaceRole', () => {
  it('returns founder when flagged regardless of workspace role', () => {
    const result = getWorkspaceRole(
      { id: 'u2', isFounder: true, workspaceRoles: { 'ws-1': 'viewer' } },
      'ws-1',
    );

    expect(result.role).toBe('founder');
    expect(result.source).toBe('founder');
  });
});
