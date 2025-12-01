import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';
import { OrganizationContextResolver } from '../resolvers/organization-context.resolver';
import type { OrganizationMembership, OrganizationRole } from '../types/organization-role.type';

@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationContextResolver: OrganizationContextResolver,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & {
      user?: Record<string, unknown> & { organizations?: OrganizationMembership[] };
      organization?: { id: string; role?: OrganizationRole };
    }>();

    const organizationId = this.organizationContextResolver.resolve(request);
    if (!organizationId) {
      throw new BadRequestException('Organization context is required');
    }

    const membership = this.resolveMembership(request, organizationId);
    if (!membership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Missing required organization role');
    }

    request.organization = { id: organizationId, role: membership.role };
    return true;
  }

  private resolveMembership(
    request: Request & {
      user?: Record<string, unknown> & { organizations?: OrganizationMembership[] };
    },
    organizationId: string,
  ): OrganizationMembership | undefined {
    const user = request.user;
    const organizations: OrganizationMembership[] | undefined = user?.organizations as
      | OrganizationMembership[]
      | undefined;

    if (organizations?.length) {
      const match = organizations.find((org) => org.organizationId === organizationId || org.id === organizationId);
      if (match) {
        return {
          organizationId,
          role: match.role,
        };
      }
    }

    const headerRole = request.headers['x-organization-role'] || request.headers['x-org-role'];
    if (headerRole) {
      const value = Array.isArray(headerRole) ? headerRole[0] : String(headerRole);
      return { organizationId, role: value as OrganizationRole };
    }

    const queryRole = request.query?.role || request.query?.organizationRole;
    if (queryRole) {
      const value = Array.isArray(queryRole) ? queryRole[0] : String(queryRole);
      return { organizationId, role: value as OrganizationRole };
    }

    return undefined;
  }
}
