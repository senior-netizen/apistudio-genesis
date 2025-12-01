import { Global, Module } from '@nestjs/common';
import { KafkaProvider } from './kafka.provider';

@Global()
@Module({
  providers: [KafkaProvider],
  exports: [KafkaProvider],
})
export class KafkaModule {}
