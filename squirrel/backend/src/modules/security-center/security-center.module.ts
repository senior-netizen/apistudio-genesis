import { Module } from '@nestjs/common';
import { SecurityCenterController } from './security-center.controller';
import { SecurityCenterService } from './security-center.service';
import { InfraModule } from '../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [SecurityCenterController],
  providers: [SecurityCenterService],
})
export class SecurityCenterModule {}
