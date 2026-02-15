import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { can, getEffectiveRole } from '@sdl/frontend/utils/roles';

type User = { role?: string | null; isFounder?: boolean | null };

function Dashboard({ user }: { user?: User | null }) {
  const effectiveRole = getEffectiveRole(user ?? null);
  return (
    <div>
      <div data-testid="effective-role">{effectiveRole}</div>
      {can(user ?? null, 'admin') && <div>Admin Panel</div>}
      {can(user ?? null, 'admin') && <div>Billing</div>}
      {can(user ?? null, 'admin') && <div>Workspace Configuration</div>}
      {can(user ?? null, 'admin') && <div>API Keys</div>}
      {can(user ?? null, 'maintainer') && <div>Team Management</div>}
      {can(user ?? null, 'viewer') && <div>Read Only</div>}
      {!can(user ?? null, 'viewer') && <div>No Access</div>}
    </div>
  );
}

describe('RBAC UI gating', () => {
  it('shows all admin panels for founder', () => {
    render(<Dashboard user={{ role: 'admin', isFounder: true }} />);
    expect(screen.getByTestId('effective-role').textContent).toBe('founder');
    expect(screen.getAllByText(/Admin Panel|Billing|Workspace Configuration|API Keys/)).toHaveLength(4);
  });

  it('limits admin from founder-only markers but shows admin controls', () => {
    render(<Dashboard user={{ role: 'admin' }} />);
    expect(screen.getByText('Admin Panel')).toBeTruthy();
    expect(screen.getByText('Billing')).toBeTruthy();
    expect(screen.queryByText('Founder Controls')).not.toBeTruthy();
  });

  it('restricts maintainer/editor/viewer appropriately', () => {
    render(<Dashboard user={{ role: 'maintainer' }} />);
    expect(screen.getByText('Team Management')).toBeTruthy();
    expect(screen.queryByText('Admin Panel')).not.toBeTruthy();
  });

  it('handles undefined user gracefully', () => {
    render(<Dashboard user={null} />);
    expect(screen.getByText('Read Only')).toBeTruthy();
    expect(screen.queryByText('Admin Panel')).not.toBeTruthy();
  });
});
