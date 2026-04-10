import { Injectable, Inject } from '@nestjs/common';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';
import type { IOrderRepository } from '../../../orders/domain/interfaces/order-repository.interface';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import { BotEngineService } from '../../infrastructure/adapters/bot-engine.service';

interface IncomingMedia {
    mediaId:   string;
    mediaType: 'image' | 'document' | 'video';
    caption?:  string;
}

@Injectable()
export class ReceiveMessageUseCase {
    constructor(
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
        @Inject('IOrderRepository')
        private readonly orderRepo: IOrderRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
        private readonly botEngine: BotEngineService,
    ) {}

    async execute(
        phone:         string,
        text:          string,
        waMessageId?:  string,
        buttonPayload?: string,
        media?:        IncomingMedia,
    ): Promise<void> {
        const customer = await this.customerRepo.findByPhone(phone);
        if (!customer) return;

        const session = await this.orderRepo.findActivePendingByPhone(phone);

        if (media) {
            const mediaUrl = await this.whatsApp.downloadMedia(media.mediaId);

            await this.messageRepo.create({
                customer_id:      customer.id,
                order_session_id: session?.id,
                wa_message_id:    waMessageId,
                direction:        'inbound',
                msg_type:         'media',
                content:          media.caption ?? `[${media.mediaType}]`,
                media_url:        mediaUrl,
                media_type:       media.mediaType,
            });

            if (session?.conv_step === 'awaiting_review') {
                await this.botEngine.processIncomingMessage(phone, '5', buttonPayload);
            }
            return;
        }

        await this.messageRepo.create({
            customer_id:      customer.id,
            order_session_id: session?.id,
            wa_message_id:    waMessageId,
            direction:        'inbound',
            msg_type:         'text',
            content:          text,
        });

        await this.botEngine.processIncomingMessage(phone, text, buttonPayload);
    }
}