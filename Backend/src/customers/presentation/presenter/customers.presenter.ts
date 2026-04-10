import { BotCustomer } from '@prisma/client';

export class CustomersPresenter {
    static toResponse(customer: BotCustomer) {
        return {
            id:                customer.id,
            phone:             customer.phone,
            name:              customer.customer_name,
            total_orders:      customer.total_orders,
            confirmed_orders:  customer.confirmed_orders,
            cancelled_orders:  customer.cancelled_orders,
            lost_orders:       customer.lost_orders,
            total_lost_amount: Number(customer.total_lost_amount),
            is_blacklisted:    customer.is_blacklisted,
            blacklist_reason:  customer.blacklist_reason,
            last_order_at:     customer.last_order_at,
        };
    }

    static toList(customers: BotCustomer[]) {
        return customers.map(this.toResponse);
    }
}