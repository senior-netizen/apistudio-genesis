import { Card, cn, ScrollArea } from '@sdl/ui';
import { ReactNode } from 'react';

interface TabItem {
  id: string;
  label: string;
  onSelect: () => void;
  active: boolean;
}

interface DataGovernanceLayoutProps {
  title: string;
  description: string;
  sidebarTabs: TabItem[];
  children: ReactNode;
}

export function DataGovernanceLayout({ title, description, sidebarTabs, children }: DataGovernanceLayoutProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-3">
        <Card className="border border-border/70 bg-background/70 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <nav className="mt-4 space-y-1">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onSelect}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  tab.active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground',
                )}
                aria-current={tab.active ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>
      </aside>
      <section className="col-span-9">
        <ScrollArea className="h-full max-h-[85vh] rounded-lg border border-border/60 bg-background/80 p-4">
          {children}
        </ScrollArea>
      </section>
    </div>
  );
}
