import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IOrderRepository } from '../../domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import type { WooOrderDto } from '../dtos/order.dto';
import { normalizePhone } from '../../infrastructure/utils/phone.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProcessOrderUseCase {
    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo: IOrderRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async execute(wooOrder: WooOrderDto): Promise<{ sessionId: number }> {
        const phone       = normalizePhone(wooOrder.billing.phone);
        const name        = `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim();
        const maxAttempts = Number(process.env.BOT_MAX_ATTEMPTS ?? 2);

        let customer = await this.customerRepo.findByPhone(phone);
        if (!customer) {
            customer = await this.customerRepo.create(phone, name);
        }

        if (!customer.canOrder()) {
            return { sessionId: -1 };
        }

        const existing = await this.orderRepo.findByOrderId(wooOrder.id);
        if (existing) return { sessionId: existing.id };

        const session = await this.orderRepo.create({
            order_id:     wooOrder.id,
            customer_id:  customer.id,
            order_total:  Number(wooOrder.total),
            order_items:  wooOrder.line_items as unknown as Prisma.InputJsonValue,
            max_attempts: maxAttempts,
        });

        this.eventEmitter.emit(
            'order.created',
            new OrderCreatedEvent(wooOrder.id, customer.id, session.id, wooOrder),
        );

        return { sessionId: session.id };
    }
}