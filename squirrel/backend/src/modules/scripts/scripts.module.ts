import { Module } from '@nestjs/common';
import { ScriptExecutorService } from './script-executor.service';
import { ScriptContextBuilder } from './script-context.builder';
import { CacheModule } from '../../infra/cache/cache.module';

@Module({
    imports: [CacheModule],
    providers: [ScriptExecutorService, ScriptContextBuilder],
    exports: [ScriptExecutorService],
})
export class ScriptsModule { }
