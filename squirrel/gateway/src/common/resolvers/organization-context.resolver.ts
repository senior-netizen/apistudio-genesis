import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class OrganizationContextResolver {
  resolve(request: Request & { organization?: { id: string } }): string | undefined {
    if (request.organization?.id) {
      return request.organization.id;
    }

    const paramOrgId = request.params?.orgId || request.params?.organizationId;
    if (paramOrgId) {
      return String(paramOrgId);
    }

    const headerOrgId = request.headers['x-organization-id'] || request.headers['x-org-id'];
    if (headerOrgId) {
      return Array.isArray(headerOrgId) ? headerOrgId[0] : String(headerOrgId);
    }

    const queryOrgId = request.query?.orgId ?? request.query?.organizationId;
    if (Array.isArray(queryOrgId)) {
      return String(queryOrgId[0]);
    }
    if (typeof queryOrgId === 'string') {
      return queryOrgId;
    }

    return undefined;
  }
}
