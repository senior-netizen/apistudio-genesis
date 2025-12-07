import { describe, expect, it } from 'vitest';
import {
  EvaluationContext,
  Policy,
  combineRbacAndPolicies,
  defaultPolicyEngineConfig,
  evaluatePolicies,
} from '../src/index';

const baseContext: EvaluationContext = {
  userId: 'user-123',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  userRoles: ['editor'],
  clientType: 'web',
  resource: 'workspace:ws-1/request/req-1',
  action: 'requests:read',
};

const basePolicy: Policy = {
  id: 'policy-1',
  scopeId: 'org-1',
  scopeType: 'organization',
  name: 'Test policy',
  description: 'Example policy for tests',
  enabled: true,
  createdBy: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  statements: [
    {
      id: 's1',
      effect: 'Allow',
      actions: ['requests:read'],
      resources: ['workspace:ws-1/request/*'],
      principal: { roles: ['editor'] },
    },
  ],
};

describe('evaluatePolicies', () => {
  it('matches action and resource patterns', () => {
    const result = evaluatePolicies([basePolicy], baseContext);
    expect(result.effect).toBe('Allow');
    expect(result.matchedStatements.map((stmt) => stmt.id)).toContain('s1');
  });

  it('enforces deny precedence', () => {
    const denyPolicy: Policy = {
      ...basePolicy,
      id: 'policy-2',
      statements: [
        {
          id: 'deny-1',
          effect: 'Deny',
          actions: ['requests:*'],
          resources: ['workspace:ws-1/*'],
        },
        ...basePolicy.statements,
      ],
    };

    const result = evaluatePolicies([denyPolicy], baseContext);
    expect(result.effect).toBe('Deny');
    expect(result.matchedStatements.map((stmt) => stmt.id)).toContain('deny-1');
  });

  it('respects principals including groups', () => {
    const policy: Policy = {
      ...basePolicy,
      statements: [
        {
          id: 'group-allow',
          effect: 'Allow',
          actions: ['requests:read'],
          resources: ['workspace:ws-1/*'],
          principal: { groups: ['devs'] },
        },
      ],
    };

    const result = evaluatePolicies([policy], { ...baseContext, ssoGroups: ['devs'] });
    expect(result.effect).toBe('Allow');
  });

  it('fails principal match when user is not listed', () => {
    const policy: Policy = {
      ...basePolicy,
      statements: [
        {
          id: 'user-specific',
          effect: 'Allow',
          actions: ['requests:read'],
          resources: ['workspace:ws-1/*'],
          principal: { users: ['different-user'] },
        },
      ],
    };

    const result = evaluatePolicies([policy], baseContext);
    expect(result.effect).toBe('NoMatch');
  });

  it('evaluates IP CIDR condition', () => {
    const policy: Policy = {
      ...basePolicy,
      statements: [
        {
          id: 'ip-guard',
          effect: 'Allow',
          actions: ['requests:read'],
          resources: ['workspace:ws-1/*'],
          conditions: { ip: { inCIDR: ['10.0.0.0/8'] } },
        },
      ],
    };

    const result = evaluatePolicies([policy], { ...baseContext, ipAddress: '10.1.2.3' });
    expect(result.effect).toBe('Allow');

    const denied = evaluatePolicies([policy], { ...baseContext, ipAddress: '192.168.0.1' });
    expect(denied.effect).toBe('NoMatch');
  });

  it('evaluates time windows and tag containment', () => {
    const policy: Policy = {
      ...basePolicy,
      statements: [
        {
          id: 'time-and-tag',
          effect: 'Allow',
          actions: ['requests:read'],
          resources: ['workspace:ws-1/*'],
          conditions: { time: { between: ['09:00', '18:00'] }, workspaceTags: { contains: ['production'] } },
        },
      ],
    };

    const withinHours = new Date('2024-01-01T10:30:00Z');
    const outsideHours = new Date('2024-01-01T22:00:00Z');

    const allowed = evaluatePolicies([policy], {
      ...baseContext,
      time: withinHours,
      workspaceTags: ['production', 'payments'],
    });
    expect(allowed.effect).toBe('Allow');

    const denied = evaluatePolicies([policy], {
      ...baseContext,
      time: outsideHours,
      workspaceTags: ['production'],
    });
    expect(denied.effect).toBe('NoMatch');
  });

  it('requires JIT flag when requested', () => {
    const policy: Policy = {
      ...basePolicy,
      statements: [
        {
          id: 'jit-required',
          effect: 'Allow',
          actions: ['requests:read'],
          resources: ['workspace:ws-1/*'],
          conditions: { jit: { required: true } },
        },
      ],
    };

    const allowed = evaluatePolicies([policy], { ...baseContext, jitActive: true });
    expect(allowed.effect).toBe('Allow');

    const denied = evaluatePolicies([policy], { ...baseContext, jitActive: false });
    expect(denied.effect).toBe('NoMatch');
  });
});

describe('integration with RBAC flow', () => {
  it('denies when RBAC allowed but policy denies', () => {
    const policy: Policy = {
      ...basePolicy,
      statements: [
        {
          id: 'deny-action',
          effect: 'Deny',
          actions: ['requests:read'],
          resources: ['workspace:ws-1/*'],
        },
      ],
    };

    const result = combineRbacAndPolicies(true, evaluatePolicies([policy], baseContext), defaultPolicyEngineConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Denied by policy');
  });

  it('allows when both RBAC and policy allow', () => {
    const result = combineRbacAndPolicies(true, evaluatePolicies([basePolicy], baseContext), defaultPolicyEngineConfig);
    expect(result.allowed).toBe(true);
  });

  it('does not elevate when RBAC denies and policy allows without override', () => {
    const result = combineRbacAndPolicies(false, evaluatePolicies([basePolicy], baseContext), defaultPolicyEngineConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Denied by RBAC');
  });
});
