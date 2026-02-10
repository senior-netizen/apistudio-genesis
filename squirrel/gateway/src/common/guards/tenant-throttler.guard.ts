import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

type TenantRequest = {
  ip?: string;
  headers?: Record<string, unknown>;
  user?: Record<string, unknown>;
};

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: TenantRequest): Promise<string> {
    const orgId = this.readString(
      req.headers?.['x-org-id'],
      req.headers?.['x-organization-id'],
      req.user?.orgId,
      req.user?.organizationId,
      req.user?.org_id,
      req.user?.organization_id,
    ) ?? 'org:unknown';

    const workspaceId =
      this.readString(req.headers?.['x-workspace-id'], req.user?.workspaceId, req.user?.workspace_id) ??
      'workspace:unknown';

    const ip = this.readString(req.ip) ?? 'ip:unknown';
    return `tenant:${orgId}:${workspaceId}:${ip}`;
  }

  private readString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'string' && first.length > 0) {
          return first;
        }
      }
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }
}
