import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SendTemplateUseCase } from '../usecases/send-template.usecase';
import { OrderCreatedEvent } from '../../../orders/domain/events/order-created.event';
import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';

@Injectable()
export class OrderCreatedListener {
    constructor(private readonly sendTemplateUseCase: SendTemplateUseCase) {}

    @OnEvent('order.created')
    async handle(event: OrderCreatedEvent): Promise<void> {
        await this.sendTemplateUseCase.execute(
            event.wooOrder as WooOrderDto,
            event.customerId,
            event.sessionId,
        );
    }
}