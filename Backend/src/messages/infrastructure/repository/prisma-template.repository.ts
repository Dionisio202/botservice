import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { ITemplateRepository, CreateTemplateData } from '../../domain/interfaces/template-repository.interface';
import { Template } from '../../domain/entities/template.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaTemplateRepository implements ITemplateRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<Template[]> {
        const rows = await this.prisma.waTemplate.findMany({ orderBy: { created_at: 'desc' } });
        return rows.map(this.toEntity);
    }

    async findActive(): Promise<Template[]> {
        const rows = await this.prisma.waTemplate.findMany({ where: { is_active: true } });
        return rows.map(this.toEntity);
    }

    async findById(id: number): Promise<Template | null> {
        const row = await this.prisma.waTemplate.findUnique({ where: { id } });
        if (!row) return null;
        return this.toEntity(row);
    }

    async create(data: CreateTemplateData): Promise<Template> {
        const row = await this.prisma.waTemplate.create({
            data: {
                name:             data.name,
                wa_template_name: data.wa_template_name,
                category:         data.category as any,
                language:         data.language,
                body:             data.body,
                variables:        data.variables as Prisma.InputJsonValue,
                created_by:       data.created_by,
            },
        });
        return this.toEntity(row);
    }

    async update(id: number, data: Partial<CreateTemplateData>): Promise<Template> {
        const row = await this.prisma.waTemplate.update({
            where: { id },
            data:  {
                ...data,
                category:  data.category  as any,
                variables: data.variables as Prisma.InputJsonValue,
            },
        });
        return this.toEntity(row);
    }

    async delete(id: number): Promise<void> {
        await this.prisma.waTemplate.delete({ where: { id } });
    }

    private toEntity(row: {
        id: number; name: string; wa_template_name: string;
        category: string; language: string; body: string; is_active: boolean;
    }): Template {
        return new Template(
            row.id, row.name, row.wa_template_name,
            row.category as Template['category'],
            row.language, row.body, row.is_active,
        );
    }
}