import { Module } from '@nestjs/common';
import { RedisModule } from '../../config/redis.module';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [RedisModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
