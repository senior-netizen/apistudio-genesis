import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

function resolveConnectionOptions(configService: ConfigService) {
  const url = configService.get<string>('POSTGRES_URL') ?? configService.get<string>('DATABASE_URL');
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        type: 'postgres' as const,
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 5432,
        username: decodeURIComponent(parsed.username || 'postgres'),
        password: decodeURIComponent(parsed.password || 'postgres'),
        database: parsed.pathname?.replace(/^\//, '') || 'postgres',
      };
    } catch (error) {
      // Fall through to individual env vars if parsing fails.
      // eslint-disable-next-line no-console
      console.warn('Invalid POSTGRES_URL provided:', error);
    }
  }

  return {
    type: 'postgres' as const,
    host: configService.get<string>('BILLING_DB_HOST', 'postgres'),
    port: parseInt(configService.get<string>('BILLING_DB_PORT', '5432'), 10),
    username: configService.get<string>('BILLING_DB_USER', 'squirrel'),
    password: configService.get<string>('BILLING_DB_PASSWORD', 'squirrel'),
    database: configService.get<string>('BILLING_DB_NAME', 'squirrel'),
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const options = resolveConnectionOptions(configService);
        return {
          ...options,
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: configService.get<string>('BILLING_DB_LOGGING', 'false') === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
