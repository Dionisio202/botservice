import { Controller, Get, Post, Body, Query, Headers, HttpCode, UnauthorizedException } from '@nestjs/common';
import { ReceiveMessageUseCase } from '../../application/usecases/receive-message.usecase';

interface MetaWebhookBody {
    object: string;
    entry:  Array<{
        changes: Array<{
            value: {
                messages?: Array<{
                    from:      string;
                    id:        string;
                    type:      string;
                    text?:     { body: string };
                    button?:   { payload: string };
                    interactive?: { button_reply?: { id: string } };
                }>;
            };
        }>;
    }>;
}

@Controller('webhooks/meta')
export class MetaController {
    constructor(private readonly receiveMessageUseCase: ReceiveMessageUseCase) {}

    @Get()
    verify(
        @Query('hub.mode')        mode:      string,
        @Query('hub.verify_token') token:    string,
        @Query('hub.challenge')   challenge: string,
    ): string {
        if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
            return challenge;
        }
        throw new UnauthorizedException('Token de verificación inválido');
    }

    @Post()
    @HttpCode(200)
    async handle(@Body() body: MetaWebhookBody): Promise<void> {
        if (body.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry) {
            for (const change of entry.changes) {
                const messages = change.value.messages;
                if (!messages) continue;

                for (const msg of messages) {
                    await this.receiveMessageUseCase.execute(
                        msg.from,
                        msg.text?.body ?? msg.button?.payload ?? '',
                        msg.id,
                        msg.button?.payload ?? msg.interactive?.button_reply?.id,
                    );
                }
            }
        }
    }
}