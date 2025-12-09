import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasRole } from '../rbac';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = [];
    if (request.user?.role) {
      userRoles.push(String(request.user.role));
    }
    if (Array.isArray(request.user?.roles)) {
      userRoles.push(...request.user.roles);
    }
    const uniqueRoles = Array.from(new Set(userRoles));

    if (!uniqueRoles.some((role) => requiredRoles.some((required) => hasRole(role, required)))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
