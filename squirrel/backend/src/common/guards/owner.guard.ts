import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: string } | undefined;
    if (!user?.role || String(user.role).toLowerCase() !== 'founder') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Founder access required' });
    }
    return true;
  }
}
