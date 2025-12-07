import { describe, expect, it } from 'vitest';
import { encryptForTenant, decryptForTenant } from '../src/encryption.js';
import { getDefaultRegion } from '../src/registry.js';
import { resolveTenantRegion, type Organization, type Workspace } from '../src/router.js';

describe('org and workspace residency defaults', () => {
  it('uses org region for new workspaces by default', () => {
    const organization: Organization = { id: 'org-123', regionCode: 'af-south' };
    const workspace: Workspace = { id: 'ws-123', organizationId: organization.id };
    const region = resolveTenantRegion(organization, workspace);
    expect(region).toBe('af-south');
  });

  it('falls back to default region for legacy tenants', () => {
    const organization: Organization = { id: 'legacy-org' };
    const workspace: Workspace = { id: 'legacy-ws', organizationId: organization.id };
    expect(resolveTenantRegion(organization, workspace)).toBe(getDefaultRegion().code);
  });
});

describe('region-scoped encryption helpers', () => {
  it('includes kms alias and region in encrypted payloads', () => {
    const payload = encryptForTenant('tenant-1', 'eu-central', 'secret');
    expect(payload.regionCode).toBe('eu-central');
    expect(payload.keyAlias).toContain('eu-central');
    const plaintext = decryptForTenant('tenant-1', 'eu-central', payload).toString('utf8');
    expect(plaintext).toBe('secret');
  });

  it('rejects mismatched region during decrypt', () => {
    const payload = encryptForTenant('tenant-1', 'us-east', 'data');
    expect(() => decryptForTenant('tenant-1', 'eu-central', payload)).toThrow();
  });
});
