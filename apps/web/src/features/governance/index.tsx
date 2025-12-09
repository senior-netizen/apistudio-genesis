import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DataGovernanceLayout } from './components/DataGovernanceLayout';
import { RetentionPolicyPanel } from './retention';
import { BackupList } from './backups';
import { RestoreWizard } from './restore';
import { LegalHoldPanel } from './legalHold';
import { RegionOverviewPanel } from './region';
import { GovernanceAuditViewer } from './audit';
import { useI18n } from '../../lib/i18n';

const tabs = [
  { id: 'retention', label: 'governance.retention.tab' },
  { id: 'backups', label: 'governance.backups.tab' },
  { id: 'restore', label: 'governance.restore.tab' },
  { id: 'legal', label: 'governance.legalHold.tab' },
  { id: 'region', label: 'governance.region.tab' },
  { id: 'audit', label: 'governance.audit.tab' },
];

export function GovernancePage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const candidate = searchParams.get('tab') ?? '';
    return tabs.some((tab) => tab.id === candidate) ? candidate : 'retention';
  })();
  const [active, setActive] = useState<string>(initialTab);
  const orgId = workspaceId; // Fallback until org context is available

  useEffect(() => {
    const candidate = searchParams.get('tab') ?? '';
    if (candidate && candidate !== active && tabs.some((tab) => tab.id === candidate)) {
      setActive(candidate);
    }
  }, [active, searchParams]);

  const setTab = useCallback(
    (tabId: string) => {
      setActive(tabId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      });
    },
    [setSearchParams],
  );

  const sidebarTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: t(tab.label),
        active: tab.id === active,
        onSelect: () => setTab(tab.id),
      })),
    [active, setTab, t],
  );

  return (
    <DataGovernanceLayout
      title={t('governance.title')}
      description={t('governance.description')}
      sidebarTabs={sidebarTabs}
    >
      {active === 'retention' ? <RetentionPolicyPanel workspaceId={workspaceId} orgId={orgId} /> : null}
      {active === 'backups' ? <BackupList workspaceId={workspaceId} /> : null}
      {active === 'restore' ? <RestoreWizard workspaceId={workspaceId} /> : null}
      {active === 'legal' ? <LegalHoldPanel workspaceId={workspaceId} orgId={orgId} /> : null}
      {active === 'region' ? <RegionOverviewPanel workspaceId={workspaceId} orgId={orgId} /> : null}
      {active === 'audit' ? <GovernanceAuditViewer workspaceId={workspaceId} /> : null}
    </DataGovernanceLayout>
  );
}

export default GovernancePage;
