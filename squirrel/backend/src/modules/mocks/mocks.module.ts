import { Module } from '@nestjs/common';
import { MocksController } from './mocks.controller';
import { MocksService } from './mocks.service';
import { MockRuntimeService } from './mock-runtime.service';
import { MockProxyController } from './mock-proxy.controller';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { CacheModule } from '../../infra/cache/cache.module';

@Module({
    imports: [PrismaModule, CacheModule],
    controllers: [MocksController, MockProxyController],
    providers: [MocksService, MockRuntimeService],
    exports: [MocksService],
})
export class MocksModule { }
