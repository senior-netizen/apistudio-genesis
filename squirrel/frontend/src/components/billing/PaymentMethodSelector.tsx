import { Button, Card } from '@sdl/ui';
import type { PaymentGateway } from '../../types/subscription';

const gateways: Array<{ id: PaymentGateway; label: string; description: string }> = [
  { id: 'paynow', label: 'Paynow (ZW)', description: 'Mobile money, ZIPIT, and local cards' },
];

interface PaymentMethodSelectorProps {
  value: PaymentGateway;
  onChange: (gateway: PaymentGateway) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {gateways.map((gateway) => {
        const isActive = gateway.id === value;
        return (
          <Card
            key={gateway.id}
            className={`space-y-2 border p-4 transition ${
              isActive ? 'border-foreground/60 bg-foreground/5' : 'border-border/40 hover:border-foreground/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-foreground">{gateway.label}</h4>
                <p className="text-xs text-muted">{gateway.description}</p>
              </div>
              <Button size="sm" variant={isActive ? 'primary' : 'outline'} onClick={() => onChange(gateway.id)}>
                {isActive ? 'Selected' : 'Use'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default PaymentMethodSelector;
