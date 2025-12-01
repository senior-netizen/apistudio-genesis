import { InMemoryEventBus } from './bus/in-memory-event-bus';
import { buildDomainEvent } from './contracts';
import { createEventBus } from './event-bus.factory';

describe('EventBus abstractions', () => {
  it('delivers events via in-memory implementation', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    await bus.subscribe('auth.user.created', async (event) => {
      received.push(event.payload as unknown as string);
    });

    await bus.publish(buildDomainEvent({ name: 'auth.user.created', version: 1, payload: 'payload' }));

    expect(received).toEqual(['payload']);
  });

  it('falls back to in-memory when no brokers are configured', async () => {
    const bus = createEventBus();
    const events: string[] = [];

    await bus.subscribe('billing.usage.recorded', (event) => {
      events.push(event.name);
    });

    await bus.publish(buildDomainEvent({ name: 'billing.usage.recorded', version: 1, payload: {} }));

    expect(events).toContain('billing.usage.recorded');
  });
});
