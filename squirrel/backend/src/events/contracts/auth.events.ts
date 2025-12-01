// Versioned Auth domain events used by both the monolith and future auth microservice.
import { z } from 'zod';
import { buildDomainEvent, DomainEvent, eventEnvelopeSchema } from './base-event';

const userIdentityPayload = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  workspaceId: z.string().uuid().optional(),
});

export const userCreatedEventV1Schema = eventEnvelopeSchema.extend({
  name: z.literal('auth.user.created'),
  version: z.literal(1),
  payload: userIdentityPayload,
});

export type UserCreatedEventV1 = DomainEvent<z.infer<typeof userIdentityPayload>>;

export const userLoggedInEventV1Schema = eventEnvelopeSchema.extend({
  name: z.literal('auth.user.logged_in'),
  version: z.literal(1),
  payload: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    sessionId: z.string().uuid().optional(),
  }),
});

export type UserLoggedInEventV1 = DomainEvent<z.infer<typeof userLoggedInEventV1Schema.shape.payload>>;

export function createUserCreatedEvent(payload: z.infer<typeof userIdentityPayload>): UserCreatedEventV1 {
  return buildDomainEvent({ name: 'auth.user.created', version: 1, payload });
}

export function createUserLoggedInEvent(
  payload: z.infer<typeof userLoggedInEventV1Schema.shape.payload>,
): UserLoggedInEventV1 {
  return buildDomainEvent({ name: 'auth.user.logged_in', version: 1, payload });
}
