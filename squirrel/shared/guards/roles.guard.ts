import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasRole } from '../rbac/roles';

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
    const hasRequired = uniqueRoles.some((role) => roles.some((required) => hasRole(role, required)));
    if (!hasRequired) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
