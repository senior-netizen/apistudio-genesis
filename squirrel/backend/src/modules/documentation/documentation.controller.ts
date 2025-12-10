import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentationService } from './documentation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('documentation')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class DocumentationController {
    constructor(private readonly documentation: DocumentationService) { }

    @Post('collections/:id/documentation/generate')
    async generateDocumentation(
        @Param('id') collectionId: string,
        @CurrentUser() user: { id: string },
        @Body() config?: { title?: string; description?: string; version?: string },
    ) {
        return this.documentation.generateOpenApiSpec(collectionId, user.id, config);
    }

    @Get('collections/:id/documentation/preview')
    async previewDocumentation(
        @Param('id') collectionId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.documentation.getDocumentationConfig(collectionId, user.id);
    }

    @Post('collections/:id/documentation/publish')
    async publishDocumentation(
        @Param('id') collectionId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.documentation.publishDocumentation(collectionId, user.id);
    }

    @Get('collections/:id/documentation/export')
    async exportDocumentation(
        @Param('id') collectionId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.documentation.exportDocumentation(collectionId, user.id);
    }
}
