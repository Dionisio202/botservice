import { Injectable, Inject } from '@nestjs/common';
import type { IOrderRepository } from '../../domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import type { IWhatsAppAdapter } from '../../../messages/domain/interfaces/whatsapp-adapter.interface';
import type { WooOrderDto } from '../dtos/order.dto';
import { normalizePhone } from '../../infrastructure/utils/phone.utils';

@Injectable()
export class ProcessOrderUpdateUseCase {
    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo: IOrderRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
    ) {}

    async execute(wooOrder: WooOrderDto): Promise<void> {
        if (wooOrder.status !== 'completed') return;

        const session = await this.orderRepo.findByOrderId(wooOrder.id);
        if (!session) return;
        if (!['pending', 'confirmed', 'shipped'].includes(session.status)) return;

        const phone = normalizePhone(wooOrder.billing.phone);

        await this.orderRepo.updateStatus(wooOrder.id, 'delivered');
        await this.orderRepo.setReviewRequestedAt(wooOrder.id);

        const delayHours = Number(process.env.BOT_REVIEW_DELAY_HOURS ?? 2);
        const delayMs    = delayHours * 60 * 60 * 1000;

        setTimeout(async () => {
            await this.orderRepo.updateConvStep(wooOrder.id, 'awaiting_review', {});
            await this.whatsApp.sendText(
                phone,
                `🎉 ¡Hola! Tu pedido *#${wooOrder.id}* fue entregado.\n\n` +
                `¿Llegó todo perfecto? Nos ayudaría mucho saber cómo te fue 🌿\n\n` +
                `Califica del *1* al *5* ⭐ o envíanos una foto del producto.`,
            );
        }, delayMs);
    }
}