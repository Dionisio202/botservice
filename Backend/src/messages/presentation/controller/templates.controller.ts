import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { PrismaTemplateRepository } from '../../infrastructure/repository/prisma-template.repository';
import { TemplatesPresenter } from '../presenter/templates.presenter';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
    constructor(private readonly templateRepo: PrismaTemplateRepository) {}

    @Get()
    @Roles('admin', 'agent')
    async getAll() {
        const templates = await this.templateRepo.findAll();
        return TemplatesPresenter.toList(templates);
    }

    @Get('active')
    @Roles('admin', 'agent')
    async getActive() {
        const templates = await this.templateRepo.findActive();
        return TemplatesPresenter.toList(templates);
    }

    @Post()
    @Roles('admin')
    create(
        @Body() body: { name: string; wa_template_name: string; category: string; language: string; body: string },
        @CurrentUser() user: { id: number },
    ) {
        return this.templateRepo.create({ ...body, created_by: user.id });
    }

    @Patch(':id')
    @Roles('admin')
    update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.templateRepo.update(Number(id), body as any);
    }

    @Delete(':id')
    @Roles('admin')
    delete(@Param('id') id: string) {
        return this.templateRepo.delete(Number(id));
    }
}