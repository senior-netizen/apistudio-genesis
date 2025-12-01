# Paynow Monetization Stack

The billing experience now runs entirely on Paynow Zimbabwe so that upgrades, API marketplace purchases, and credit packs are
processed via local Ecocash, ZIPIT, and card rails without any dependency on Stripe.

## Components

| Component | Location | Responsibility |
| --- | --- | --- |
| `BillingService` | `squirrel/backend/src/modules/billing/billing.service.ts` | Orchestrates upgrade sessions, marketplace purchases, and credit packs. Persists Paynow references on users/API keys. |
| `PaynowService` | `squirrel/backend/src/modules/billing/paynow.service.ts` | Thin client around the official Paynow SDK. Handles initialize + poll and surfaces helpful logging. |
| `BuyCreditsModal` | `apps/web/src/components/BuyCreditsModal.tsx` | Surfaces Paynow-only checkout with local currency messaging. |
| `PaymentMethodSelector` | `apps/web/src/components/billing/PaymentMethodSelector.tsx` | Highlights Paynow (ZW) as the sole gateway so users are never offered Stripe. |

## Checkout flow

1. The UI calls `POST /v1/billing/upgrade` (or `/marketplace/...`) which in turn invokes `BillingService.createUpgradeSession`.
2. The service determines the correct ZWL/USD Paynow amount (monthly vs yearly) and generates a unique Paynow reference.
3. `PaynowService.createPayment` initializes the transaction, returning redirect/poll URLs that are relayed to the client.
4. The user completes payment inside Paynow. The redirect returns to `BILLING_SUCCESS_URL`; operators can poll for status via the
   stored `pollUrl`.
5. Once Paynow confirms payment, the backend marks the subscription/API key as active and records the Paynow reference so ledger
   reconciliation can compare against internal `CreditsTransaction` totals.

## Compliance & reconciliation

- All upgrade paths now funnel through Paynow. If `PAYNOW_INTEGRATION_ID/KEY` are misconfigured the service will refuse to mark
  billing as enabled, preventing mixed Stripe/Paynow states.
- Credits and marketplace purchases persist the generated Paynow reference so nightly settlement jobs can compare the ledger to
  Paynow exports.
- `docs/gap-closure.md` tracks the remaining governance work (invoice exports, SOC2 logging, reconciliation alerts).

By focusing on a single Zimbabwean payment rail the studio now aligns with local billing expectations, simplifies compliance, and
eliminates the partially implemented Stripe flows that previously blocked enterprise readiness.
