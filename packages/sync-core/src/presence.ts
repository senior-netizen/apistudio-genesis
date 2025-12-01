import type { SyncPresenceEvent } from './types';

export interface PresenceState {
  deviceId: string;
  lastSeenAt: number;
  events: SyncPresenceEvent[];
}

export class PresenceTracker {
  private readonly presence = new Map<string, PresenceState>();

  constructor(private readonly ttlMs = 30000) {}

  observe(event: SyncPresenceEvent): void {
    const state = this.presence.get(event.deviceId) ?? {
      deviceId: event.deviceId,
      lastSeenAt: Date.now(),
      events: [],
    };
    state.lastSeenAt = Date.now();
    state.events = [...state.events.filter((existing) => existing.type !== event.type), event];
    this.presence.set(event.deviceId, state);
  }

  list(): PresenceState[] {
    const now = Date.now();
    for (const [deviceId, state] of this.presence.entries()) {
      if (now - state.lastSeenAt > this.ttlMs) {
        this.presence.delete(deviceId);
      }
    }
    return [...this.presence.values()].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  }
}
