import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { PrismaQuickReplyRepository } from '../../infrastructure/repository/prisma-quick-reply.repository';
import { QuickRepliesPresenter } from '../presenter/quick-replies.presenter';

@Controller('quick-replies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuickRepliesController {
    constructor(private readonly quickReplyRepo: PrismaQuickReplyRepository) {}

    @Get()
    @Roles('admin', 'agent')
    async getAll() {
        const qrs = await this.quickReplyRepo.findAll();
        return QuickRepliesPresenter.toList(qrs);
    }

    @Get('active')
    @Roles('admin', 'agent')
    async getActive() {
        const qrs = await this.quickReplyRepo.findActive();
        return QuickRepliesPresenter.toList(qrs);
    }

    @Post()
    @Roles('admin')
    create(
        @Body() body: { title: string; content: string; category?: string },
        @CurrentUser() user: { id: number },
    ) {
        return this.quickReplyRepo.create({ ...body, created_by: user.id });
    }

    @Patch(':id')
    @Roles('admin')
    update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.quickReplyRepo.update(Number(id), body as any);
    }

    @Delete(':id')
    @Roles('admin')
    delete(@Param('id') id: string) {
        return this.quickReplyRepo.delete(Number(id));
    }
}