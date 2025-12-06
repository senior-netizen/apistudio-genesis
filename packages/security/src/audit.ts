export type SecurityEventType =
  | 'encryption.rotate'
  | 'encryption.failed-decrypt'
  | 'service.invalid-identity'
  | 'tenant.mismatch'
  | 'secret.missing';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  tenantId?: string;
  keyId?: string;
  provider?: string;
  reason?: string;
  actor?: string;
}

export interface SecurityEventSink {
  emit(event: SecurityEvent): void;
}

export class InMemorySecurityEventSink implements SecurityEventSink {
  events: SecurityEvent[] = [];

  emit(event: SecurityEvent): void {
    this.events.push(event);
  }
}

export function recordSecurityEvent(sink: SecurityEventSink | undefined, event: SecurityEvent) {
  if (!sink) return;
  sink.emit(event);
}
