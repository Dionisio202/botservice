import { Injectable, Inject } from '@nestjs/common';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';
import type { IOrderRepository } from '../../../orders/domain/interfaces/order-repository.interface';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import { BotEngineService } from '../../infrastructure/adapters/bot-engine.service';

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

    async execute(phone: string, text: string, waMessageId?: string, buttonPayload?: string): Promise<void> {
        const customer = await this.customerRepo.findByPhone(phone);
        if (!customer) return;

        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await this.messageRepo.create({
            customer_id:   customer.id,
            wa_message_id: waMessageId,
            direction:     'inbound',
            msg_type:      'text',
            content:       text,
        });

        await this.botEngine.processIncomingMessage(phone, text, buttonPayload);
    }
}