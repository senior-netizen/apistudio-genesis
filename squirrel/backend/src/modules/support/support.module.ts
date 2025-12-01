import { Module } from '@nestjs/common';
import { CollabModule } from '../collab/collab.module';
import { TakeoverGateway } from './takeover.gateway';
import { TakeoverService } from './takeover.service';

@Module({
  imports: [CollabModule],
  providers: [TakeoverGateway, TakeoverService],
})
export class SupportModule {}
