import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { IMessageRepository, CreateMessageData } from '../../domain/interfaces/message-repository.interface';
import { Message } from '../../domain/entities/message.entity';

@Injectable()
export class PrismaMessageRepository implements IMessageRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateMessageData): Promise<Message> {
        const expireHours = Number(process.env.BOT_SESSION_EXPIRE_HOURS ?? 48);
        const expiresAt   = new Date(Date.now() + expireHours * 60 * 60 * 1000);
        const row = await this.prisma.waMessage.create({
            data: {
                customer_id:      data.customer_id,
                order_session_id: data.order_session_id,
                wa_message_id:    data.wa_message_id,
                direction:        data.direction,
                msg_type:         data.msg_type,
                content:          data.content,
                template_id:      data.template_id,
                sent_by:          data.sent_by,
                expires_at:       expiresAt,
                media_url:        data.media_url,
                media_type:       data.media_type,
            },
        });
        return this.toEntity(row);
    }

    async findByOrderSession(orderSessionId: number): Promise<Message[]> {
        const rows = await this.prisma.waMessage.findMany({
            where:   { order_session_id: orderSessionId },
            orderBy: { created_at: 'asc' },
        });
        return rows.map(this.toEntity);
    }

    async findExpiredWithMedia(): Promise<{ media_url: string | null }[]> {
        return this.prisma.waMessage.findMany({
            where:  { 
                expires_at: { lte: new Date() },
                media_url:  { not: null },
            },
            select: { media_url: true },
        });
    }

    async deleteExpired(): Promise<number> {
        const result = await this.prisma.waMessage.deleteMany({
            where: { expires_at: { lte: new Date() } },
        });
        return result.count;
    }

  private toEntity(row: {
    id: number; customer_id: number; direction: string;
    msg_type: string; content: string; status: string;
    expires_at: Date; created_at: Date;
}): Message {
    return new Message(
        row.id,
        row.customer_id,
        row.direction as Message['direction'],
        row.msg_type  as Message['msg_type'],
        row.content,
        row.status    as Message['status'],
        row.expires_at,
        row.created_at,
    );
}
}