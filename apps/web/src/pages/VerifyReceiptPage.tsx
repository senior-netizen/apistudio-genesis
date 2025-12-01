import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Spinner } from '@sdl/ui';
import { apiFetch } from '../lib/api/client';

type VerificationState = 'pending' | 'verified' | 'invalid' | 'error';

type VerificationResponse = {
  valid: boolean;
  paymentId?: string;
  reference?: string;
};

export default function VerifyReceiptPage() {
  const { hash } = useParams<{ hash: string }>();
  const [state, setState] = useState<VerificationState>('pending');
  const [details, setDetails] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    if (!hash) {
      setState('invalid');
      return;
    }
    let canceled = false;
    void apiFetch(`/v1/payments/verify-hash/${hash}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Verification failed');
        }
        const payload = (await response.json()) as VerificationResponse;
        if (canceled) return;
        setDetails(payload);
        setState(payload.valid ? 'verified' : 'invalid');
      })
      .catch(() => {
        if (!canceled) {
          setState('error');
        }
      });
    return () => {
      canceled = true;
    };
  }, [hash]);

  return (
    <div className="mx-auto mt-16 max-w-2xl space-y-6">
      <Card className="glass-panel border border-border/40 bg-background/80 p-8">
        <h1 className="text-2xl font-semibold text-foreground">Receipt verification</h1>
        <p className="mt-2 text-sm text-muted">Confirm the authenticity of your payment receipt.</p>
        <div className="mt-6">
          {state === 'pending' && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <Spinner size="sm" />
              <span>Verifying receipt hash...</span>
            </div>
          )}
          {state === 'verified' && details?.valid && (
            <div className="space-y-2 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-200">
              <p className="font-medium text-green-100">Payment verified</p>
              <p>Reference: {details.reference}</p>
              <p>Payment ID: {details.paymentId}</p>
            </div>
          )}
          {state === 'invalid' && (
            <div className="space-y-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <p className="font-medium text-yellow-100">Receipt could not be verified</p>
              <p className="text-yellow-100/80">Please contact support with your payment reference.</p>
            </div>
          )}
          {state === 'error' && (
            <div className="space-y-2 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="font-medium text-red-100">Verification service unavailable</p>
              <p>Try again later or reach out to our billing team.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
