import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class TicketsService {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketsRepository: Repository<Ticket>,
        @InjectRepository(TicketComment)
        private readonly commentsRepository: Repository<TicketComment>,
    ) { }

    async create(userId: string, dto: CreateTicketDto): Promise<Ticket> {
        const ticket = this.ticketsRepository.create({
            ...dto,
            userId,
            status: TicketStatus.OPEN,
        });
        return this.ticketsRepository.save(ticket);
    }

    async findAll(userId: string): Promise<Ticket[]> {
        return this.ticketsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findAllAdmin(): Promise<Ticket[]> {
        return this.ticketsRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Ticket> {
        const ticket = await this.ticketsRepository.findOne({
            where: { id },
            relations: ['comments'],
        });
        if (!ticket) {
            throw new NotFoundException(`Ticket with ID ${id} not found`);
        }
        return ticket;
    }

    async addComment(
        ticketId: string,
        userId: string,
        dto: CreateCommentDto,
    ): Promise<TicketComment> {
        const ticket = await this.findOne(ticketId);
        const comment = this.commentsRepository.create({
            ...dto,
            ticketId: ticket.id,
            userId,
        });
        return this.commentsRepository.save(comment);
    }

    async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
        const ticket = await this.findOne(id);
        ticket.status = status;
        return this.ticketsRepository.save(ticket);
    }
}
