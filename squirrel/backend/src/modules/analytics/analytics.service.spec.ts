import { AnalyticsService } from './analytics.service';

describe('AnalyticsService pipeline report', () => {
  const buildService = () => {
    const prisma = {
      analyticsEvent: {
        count: jest.fn(),
        findFirst: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const queues = {
      getQueue: jest.fn(() => ({ add: jest.fn() })),
    };

    const service = new AnalyticsService(prisma as any, queues as any);
    return { service, prisma };
  };

  it('returns quality/retention/failure report for a workspace', async () => {
    const { service, prisma } = buildService();
    (prisma.analyticsEvent.count as jest.Mock)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(4);
    (prisma.analyticsEvent.findFirst as jest.Mock)
      .mockResolvedValueOnce({ createdAt: new Date('2026-02-01T00:00:00.000Z') })
      .mockResolvedValueOnce({ createdAt: new Date('2026-02-15T00:00:00.000Z') });
    (prisma.analyticsEvent.groupBy as jest.Mock).mockResolvedValue([
      { type: 'request.error.500', _count: { type: 3 } },
    ]);

    const report = await service.pipelineReport('ws_1', 60);

    expect(report.quality.eventsInWindow).toBe(20);
    expect(report.quality.missingDurationCount).toBe(4);
    expect(report.quality.nullDurationRate).toBe(0.2);
    expect(report.retention.oldestEventAt).toBe('2026-02-01T00:00:00.000Z');
    expect(report.failures[0]).toEqual({ type: 'request.error.500', count: 3 });
  });
});
