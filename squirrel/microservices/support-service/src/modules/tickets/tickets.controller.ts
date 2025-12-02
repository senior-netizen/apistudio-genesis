import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { TicketStatus } from './entities/ticket.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new support ticket' })
    create(@Req() req: any, @Body() dto: CreateTicketDto) {
        // Mock user ID for now if AuthGuard isn't fully active
        const userId = req.user?.id || 'mock-user-id';
        return this.ticketsService.create(userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List my tickets' })
    findAll(@Req() req: any) {
        const userId = req.user?.id || 'mock-user-id';
        return this.ticketsService.findAll(userId);
    }

    @Get('admin/all')
    @Roles('admin', 'founder')
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'List all tickets (Admin)' })
    findAllAdmin() {
        return this.ticketsService.findAllAdmin();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get ticket details' })
    findOne(@Param('id') id: string) {
        return this.ticketsService.findOne(id);
    }

    @Post(':id/comments')
    @ApiOperation({ summary: 'Add a comment to a ticket' })
    addComment(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: CreateCommentDto,
    ) {
        const userId = req.user?.id || 'mock-user-id';
        return this.ticketsService.addComment(id, userId, dto);
    }

    @Patch(':id/status')
    @Roles('admin', 'founder')
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Update ticket status (Admin)' })
    updateStatus(@Param('id') id: string, @Body('status') status: TicketStatus) {
        return this.ticketsService.updateStatus(id, status);
    }
}
