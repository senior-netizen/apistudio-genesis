import { describe, expect, it } from 'vitest';
import { getDbClientForRegion, getEventBusClientForRegion, getSearchClientForRegion, resolveTenantRegion } from '../src/router.js';
import { getDefaultRegion } from '../src/registry.js';

describe('resolveTenantRegion', () => {
  const org = { id: 'org-1', regionCode: 'eu-central' as const };
  const workspace = { id: 'ws-1', organizationId: 'org-1', regionCode: 'us-east' as const };

  it('prefers workspace region when set', () => {
    expect(resolveTenantRegion(org, workspace)).toBe('us-east');
  });

  it('falls back to org region when workspace unset', () => {
    expect(resolveTenantRegion(org, { ...workspace, regionCode: undefined })).toBe('eu-central');
  });

  it('falls back to default when neither set', () => {
    expect(resolveTenantRegion({ ...org, regionCode: null }, undefined)).toBe(getDefaultRegion().code);
  });
});

describe('region specific clients', () => {
  it('memoizes db clients per region', () => {
    const first = getDbClientForRegion('eu-central');
    const second = getDbClientForRegion('eu-central');
    expect(first).toBe(second);
    expect(first.regionCode).toBe('eu-central');
  });

  it('provides event bus and search clients bound to region', () => {
    const eventClient = getEventBusClientForRegion('us-east');
    const searchClient = getSearchClientForRegion('af-south');
    expect(eventClient.regionCode).toBe('us-east');
    expect(searchClient.regionCode).toBe('af-south');
  });
});
