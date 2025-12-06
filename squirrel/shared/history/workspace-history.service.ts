export interface WorkspaceHistoryEvent {
  actorId?: string;
  workspaceId?: string;
  type: string;
  effectiveRole?: string | null;
  allowedByRBAC: boolean;
  diff?: Record<string, unknown> | null;
  timestamp: string;
}

export class WorkspaceHistoryService {
  private readonly events: WorkspaceHistoryEvent[] = [];

  record(event: Omit<WorkspaceHistoryEvent, 'timestamp'> & { timestamp?: string }): void {
    const normalized: WorkspaceHistoryEvent = Object.freeze({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    this.events.push(normalized);
  }

  list(workspaceId?: string): ReadonlyArray<WorkspaceHistoryEvent> {
    const filtered = workspaceId
      ? this.events.filter((event) => event.workspaceId === workspaceId)
      : this.events;
    return Object.freeze([...filtered]);
  }
}

export const defaultWorkspaceHistoryService = new WorkspaceHistoryService();
