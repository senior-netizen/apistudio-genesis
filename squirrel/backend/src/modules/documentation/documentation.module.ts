import { Module } from '@nestjs/common';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import { OpenApiGenerator } from './generators/openapi.generator';
import { InfraModule } from '../../infra/infra.module';

@Module({
    imports: [InfraModule],
    controllers: [DocumentationController],
    providers: [DocumentationService, OpenApiGenerator],
    exports: [DocumentationService],
})
export class DocumentationModule { }
