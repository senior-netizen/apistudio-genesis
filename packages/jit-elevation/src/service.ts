import { randomUUID } from 'crypto';

import { canApproveElevation, defaultJitConfig, getHigherRole, isHigherRole } from './policy';
import {
  ActiveElevation,
  ApproveElevationInput,
  CancelElevationInput,
  ElevationQueryInput,
  ElevationRequest,
  ElevationRequestInput,
  JitAuditEntry,
  JitElevationConfig,
  RejectElevationInput,
} from './types';
import { ElevationRepository, toActiveElevation } from './repository';

export class JitElevationService {
  constructor(
    private repository: ElevationRepository,
    private config: JitElevationConfig = defaultJitConfig(),
    private emitAudit: (entry: JitAuditEntry) => void | Promise<void> = () => {},
    private clock: () => Date = () => new Date(),
  ) {}

  async requestElevation(input: ElevationRequestInput): Promise<ElevationRequest> {
    if (!this.config.enabled) throw new Error('JIT elevation disabled');
    if (!isHigherRole(input.requestedRole, input.requesterCurrentRole)) {
      throw new Error('Requested role must be higher than current role');
    }

    const now = this.clock();
    const request: ElevationRequest = {
      id: randomUUID(),
      requesterId: input.requesterId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId ?? null,
      requestedRole: input.requestedRole,
      scopeType: input.scopeType,
      reason: input.reason,
      status: 'pending',
      requestedDurationMinutes: input.requestedDurationMinutes,
      elevatedFromRole: input.requesterCurrentRole,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? null,
    };

    await this.repository.create(request);
    await this.emitAudit({
      type: 'jit.request.created',
      payload: request,
    });
    return request;
  }

  async approveElevation(input: ApproveElevationInput): Promise<ElevationRequest> {
    if (!this.config.enabled) throw new Error('JIT elevation disabled');
    const request = await this.repository.findById(input.requestId);
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Only pending requests can be approved');
    if (input.approvedDurationMinutes > this.config.maxDurationMinutes)
      throw new Error('Requested duration exceeds policy');

    if (
      !canApproveElevation({
        approverRole: input.approverRole,
        requesterCurrentRole: request.elevatedFromRole,
        requestedRole: request.requestedRole,
        scopeType: request.scopeType,
      })
    ) {
      throw new Error('Approver not authorized to approve this elevation');
    }

    const now = this.clock();
    const expiresAt = new Date(now.getTime() + input.approvedDurationMinutes * 60 * 1000);
    const updated: ElevationRequest = {
      ...request,
      approverId: input.approverId,
      approvedDurationMinutes: input.approvedDurationMinutes,
      elevatedToRole: request.requestedRole,
      effectiveFrom: now,
      expiresAt,
      status: 'approved',
      updatedAt: now,
    };

    await this.repository.update(request.id, updated);
    await this.emitAudit({
      type: 'jit.request.approved',
      payload: updated,
    });
    return updated;
  }

  async rejectElevation(input: RejectElevationInput): Promise<ElevationRequest> {
    const request = await this.repository.findById(input.requestId);
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Only pending requests can be rejected');

    const now = this.clock();
    const updated: ElevationRequest = {
      ...request,
      status: 'rejected',
      approverId: input.approverId,
      updatedAt: now,
      metadata: {
        ...request.metadata,
        rejectionReason: input.reason,
      },
    };

    await this.repository.update(request.id, updated);
    await this.emitAudit({
      type: 'jit.request.rejected',
      payload: updated,
    });
    return updated;
  }

  async cancelElevation(input: CancelElevationInput): Promise<ElevationRequest> {
    const request = await this.repository.findById(input.requestId);
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Only pending requests can be cancelled');
    if (request.requesterId !== input.requesterId) throw new Error('Only requester can cancel');

    const now = this.clock();
    const updated: ElevationRequest = {
      ...request,
      status: 'cancelled',
      updatedAt: now,
    };

    await this.repository.update(request.id, updated);
    await this.emitAudit({
      type: 'jit.request.cancelled',
      payload: updated,
    });
    return updated;
  }

  async getActiveElevationForUser(query: ElevationQueryInput): Promise<ActiveElevation | null> {
    if (!this.config.enabled) return null;
    const record = await this.repository.findActiveForUser(query, this.clock());
    if (!record) return null;
    return toActiveElevation(record);
  }

  async expireElevationsNow(): Promise<void> {
    const now = this.clock();
    const expired = await this.repository.findExpired(now);
    for (const request of expired) {
      const updated: ElevationRequest = {
        ...request,
        status: 'expired',
        updatedAt: now,
      };
      await this.repository.update(request.id, updated);
      await this.emitAudit({
        type: 'jit.request.expired',
        payload: updated,
      });
    }
  }
}

export function effectiveRoleWithElevation(baseRole: string, elevation?: ActiveElevation | null): string {
  if (!elevation) return baseRole;
  const elevated = getHigherRole(baseRole, elevation.elevatedToRole) ?? baseRole;
  return elevated;
}
