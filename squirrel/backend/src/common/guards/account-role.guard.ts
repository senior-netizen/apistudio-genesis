import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCOUNT_ROLES_KEY, type AccountRole } from '../decorators/account-roles.decorator';

@Injectable()
export class AccountRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccountRole[]>(ACCOUNT_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: string } | undefined;
    if (!user?.role) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient account role' });
    }

    const normalizedRole = String(user.role).toLowerCase();
    const normalizedRequired = required.map((role) => String(role).toLowerCase());
    if (!normalizedRequired.includes(normalizedRole)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient account role' });
    }
    return true;
  }
}
