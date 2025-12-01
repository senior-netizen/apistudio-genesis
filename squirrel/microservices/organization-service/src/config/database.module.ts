import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity } from '../shared/entities/organization.entity';
import { TeamEntity } from '../shared/entities/team.entity';
import { OrganizationMemberEntity } from '../shared/entities/organization-member.entity';
import { TeamMemberEntity } from '../shared/entities/team-member.entity';
import { OrganizationInviteEntity } from '../shared/entities/organization-invite.entity';
import { SharedWorkspaceEntity } from '../shared/entities/shared-workspace.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('ORGANIZATION_DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('ORGANIZATION_DB_PORT', '5432'), 10),
        username: configService.get<string>('ORGANIZATION_DB_USER', 'postgres'),
        password: configService.get<string>('ORGANIZATION_DB_PASSWORD', 'postgres'),
        database: configService.get<string>('ORGANIZATION_DB_NAME', 'squirrel_organization'),
        entities: [
          OrganizationEntity,
          TeamEntity,
          OrganizationMemberEntity,
          TeamMemberEntity,
          OrganizationInviteEntity,
          SharedWorkspaceEntity,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('ORGANIZATION_DB_LOGGING', 'false') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
