// Nest module exposing the AuthDomainService without altering existing controllers.
import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { UsersModule } from '../../modules/users/users.module';
import { EventsModule } from '../../events/events.module';
import { AuthDomainService } from './auth.domain.service';

@Module({
  imports: [AuthModule, UsersModule, EventsModule],
  providers: [AuthDomainService],
  exports: [AuthDomainService],
})
export class AuthDomainModule {}
