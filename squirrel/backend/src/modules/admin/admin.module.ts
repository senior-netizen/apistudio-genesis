import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AccountRoleGuard } from '../../common/guards/account-role.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';

@Module({
  imports: [RealtimeModule],
  controllers: [AdminController],
  providers: [AdminService, AccountRoleGuard, OwnerGuard],
})
export class AdminModule {}
