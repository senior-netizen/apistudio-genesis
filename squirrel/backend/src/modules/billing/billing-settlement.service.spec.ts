import { BillingSettlementService } from './billing-settlement.service';

describe('BillingSettlementService', () => {
  const buildService = () => {
    const prisma = {
      creditsTransaction: {
        findMany: jest.fn(),
      },
    };
    const paynow = {
      pollTransaction: jest.fn(),
    };
    const alerts = {
      sendLedgerMismatchAlert: jest.fn(),
    };
    const config = {
      billing: {
        settlementEnabled: true,
        settlementLookbackHours: 24,
        settlementMismatchThreshold: 0.01,
        settlementMaxTransactions: 250,
        settlementAlertWebhookUrl: undefined,
        ledgerCurrency: 'usd',
      },
    };

    const service = new BillingSettlementService(prisma as any, paynow as any, alerts as any, config as any);
    return { service, prisma, paynow, alerts, config };
  };

  it('sends mismatch alert when unsettled ratio exceeds threshold', async () => {
    const { service, prisma, paynow, alerts } = buildService();
    prisma.creditsTransaction.findMany.mockResolvedValue([
      { id: 't1', amount: 100, currency: 'usd', metadata: { paynowPollUrl: 'https://poll/1' } },
      { id: 't2', amount: 100, currency: 'usd', metadata: { paynowPollUrl: 'https://poll/2' } },
    ]);

    paynow.pollTransaction.mockResolvedValueOnce({ success: true });
    paynow.pollTransaction.mockResolvedValueOnce({ success: false });

    await service.runSettlementCheck();

    expect(alerts.sendLedgerMismatchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        mismatchRatio: 0.5,
        mismatchAmount: 100,
        settledAmount: 100,
        evaluatedTransactions: 2,
      }),
    );
  });

  it('does not send mismatch alert when mismatch ratio is under threshold', async () => {
    const { service, prisma, paynow, alerts } = buildService();
    prisma.creditsTransaction.findMany.mockResolvedValue([
      { id: 't1', amount: 100, currency: 'usd', metadata: { paynowPollUrl: 'https://poll/1' } },
      { id: 't2', amount: 100, currency: 'usd', metadata: { paynowPollUrl: 'https://poll/2' } },
    ]);

    paynow.pollTransaction.mockResolvedValue({ success: true });

    await service.runSettlementCheck();

    expect(alerts.sendLedgerMismatchAlert).not.toHaveBeenCalled();
  });

  it('skips reconciliation when no paynow-linked metadata exists', async () => {
    const { service, prisma, paynow, alerts } = buildService();
    prisma.creditsTransaction.findMany.mockResolvedValue([
      { id: 't1', amount: 100, currency: 'usd', metadata: { note: 'no-paynow' } },
    ]);

    await service.runSettlementCheck();

    expect(paynow.pollTransaction).not.toHaveBeenCalled();
    expect(alerts.sendLedgerMismatchAlert).not.toHaveBeenCalled();
  });
});
