// Base interfaces for event envelopes shared across services.
// We keep these minimal so that new services can depend on them without pulling application code.
import { z } from 'zod';

export const eventEnvelopeSchema = z.object({
  name: z.string(),
  version: z.number().int().positive(),
  timestamp: z.string(),
  payload: z.unknown(),
});

export type DomainEvent<TPayload> = z.infer<typeof eventEnvelopeSchema> & { payload: TPayload };

export interface EventFactoryContext<TPayload> {
  readonly name: string;
  readonly version: number;
  readonly payload: TPayload;
  readonly occurredAt?: Date;
}

export function buildDomainEvent<TPayload>(context: EventFactoryContext<TPayload>): DomainEvent<TPayload> {
  return {
    name: context.name,
    version: context.version,
    timestamp: (context.occurredAt ?? new Date()).toISOString(),
    payload: context.payload,
  };
}
