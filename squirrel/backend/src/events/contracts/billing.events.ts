// Billing domain contracts for usage tracking and invoicing events.
import { z } from 'zod';
import { buildDomainEvent, DomainEvent, eventEnvelopeSchema } from './base-event';

const billingUsagePayload = z.object({
  workspaceId: z.string().uuid(),
  usageType: z.string(),
  units: z.number().int().nonnegative(),
  recordedBy: z.string().uuid().optional(),
});

export const billingUsageRecordedEventV1Schema = eventEnvelopeSchema.extend({
  name: z.literal('billing.usage.recorded'),
  version: z.literal(1),
  payload: billingUsagePayload,
});

export type BillingUsageRecordedEventV1 = DomainEvent<z.infer<typeof billingUsagePayload>>;

export function createBillingUsageRecordedEvent(
  payload: z.infer<typeof billingUsageRecordedEventV1Schema.shape.payload>,
): BillingUsageRecordedEventV1 {
  return buildDomainEvent({ name: 'billing.usage.recorded', version: 1, payload });
}
