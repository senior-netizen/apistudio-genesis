// NATS-backed EventBus implementation used for cross-service messaging.
// This adapter prioritizes resilience: if NATS connectivity fails the factory will fall back elsewhere.
import { Logger } from '@nestjs/common';
import { DomainEvent } from '../contracts';
import { EventBus, EventHandler, EventSubscription } from './event-bus.interface';

type NatsSubscription = AsyncIterable<{ data: Uint8Array; unsubscribe(): void }> & { unsubscribe(): void };

type NatsConnection = {
  publish: (subject: string, data: Uint8Array) => void;
  subscribe: (subject: string) => NatsSubscription;
  flush(): Promise<void>;
};

export interface NatsEventBusOptions {
  url: string;
  logger?: Logger;
}

export class NatsEventBus implements EventBus {
  private connection?: NatsConnection;
  private readonly logger: Logger;
  private readonly codec = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor(private readonly options: NatsEventBusOptions) {
    this.logger = options.logger ?? new Logger(NatsEventBus.name);
  }

  private async getConnection(): Promise<NatsConnection> {
    if (this.connection) {
      return this.connection;
    }

    const nats = (await import('nats')) as unknown as { connect: (opts: { servers: string }) => Promise<NatsConnection> };
    this.connection = await nats.connect({ servers: this.options.url });
    this.logger.log(`Connected to NATS at ${this.options.url}`);
    return this.connection;
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const connection = await this.getConnection();
    const payload = this.codec.encode(JSON.stringify(event));
    connection.publish(event.name, payload);
  }

  async subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): Promise<EventSubscription> {
    const connection = await this.getConnection();
    const subscription = connection.subscribe(eventName);
    (async () => {
      for await (const message of subscription) {
        try {
          const decoded = JSON.parse(this.decoder.decode(message.data)) as DomainEvent<TPayload>;
          await handler(decoded);
        } catch (error) {
          this.logger.error(`Failed to process NATS event ${eventName}`, error as Error);
        }
      }
    })();

    return {
      unsubscribe: async () => {
        subscription.unsubscribe();
        await connection.flush();
      },
    };
  }
}
