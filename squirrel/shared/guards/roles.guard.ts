import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasRole } from '../rbac/roles';
import { defaultAuditLogService } from '../audit/audit-log.service';
import { defaultSecurityEventsService } from '../security/security-events.service';
import { defaultWorkspaceHistoryService } from '../history/workspace-history.service';

@Injectable()
export class SharedRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = [];
    const primaryRole = request.user?.role;
    if (primaryRole) {
      userRoles.push(String(primaryRole));
    }
    if (Array.isArray(request.user?.roles)) {
      userRoles.push(...request.user.roles);
    }
    const uniqueRoles = Array.from(new Set(userRoles));
    const effectiveRole = request.user?.effectiveRole || uniqueRoles[0];
    const requiredRole = roles[0];
    const hasRequired = uniqueRoles.some((role) => roles.some((required) => hasRole(role, required)));

    try {
      defaultAuditLogService.record({
        userId: request.user?.id,
        workspaceId: request.workspaceId || request.params?.workspaceId,
        effectiveRole,
        requiredRole,
        rbacAllowed: hasRequired,
        action: `${context.getClass().name}.${context.getHandler().name}`,
        context: {
          ip: request.ip,
          userAgent: request.headers?.['user-agent'],
        },
        source: request.headers?.['x-client-source'] || request.headers?.['x-request-source'],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // audit log failures must not block the request
      // eslint-disable-next-line no-console
      console.warn('[rbac-guard] audit log failure', error);
    }

    try {
      defaultWorkspaceHistoryService.record({
        actorId: request.user?.id,
        workspaceId: request.workspaceId || request.params?.workspaceId,
        type: 'rbac.check',
        effectiveRole,
        allowedByRBAC: hasRequired,
        diff: null,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[rbac-guard] workspace history failure', error);
    }

    try {
      defaultSecurityEventsService.emit({
        type: hasRequired ? 'rbac.success' : 'rbac.denied',
        userId: request.user?.id,
        workspaceId: request.workspaceId || request.params?.workspaceId,
        effectiveRole,
        requiredRole,
        details: {
          roles: uniqueRoles,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[rbac-guard] security event failure', error);
    }

    if (!hasRequired) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
