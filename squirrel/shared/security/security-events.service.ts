export type SecurityEventType =
  | 'rbac.denied'
  | 'rbac.success'
  | 'sso.role.override'
  | 'workspace.ownership.changed'
  | 'login.suspicious';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  workspaceId?: string;
  effectiveRole?: string | null;
  requiredRole?: string | null;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class SecurityEventsService {
  private readonly events: SecurityEvent[] = [];

  emit(event: Omit<SecurityEvent, 'timestamp'> & { timestamp?: string }): void {
    const normalized: SecurityEvent = Object.freeze({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    this.events.push(normalized);
  }

  list(): ReadonlyArray<SecurityEvent> {
    return Object.freeze([...this.events]);
  }
}

export const defaultSecurityEventsService = new SecurityEventsService();
