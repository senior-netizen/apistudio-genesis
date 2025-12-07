import { describe, expect, it } from 'vitest';
import { Regions, getDefaultRegion, getRegion, isRegionEnabled } from '../src/registry.js';

describe('Regions registry', () => {
  it('returns a configured region', () => {
    const region = getRegion('eu-central');
    expect(region.code).toBe('eu-central');
    expect(region.displayName).toContain('Europe');
  });

  it('throws on unknown region', () => {
    expect(() => getRegion('unknown' as any)).toThrowError('Unknown region code');
  });

  it('returns the default region when marked', () => {
    const defaultRegion = getDefaultRegion();
    expect(defaultRegion.isDefault).toBe(true);
    expect(Regions).toContain(defaultRegion);
  });

  it('checks if a region is enabled', () => {
    expect(isRegionEnabled('us-east')).toBe(true);
    expect(isRegionEnabled('eu-central')).toBe(true);
    expect(isRegionEnabled('af-south')).toBe(true);
    expect(isRegionEnabled('ap-southeast')).toBe(true);
    expect(isRegionEnabled('unknown' as any)).toBe(false);
  });
});
