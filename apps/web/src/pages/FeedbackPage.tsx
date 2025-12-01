import { Card } from '@sdl/ui';
import BetaFeedbackBoard from '../modules/beta/BetaFeedbackBoard';
import BetaAnalytics from '../modules/beta/BetaAnalytics';

export default function FeedbackPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Community</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Feedback & Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Track tester feedback, trending requests, and adoption metrics in a single dashboard. Invite flows redirect
          here after redemption to keep the conversation active.
        </p>
      </header>
      <Card className="border border-border/60 bg-background/80 p-5">
        <BetaFeedbackBoard />
      </Card>
      <Card className="border border-border/60 bg-background/80 p-5">
        <BetaAnalytics />
      </Card>
    </section>
  );
}
