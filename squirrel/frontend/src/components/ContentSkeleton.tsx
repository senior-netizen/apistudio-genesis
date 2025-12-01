export default function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-foreground/10" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-36 rounded-lg border border-border/50 bg-foreground/5" />
        <div className="h-36 rounded-lg border border-border/50 bg-foreground/5" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 rounded-lg border border-border/50 bg-foreground/5" />
        <div className="h-24 rounded-lg border border-border/50 bg-foreground/5" />
        <div className="h-24 rounded-lg border border-border/50 bg-foreground/5" />
      </div>
      <div className="h-64 rounded-lg border border-border/50 bg-foreground/5" />
    </div>
  );
}

