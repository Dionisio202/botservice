import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IOrderRepository } from '../../domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import type { WooOrderDto } from '../dtos/order.dto';
import { normalizePhone } from '../../infrastructure/utils/phone.utils';
import { Prisma } from '@prisma/client';

const TIER_MAX_PENDING = { new: 1, regular: 2, loyal: 3 } as const;
type CustomerTier = keyof typeof TIER_MAX_PENDING;

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

        if (!customer.canOrder()) return { sessionId: -1 };

        const existing = await this.orderRepo.findByOrderId(wooOrder.id);
        if (existing) return { sessionId: existing.id };

        const riskResult = await this.evaluateRisk(phone, customer);
        if (riskResult.blocked) return { sessionId: -1 };

        const session = await this.orderRepo.create({
    order_id:       wooOrder.id,
    customer_id:    customer.id,
    order_total:    Number(wooOrder.total),
    order_items:    wooOrder.line_items as unknown as Prisma.InputJsonValue,
    max_attempts:   maxAttempts,
    initial_changes: {
        address_1: wooOrder.billing.address_1 || wooOrder.shipping.address_1 || '',
        city:      wooOrder.billing.city      || wooOrder.shipping.city      || '',
        state:     wooOrder.billing.state     || wooOrder.shipping.state     || '',
    } as unknown as Prisma.InputJsonValue,
});

        if (riskResult.needsReview) {
            await this.customerRepo.flagAgentReview(phone, riskResult.reason ?? 'Score de riesgo elevado');
        }

        this.eventEmitter.emit(
            'order.created',
            new OrderCreatedEvent(wooOrder.id, customer.id, session.id, wooOrder),
        );

        return { sessionId: session.id };
    }

    private async evaluateRisk(
        phone: string,
        customer: Awaited<ReturnType<ICustomerRepository['findByPhone']>> & object,
    ): Promise<{ blocked: boolean; needsReview: boolean; reason?: string }> {
        const riskConfig = {
            blacklistThreshold: Number(process.env.BOT_RISK_BLACKLIST_THRESHOLD ?? 10),
            blockThreshold:     Number(process.env.BOT_RISK_BLOCK_THRESHOLD     ?? 6),
            reviewThreshold:    Number(process.env.BOT_RISK_REVIEW_THRESHOLD    ?? 3),
        };

        const tier       = (customer.customer_tier as CustomerTier) ?? 'new';
        const maxPending = TIER_MAX_PENDING[tier] ?? 1;

        const pendingCount = await this.orderRepo.countPendingByPhone(phone);
        if (pendingCount >= maxPending) {
            return { blocked: true, needsReview: false, reason: `Pending limit alcanzado (${pendingCount}/${maxPending})` };
        }

        const score = this.calculateScore(customer, pendingCount);
        await this.customerRepo.updateRiskScore(phone, score);

        if (score >= riskConfig.blacklistThreshold) {
            await this.customerRepo.blacklist(customer.id, `Blacklist automático — score ${score}`, 0);
            return { blocked: true, needsReview: false };
        }

        if (score >= riskConfig.blockThreshold) {
            await this.customerRepo.flagAgentReview(phone, `Score ${score} — bloqueo sin blacklist`);
            return { blocked: true, needsReview: false };
        }

        if (score >= riskConfig.reviewThreshold) {
            return { blocked: false, needsReview: true, reason: `Score ${score} — monitoreo activo` };
        }

        return { blocked: false, needsReview: false };
    }

    private calculateScore(
        customer: Awaited<ReturnType<ICustomerRepository['findByPhone']>> & object,
        pendingCount: number,
    ): number {
        let score = 0;

        score += (customer.cancelled_orders ?? 0) * 2;
        score += (customer.expired_sessions ?? 0) * 3;
        score += (customer.lost_orders      ?? 0) * 4;

        if (pendingCount > 1) score += (pendingCount - 1) * 3;
        if ((customer.confirmed_orders ?? 0) === 0) score += 1;
        if ((customer.confirmed_orders ?? 0) >= 1)  score -= 1;
        if ((customer.confirmed_orders ?? 0) >= 3)  score -= 3;

        return Math.max(0, score);
    }
}