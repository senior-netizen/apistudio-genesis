import { Module } from '@nestjs/common';
import { ScriptExecutorService } from './script-executor.service';
import { ScriptContextBuilder } from './script-context.builder';
import { InfraModule } from '../../infra/infra.module';

@Module({
    imports: [InfraModule],
    providers: [ScriptExecutorService, ScriptContextBuilder],
    exports: [ScriptExecutorService],
})
export class ScriptsModule { }
