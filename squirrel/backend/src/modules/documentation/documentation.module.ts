import { Module } from '@nestjs/common';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import { OpenApiGenerator } from './generators/openapi.generator';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { CacheModule } from '../../infra/cache/cache.module';

@Module({
    imports: [PrismaModule, CacheModule],
    controllers: [DocumentationController],
    providers: [DocumentationService, OpenApiGenerator],
    exports: [DocumentationService],
})
export class DocumentationModule { }
