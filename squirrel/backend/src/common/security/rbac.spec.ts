import { ForbiddenException } from '@nestjs/common';
import { RolesGuard as BillingRolesGuard } from '../../../../microservices/billing-service/src/common/guards/roles.guard';
import { elevateFounderRole, hasRole } from '../../../../shared/rbac/roles';
import { resolveAccountRole } from './owner-role.util';

describe('RBAC role hierarchy', () => {
  it('allows higher roles to satisfy lower requirements', () => {
    expect(hasRole('founder', 'admin')).toBe(true);
    expect(hasRole('admin', 'editor')).toBe(true);
    expect(hasRole('maintainer', 'viewer')).toBe(true);
  });

  it('does not allow lower roles to satisfy higher requirements', () => {
    expect(hasRole('admin', 'founder')).toBe(false);
    expect(hasRole('viewer', 'editor')).toBe(false);
    expect(hasRole('editor', 'maintainer')).toBe(false);
  });

  it('maintains equality checks for non-hierarchical roles', () => {
    expect(hasRole('paid', 'paid')).toBe(true);
    expect(hasRole('paid', 'pro')).toBe(false);
  });
});

describe('Session founder elevation', () => {
  it('elevates founder flag to founder role on decode', () => {
    const elevated = elevateFounderRole({ role: 'admin', isFounder: true });
    const resolvedRole = resolveAccountRole('founder@example.com', elevated.role, elevated.isFounder);
    expect(resolvedRole).toBe('founder');
  });
});

describe('RolesGuard integration', () => {
  const buildContext = (role: string | string[], required: string[]) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as any;
    const guard = new BillingRolesGuard(reflector);
    const rolesArray = Array.isArray(role) ? role : [role];
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { roles: rolesArray, role: rolesArray[0] } }) }),
    } as any;
    return { guard, context };
  };

  it('allows founder to access admin-guarded routes', () => {
    const { guard, context } = buildContext('founder', ['admin']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks admin from founder-only routes', () => {
    const { guard, context } = buildContext('admin', ['founder']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('respects maintainer/editor/viewer ordering', () => {
    const maintainer = buildContext('maintainer', ['viewer']);
    expect(maintainer.guard.canActivate(maintainer.context)).toBe(true);

    const editor = buildContext('editor', ['maintainer']);
    expect(() => editor.guard.canActivate(editor.context)).toThrow(ForbiddenException);
  });

  it('returns forbidden when missing required role', () => {
    const { guard, context } = buildContext('viewer', ['admin']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
