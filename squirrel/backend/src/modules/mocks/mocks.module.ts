import { Module } from '@nestjs/common';
import { MocksController } from './mocks.controller';
import { MocksService } from './mocks.service';
import { MockRuntimeService } from './mock-runtime.service';
import { MockProxyController } from './mock-proxy.controller';
import { InfraModule } from '../../infra/infra.module';

@Module({
    imports: [InfraModule],
    controllers: [MocksController, MockProxyController],
    providers: [MocksService, MockRuntimeService],
    exports: [MocksService],
})
export class MocksModule { }
