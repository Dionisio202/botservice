import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { ICustomerRepository } from '../../domain/interfaces/customer-repository.interface';
import { Customer } from '../../domain/entities/customer.entity';

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByPhone(phone: string): Promise<Customer | null> {
        const row = await this.prisma.botCustomer.findUnique({ where: { phone } });
        if (!row) return null;
        return this.toEntity(row);
    }

    async create(phone: string, name?: string): Promise<Customer> {
        const row = await this.prisma.botCustomer.create({
            data: { phone, customer_name: name ?? null },
        });
        return this.toEntity(row);
    }

    async blacklist(id: number, reason: string, adminId: number): Promise<void> {
        await this.prisma.botCustomer.update({
            where: { id },
            data:  {
                is_blacklisted:   true,
                blacklist_reason: reason,
                blacklisted_at:   new Date(),
                blacklisted_by:   adminId,
            },
        });
    }

    async recordCancelled(phone: string): Promise<void> {
        await this.prisma.botCustomer.update({
            where: { phone },
            data:  {
                cancelled_orders: { increment: 1 },
                last_order_at:    new Date(),
            },
        });
    }

  async recordConfirmed(phone: string): Promise<void> {
    const updated = await this.prisma.botCustomer.update({
        where: { phone },
        data:  {
            confirmed_orders: { increment: 1 },
            last_order_at:    new Date(),
        },
    });

    const tier = updated.confirmed_orders >= 3 ? 'loyal'
               : updated.confirmed_orders >= 1 ? 'regular'
               : 'new';

    await this.prisma.botCustomer.update({
        where: { phone },
        data:  { customer_tier: tier },
    });
}

    async recordExpired(phone: string): Promise<void> {
        await this.prisma.botCustomer.update({
            where: { phone },
            data:  {
                expired_sessions: { increment: 1 },
                last_order_at:    new Date(),
            },
        });
    }

    async recordLost(phone: string, amount: number): Promise<void> {
        await this.prisma.botCustomer.update({
            where: { phone },
            data:  {
                lost_orders:       { increment: 1 },
                total_lost_amount: { increment: amount },
                last_order_at:     new Date(),
            },
        });
    }

   private toEntity(row: {
    id: number; phone: string; customer_name: string | null;
    lost_orders: number; cancelled_orders: number;
    is_blacklisted: boolean; total_lost_amount: unknown;
    confirmed_orders: number; expired_sessions: number;
    customer_tier: string;
}): Customer {
    return new Customer(
        row.id,
        row.phone,
        row.customer_name,
        row.lost_orders,
        row.cancelled_orders,
        row.is_blacklisted,
        Number(row.total_lost_amount),
        row.confirmed_orders,
        row.expired_sessions,
        row.customer_tier,
    );
}
    async unblacklist(id: number): Promise<void> {
    await this.prisma.botCustomer.update({
        where: { id },
        data:  {
            is_blacklisted:   false,
            blacklist_reason: null,
            blacklisted_at:   null,
            blacklisted_by:   null,
        },
    });
}
async flagAgentReview(phone: string, reason: string): Promise<void> {
    await this.prisma.botCustomer.update({
        where: { phone },
        data:  {
            needs_agent_review:  true,
            agent_review_reason: reason,
        },
    });
}
}