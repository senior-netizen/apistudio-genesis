import { Card } from '@sdl/ui';
import SecureVaultPage from './SecureVaultPage';
import TeamSettingsPage from './TeamSettingsPage';

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Configure secrets, rotation policies, and collaboration roles. Every update syncs in real-time across the studio.
        </p>
      </header>
      <Card className="border border-border/60 bg-background/80 p-5">
        <SecureVaultPage />
      </Card>
      <Card className="border border-border/60 bg-background/80 p-5">
        <TeamSettingsPage />
      </Card>
    </section>
  );
}
