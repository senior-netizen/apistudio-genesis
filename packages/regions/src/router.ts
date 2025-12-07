import { getDefaultRegion, type RegionCode } from './registry.js';

export interface Organization {
  id: string;
  regionCode?: RegionCode | null;
}

export interface Workspace {
  id: string;
  organizationId?: string;
  regionCode?: RegionCode | null;
}

export interface TenantContext {
  organizationId: string;
  workspaceId?: string;
  regionCode: RegionCode;
}

export interface DbClient {
  regionCode: RegionCode;
}

export interface EventBusClient {
  regionCode: RegionCode;
}

export interface SearchClient {
  regionCode: RegionCode;
}

const dbClients = new Map<RegionCode, DbClient>();
const eventBusClients = new Map<RegionCode, EventBusClient>();
const searchClients = new Map<RegionCode, SearchClient>();

export function resolveTenantRegion(org: Organization, workspace?: Workspace): RegionCode {
  if (workspace?.regionCode) {
    return workspace.regionCode;
  }
  if (org.regionCode) {
    return org.regionCode;
  }
  return getDefaultRegion().code;
}

function getOrCreateClient<T extends { regionCode: RegionCode }>(
  map: Map<RegionCode, T>,
  regionCode: RegionCode,
  factory: () => T,
): T {
  const cached = map.get(regionCode);
  if (cached) return cached;
  const created = factory();
  map.set(regionCode, created);
  return created;
}

export function getDbClientForRegion(regionCode: RegionCode): DbClient {
  return getOrCreateClient(dbClients, regionCode, () => ({ regionCode }));
}

export function getEventBusClientForRegion(regionCode: RegionCode): EventBusClient {
  return getOrCreateClient(eventBusClients, regionCode, () => ({ regionCode }));
}

export function getSearchClientForRegion(regionCode: RegionCode): SearchClient {
  return getOrCreateClient(searchClients, regionCode, () => ({ regionCode }));
}
