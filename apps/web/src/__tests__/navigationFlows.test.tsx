import { describe, expect, it } from 'vitest';

import { appRoutes, getNavigationSummary } from '../routes/routeConfig';

describe('navigation flows metadata', () => {
  it('describes the journey from dashboard into request responses', () => {
    const dashboard = appRoutes.find((route) => route.id === 'dashboard');
    const requests = appRoutes.find((route) => route.id === 'requests');
    expect(dashboard).toBeDefined();
    expect(requests).toBeDefined();
    expect(requests?.buttons).toContain('View Response');
    const summary = getNavigationSummary().find((item) => item.path === '/requests');
    expect(summary?.buttons).toContain('View Response');
  });

  it('links the upgrade flow into billing routes', () => {
    const billing = appRoutes.find((route) => route.id === 'billing');
    const pricing = appRoutes.find((route) => route.id === 'pricing');
    expect(billing?.summary).toMatch(/upgrade flow/i);
    expect(billing?.buttons).toContain('Upgrade Plan');
    expect(pricing?.path).toBe('/billing/upgrade');
  });

  it('exposes invite redemption through feedback and team routes', () => {
    const feedback = appRoutes.find((route) => route.id === 'feedback');
    const teams = appRoutes.find((route) => route.id === 'teams');
    expect(feedback?.buttons).toContain('Redeem Invite');
    expect(teams?.buttons).toContain('Redeem Invite');
  });
});
