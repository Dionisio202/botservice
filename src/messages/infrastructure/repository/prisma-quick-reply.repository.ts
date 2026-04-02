import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { IQuickReplyRepository, CreateQuickReplyData } from '../../domain/interfaces/quick-reply-repository.interface';
import { QuickReply } from '../../domain/entities/quick-reply.entity';

@Injectable()
export class PrismaQuickReplyRepository implements IQuickReplyRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<QuickReply[]> {
        const rows = await this.prisma.waQuickReply.findMany({ orderBy: { created_at: 'desc' } });
        return rows.map(this.toEntity);
    }

    async findActive(): Promise<QuickReply[]> {
        const rows = await this.prisma.waQuickReply.findMany({ where: { is_active: true } });
        return rows.map(this.toEntity);
    }

    async create(data: CreateQuickReplyData): Promise<QuickReply> {
        const row = await this.prisma.waQuickReply.create({
            data: {
                title:      data.title,
                content:    data.content,
                category:   data.category,
                created_by: data.created_by,
            },
        });
        return this.toEntity(row);
    }

    async update(id: number, data: Partial<CreateQuickReplyData>): Promise<QuickReply> {
        const row = await this.prisma.waQuickReply.update({
            where: { id },
            data,
        });
        return this.toEntity(row);
    }

    async delete(id: number): Promise<void> {
        await this.prisma.waQuickReply.delete({ where: { id } });
    }

    private toEntity(row: {
        id: number; title: string; content: string;
        category: string | null; is_active: boolean;
    }): QuickReply {
        return new QuickReply(row.id, row.title, row.content, row.category, row.is_active);
    }
}