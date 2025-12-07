import { describe, expect, it } from 'vitest';

import { canApproveElevation, getHigherRole, isHigherRole } from '../src/policy';

describe('role precedence helpers', () => {
  it('checks higher role precedence', () => {
    expect(isHigherRole('founder', 'org_owner')).toBe(true);
    expect(isHigherRole('editor', 'maintainer')).toBe(false);
    expect(isHigherRole('workspace_admin', 'workspace_admin')).toBe(false);
  });

  it('returns higher of two roles', () => {
    expect(getHigherRole('maintainer', 'editor')).toBe('maintainer');
    expect(getHigherRole('org_owner', 'founder')).toBe('founder');
    expect(getHigherRole(null, 'viewer')).toBe('viewer');
  });
});

describe('canApproveElevation', () => {
  it('allows founders to approve anything', () => {
    expect(
      canApproveElevation({
        approverRole: 'founder',
        requesterCurrentRole: 'viewer',
        requestedRole: 'org_owner',
        scopeType: 'organization',
      }),
    ).toBe(true);
  });

  it('prevents peers from approving each other', () => {
    expect(
      canApproveElevation({
        approverRole: 'workspace_admin',
        requesterCurrentRole: 'workspace_admin',
        requestedRole: 'maintainer',
        scopeType: 'workspace',
      }),
    ).toBe(false);
  });

  it('allows workspace owner to promote viewer to maintainer', () => {
    expect(
      canApproveElevation({
        approverRole: 'workspace_owner',
        requesterCurrentRole: 'viewer',
        requestedRole: 'maintainer',
        scopeType: 'workspace',
      }),
    ).toBe(true);
  });

  it('blocks org_admin from approving org_owner', () => {
    expect(
      canApproveElevation({
        approverRole: 'org_admin',
        requesterCurrentRole: 'org_admin',
        requestedRole: 'org_owner',
        scopeType: 'organization',
      }),
    ).toBe(false);
  });
});
