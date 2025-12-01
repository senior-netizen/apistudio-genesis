export function SubscriptionSkeleton() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-zinc-950 via-slate-900 to-black p-12 text-white shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12)_0,_rgba(0,0,0,0)_60%)]" aria-hidden />
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/20" />
            <div className="h-10 w-72 animate-pulse rounded-full bg-white/20" />
            <div className="h-4 w-80 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="h-8 w-36 animate-pulse rounded-full bg-white/10" />
            <span className="h-8 w-44 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="h-11 w-40 animate-pulse rounded-full bg-white/20" />
            <span className="h-11 w-32 animate-pulse rounded-full bg-white/20" />
          </div>
        </div>
      </section>
      <div className="space-y-8">
        <div className="rounded-3xl border border-border/40 bg-background/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4">
            <div className="h-5 w-48 animate-pulse rounded-full bg-foreground/10" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-foreground/10" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
              <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
              <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-background/70 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4">
            <div className="h-5 w-40 animate-pulse rounded-full bg-foreground/10" />
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
              <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionSkeleton;
