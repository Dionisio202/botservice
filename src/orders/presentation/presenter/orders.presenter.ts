import { BotOrderSession, BotCustomer } from '@prisma/client';

type OrderWithCustomer = BotOrderSession & { customer: BotCustomer };

export class OrdersPresenter {
    static toResponse(order: OrderWithCustomer) {
        return {
            id:            order.id,
            order_id:      order.order_id,
            status:        order.status,
            conv_step:     order.conv_step,
            order_total:   Number(order.order_total),
            order_items:   order.order_items,
            attempts:      order.attempts,
            max_attempts:  order.max_attempts,
            next_retry_at: order.next_retry_at,
            created_at:    order.created_at,
            customer: {
                id:    order.customer.id,
                phone: order.customer.phone,
                name:  order.customer.customer_name,
            },
        };
    }

    static toList(orders: OrderWithCustomer[]) {
        return orders.map(this.toResponse);
    }
}