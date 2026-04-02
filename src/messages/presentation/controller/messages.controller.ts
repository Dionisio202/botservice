import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SendQuickReplyUseCase } from '../../application/usecases/send-quick-reply.usecase';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MessagesPresenter } from '../presenter/messages.presenter';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
    constructor(
        private readonly sendQuickReplyUseCase: SendQuickReplyUseCase,
        private readonly prisma:                PrismaService,
    ) {}

    @Get('session/:sessionId')
    @Roles('admin', 'agent')
    async getBySession(@Param('sessionId') sessionId: string) {
        const messages = await this.prisma.waMessage.findMany({
            where:   { order_session_id: Number(sessionId) },
            orderBy: { created_at: 'asc' },
        });
        return MessagesPresenter.toList(messages);
    }

    @Post('send')
    @Roles('admin', 'agent')
    send(
        @Body() body: { phone: string; content: string; customerId: number },
        @CurrentUser() user: { id: number },
    ) {
        return this.sendQuickReplyUseCase.execute(
            body.phone,
            body.content,
            body.customerId,
            user.id,
        );
    }
}