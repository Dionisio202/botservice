import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SendQuickReplyUseCase } from '../../application/usecases/send-quick-reply.usecase';
import { SendMediaUseCase } from '../../application/usecases/send-media.usecase';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MessagesPresenter } from '../presenter/messages.presenter';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
    constructor(
        private readonly sendQuickReplyUseCase: SendQuickReplyUseCase,
        private readonly sendMediaUseCase:      SendMediaUseCase,
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

    @Post('send-media')
    @Roles('admin', 'agent')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './public/media',
            filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
        }),
        limits:   { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'), false);
        },
    }))
    async sendMedia(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { phone: string; customerId: string; caption?: string; sessionId?: string },
        @CurrentUser() user: { id: number },
    ) {
        return this.sendMediaUseCase.execute({
            phone:      body.phone,
            customerId: Number(body.customerId),
            sessionId:  body.sessionId ? Number(body.sessionId) : undefined,
            caption:    body.caption,
            filePath:   file.path,
            filename:   file.filename,
            mimetype:   file.mimetype,
            agentId:    user.id,
        });
    }
}