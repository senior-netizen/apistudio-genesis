// Request/Composer domain contracts define how executed requests are broadcast to other services.
import { z } from 'zod';
import { buildDomainEvent, DomainEvent, eventEnvelopeSchema } from './base-event';

const apiRequestPayload = z.object({
  requestId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  statusCode: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
});

export const apiRequestExecutedEventV1Schema = eventEnvelopeSchema.extend({
  name: z.literal('requests.api.executed'),
  version: z.literal(1),
  payload: apiRequestPayload,
});

export type ApiRequestExecutedEventV1 = DomainEvent<z.infer<typeof apiRequestPayload>>;

export function createApiRequestExecutedEvent(
  payload: z.infer<typeof apiRequestExecutedEventV1Schema.shape.payload>,
): ApiRequestExecutedEventV1 {
  return buildDomainEvent({ name: 'requests.api.executed', version: 1, payload });
}
