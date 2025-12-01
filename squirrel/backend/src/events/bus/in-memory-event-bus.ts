// In-memory EventBus used for local development, tests, and as a safe default during migration.
import { EventEmitter } from 'node:events';
import { DomainEvent } from '../contracts';
import { EventBus, EventHandler, EventSubscription } from './event-bus.interface';

export class InMemoryEventBus implements EventBus {
  private readonly emitter = new EventEmitter();

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    this.emitter.emit(event.name, event);
  }

  async subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): Promise<EventSubscription> {
    const wrappedHandler = (event: DomainEvent<TPayload>) => handler(event);
    this.emitter.on(eventName, wrappedHandler);
    return {
      unsubscribe: async () => {
        this.emitter.off(eventName, wrappedHandler);
      },
    };
  }
}
