// Workspace domain contracts. These will be shared once the workspace service is extracted.
import { z } from 'zod';
import { buildDomainEvent, DomainEvent, eventEnvelopeSchema } from './base-event';

const workspacePayload = z.object({
  workspaceId: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const workspaceCreatedEventV1Schema = eventEnvelopeSchema.extend({
  name: z.literal('workspace.created'),
  version: z.literal(1),
  payload: workspacePayload,
});

export type WorkspaceCreatedEventV1 = DomainEvent<z.infer<typeof workspacePayload>>;

export function createWorkspaceCreatedEvent(
  payload: z.infer<typeof workspaceCreatedEventV1Schema.shape.payload>,
): WorkspaceCreatedEventV1 {
  return buildDomainEvent({ name: 'workspace.created', version: 1, payload });
}
