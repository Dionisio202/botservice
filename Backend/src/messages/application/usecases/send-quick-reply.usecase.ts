import { Injectable, Inject } from '@nestjs/common';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';
import { normalizePhone } from '../../../orders/infrastructure/utils/phone.utils';

@Injectable()
export class SendQuickReplyUseCase {
    constructor(
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
    ) {}

    async execute(phone: string, content: string, customerId: number, agentId: number, sessionId?: number): Promise<void> {
        const normalized = normalizePhone(phone);
        await this.whatsApp.sendText(normalized, content);

        await this.messageRepo.create({
            customer_id:      customerId,
            order_session_id: sessionId,
            direction:        'outbound',
            msg_type:         'text',
            content,
            sent_by:          agentId,
        });
    }
}