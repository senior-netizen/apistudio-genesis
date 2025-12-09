export type ElevationScopeType = 'organization' | 'workspace';

export type ElevationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface ElevationRequest {
  id: string;
  requesterId: string;
  approverId?: string | null;
  organizationId: string;
  workspaceId?: string | null;
  requestedRole: string;
  scopeType: ElevationScopeType;
  reason: string;
  status: ElevationStatus;
  requestedDurationMinutes: number;
  approvedDurationMinutes?: number | null;
  elevatedFromRole: string;
  elevatedToRole?: string | null;
  effectiveFrom?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface ActiveElevation {
  requestId: string;
  userId: string;
  organizationId: string;
  workspaceId?: string | null;
  elevatedToRole: string;
  effectiveFrom: Date;
  expiresAt: Date;
}

export interface ElevationRequestInput {
  requesterId: string;
  organizationId: string;
  workspaceId?: string | null;
  requestedRole: string;
  scopeType: ElevationScopeType;
  reason: string;
  requestedDurationMinutes: number;
  requesterCurrentRole: string;
  metadata?: Record<string, unknown> | null;
}

export interface ApproveElevationInput {
  requestId: string;
  approverId: string;
  approverRole: string;
  approvedDurationMinutes: number;
}

export interface RejectElevationInput {
  requestId: string;
  approverId: string;
  reason?: string;
}

export interface CancelElevationInput {
  requestId: string;
  requesterId: string;
}

export interface ElevationQueryInput {
  userId: string;
  organizationId: string;
  workspaceId?: string | null;
}

export interface JitElevationConfig {
  enabled: boolean;
  maxDurationMinutes: number;
  defaultDurations: number[];
  notifyApprovers: boolean;
}

export interface JitAuditEntry {
  type:
    | 'jit.request.created'
    | 'jit.request.approved'
    | 'jit.request.rejected'
    | 'jit.request.cancelled'
    | 'jit.request.expired';
  payload: ElevationRequest | Record<string, unknown>;
}
