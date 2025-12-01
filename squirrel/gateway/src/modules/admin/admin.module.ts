import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin.audit.service';

@Module({
  imports: [ConfigModule, HttpModule.register({ timeout: 8000 })],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService],
})
export class AdminModule {}
