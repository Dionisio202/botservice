import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';
import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';
import { normalizePhone } from '../../../orders/infrastructure/utils/phone.utils';

@Injectable()
export class SendTemplateUseCase {
    private readonly logger = new Logger(SendTemplateUseCase.name);

    constructor(
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
    ) {}

    async execute(order: WooOrderDto, customerId: number, orderSessionId: number): Promise<string> {
        const phone = normalizePhone(order.billing.phone);
        this.logger.log(`Enviando template a ${phone} para pedido #${order.id}`);

        let messageId: string;
        try {
            messageId = await this.whatsApp.sendConfirmationTemplate(order, phone);
            this.logger.log(`Template enviado correctamente. wa_message_id: ${messageId}`);
        } catch (err) {
            this.logger.error(`Error enviando template a ${phone} para pedido #${order.id}`, err);
            throw err;
        }

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