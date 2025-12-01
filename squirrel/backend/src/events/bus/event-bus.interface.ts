// Lightweight abstraction used by services to publish/subscribe to domain events.
import { DomainEvent } from '../contracts';

export type EventHandler<TPayload = unknown> = (event: DomainEvent<TPayload>) => Promise<void> | void;

export interface EventSubscription {
  unsubscribe(): Promise<void> | void;
}

export interface EventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): Promise<EventSubscription>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
