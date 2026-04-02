import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IOrderRepository } from '../../domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import type { IWhatsAppAdapter } from '../../../messages/domain/interfaces/whatsapp-adapter.interface';
import type { WooOrderDto } from '../dtos/order.dto';

@Injectable()
export class RetryOrderUseCase {
    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo: IOrderRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
    ) {}

    @Cron('0 * * * *')
    async execute(): Promise<void> {
        await Promise.allSettled([
            this.processRetries(),
            this.processExpired(),
        ]);
    }

    private async processRetries(): Promise<void> {
        const sessions = await this.orderRepo.findPendingRetries();

        await Promise.allSettled(
            sessions.map(async (session) => {
                const fakeOrder: WooOrderDto = {
                    id:         session.order_id,
                    total:      String(session.order_total),
                    status:     'pending',
                    billing:    { first_name: '', last_name: '', phone: session.phone },
                    shipping:   { address_1: '', city: '' },
                    line_items: [],
                };
                const text = this.whatsApp.buildRetryMessage('', fakeOrder);
                await this.whatsApp.sendText(session.phone, text);
                await this.orderRepo.markAttemptSent(session.order_id, `retry_${Date.now()}`);
            })
        );
    }

    private async processExpired(): Promise<void> {
        const sessions = await this.orderRepo.findExpiredSessions();

        await Promise.allSettled(
            sessions.map(async (session) => {
                await this.orderRepo.updateStatus(session.order_id, 'expired');
                await this.customerRepo.recordExpired(session.phone);
            })
        );
    }
}