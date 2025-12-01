import { useState } from 'react';
import { Button, Card } from '@sdl/ui';
import { CreditCard, X } from 'lucide-react';

interface BuyCreditsModalProps {
  onPurchase?: (amount: number) => void;
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function BuyCreditsModal({ onPurchase, triggerLabel = 'Buy Credits', triggerClassName }: BuyCreditsModalProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(500);

  const handlePurchase = () => {
    onPurchase?.(amount);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="primary"
        className={`h-12 gap-2 rounded-[12px] px-6 text-sm font-semibold shadow-soft transition duration-200 ease-out ${triggerClassName ?? ''}`}
        onClick={() => setOpen(true)}
      >
        <CreditCard className="h-4 w-4" aria-hidden />
        {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setOpen(false)} aria-hidden />
          <Card
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-[14px] border border-border/60 bg-background/95 p-6 shadow-soft"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Top up credits</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Purchase credits</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-[10px] p-0 text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="flex flex-col gap-2 text-sm text-foreground">
                Amount
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="h-12 rounded-[12px] border border-border/60 bg-background/90 px-4 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted">Enter credits in multiples of 100.</span>
              </label>

              <div className="rounded-[12px] border border-border/60 bg-background/80 px-4 py-3 text-xs text-muted">
                Credits are billed instantly and available across the studio and collaboration features. Transactions process via Paynow.
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-[12px] px-5 text-sm"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handlePurchase}
                className="h-11 gap-2 rounded-[12px] px-5 text-sm font-semibold shadow-soft"
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                Checkout via Paynow
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
