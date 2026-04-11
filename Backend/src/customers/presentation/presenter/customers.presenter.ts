import { BotCustomer } from '@prisma/client';

export class CustomersPresenter {
    static toResponse(customer: BotCustomer) {
        return {
            id:                  customer.id,
            phone:               customer.phone,
            customer_name:       customer.customer_name,
            customer_tier:       customer.customer_tier,
            risk_score:          customer.risk_score ?? 0,
            total_orders:        customer.total_orders,
            confirmed_orders:    customer.confirmed_orders,
            cancelled_orders:    customer.cancelled_orders,
            lost_orders:         customer.lost_orders,
            expired_sessions:    customer.expired_sessions,
            total_lost_amount:   Number(customer.total_lost_amount),
            is_blacklisted:      customer.is_blacklisted,
            blacklist_reason:    customer.blacklist_reason,
            needs_agent_review:  customer.needs_agent_review,
            agent_review_reason: customer.agent_review_reason,
            manually_trusted:    customer.manually_trusted,
            first_order_at:      customer.first_order_at,
            last_order_at:       customer.last_order_at,
        };
    }

    static toList(customers: BotCustomer[]) {
        return customers.map(this.toResponse);
    }
}