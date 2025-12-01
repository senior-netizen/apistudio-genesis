import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProvider.name);
  private producer: Producer | null = null;

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'collaboration-service';
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();

    try {
      await this.producer.connect();
      this.logger.log(`Connected to Kafka brokers: ${brokers.join(',')}`);
    } catch (error) {
      this.logger.warn(
        `Kafka connection failed (clientId=${clientId}). Continuing without event publishing. Error: ${
          (error as Error).message
        }`,
      );
      this.producer = null;
    }
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect().catch(() => undefined);
    }
  }

  async emit(topic: string, payload: unknown) {
    if (!this.producer) {
      this.logger.debug(`Skipping Kafka publish for topic ${topic}; producer not connected.`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(payload) }],
      });
    } catch (error) {
      this.logger.warn(`Failed to publish Kafka message on topic ${topic}: ${(error as Error).message}`);
    }
  }
}
