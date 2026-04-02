import { Injectable, Inject } from '@nestjs/common';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';
import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';
import { normalizePhone } from '../../../orders/infrastructure/utils/phone.utils';

@Injectable()
export class SendTemplateUseCase {
    constructor(
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
    ) {}

    async execute(order: WooOrderDto, customerId: number, orderSessionId: number): Promise<string> {
        const phone     = normalizePhone(order.billing.phone);
        const messageId = await this.whatsApp.sendConfirmationTemplate(order, phone);

        await this.messageRepo.create({
            customer_id:      customerId,
            order_session_id: orderSessionId,
            wa_message_id:    messageId,
            direction:        'outbound',
            msg_type:         'template',
            content:          `Template enviado: ${process.env.WA_TEMPLATE_NAME}`,
        });

        return messageId;
    }
}