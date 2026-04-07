import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { IOrderRepository, CreateOrderData } from '../../domain/interfaces/order-repository.interface';
import { Order, OrderStatus, ConvStep } from '../../domain/entities/order.entity';
import { Prisma } from '@prisma/client';
@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByOrderId(orderId: number): Promise<Order | null> {
        const row = await this.prisma.botOrderSession.findUnique({
            where: { order_id: orderId },
        });
        if (!row) return null;
        return this.toEntity(row);
    }

 async findActivePendingByPhone(phone: string): Promise<(Order & { 
    phone: string; 
    pending_changes: Record<string, unknown>; 
    unrecognized_count: number;
    order_items: unknown;
    order_total: number;
}) | null> {
    const row = await this.prisma.botOrderSession.findFirst({
        where:   { status: 'pending', customer: { phone } },
        include: { customer: true },
    });
    if (!row) return null;

    return Object.assign(this.toEntity(row), {
        phone:              row.customer.phone,
        pending_changes:    (row.pending_changes as Record<string, unknown>) ?? {},
        unrecognized_count: row.unrecognized_count ?? 0,
        order_items:        row.order_items,
        order_total:        Number(row.order_total),
    });
}
async updateOrderItems(orderId: number, items: unknown, newTotal: number): Promise<void> {
    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  {
            order_items: items as Prisma.InputJsonValue,
            order_total: newTotal,
        },
    });
}
async saveRating(orderId: number, rating: number): Promise<void> {
    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  { rating, conv_step: 'done' },
    });
}

async incrementUnrecognized(orderId: number): Promise<void> {
    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  { unrecognized_count: { increment: 1 } },
    });
}

    async findPendingRetries(): Promise<Array<Order & { phone: string }>> {
        const retryDelay = Number(process.env.BOT_RETRY_DELAY_HOURS ?? 24);
        const threshold  = new Date(Date.now() - retryDelay * 60 * 60 * 1000);

        const rows = await this.prisma.botOrderSession.findMany({
            where: {
                status:     'pending',
                updated_at: { lte: threshold },
            },
            include: { customer: true },
        });

        return rows
            .filter((row) => row.attempts < row.max_attempts)
            .map((row) => Object.assign(this.toEntity(row), { phone: row.customer.phone }));
    }

    async findExpiredSessions(): Promise<Array<Order & { phone: string }>> {
        const rows = await this.prisma.botOrderSession.findMany({
            where:   { status: 'pending' },
            include: { customer: true },
        });

        return rows
            .filter((row) => row.attempts >= row.max_attempts)
            .map((row) => Object.assign(this.toEntity(row), { phone: row.customer.phone }));
    }

   async create(data: CreateOrderData): Promise<Order> {
    const row = await this.prisma.botOrderSession.create({
        data: {
            order_id:        data.order_id,
            customer_id:     data.customer_id,
            customer_name:   data.customer_name ?? null,
            order_total:     data.order_total,
            order_items:     data.order_items,
            max_attempts:    data.max_attempts,
            pending_changes: data.initial_changes ?? {},
        },
    });
    return this.toEntity(row);
}

    async updateStatus(orderId: number, status: OrderStatus): Promise<void> {
    const timestamps: Record<string, Date> = {};
    if (status === 'cancelled') timestamps.cancelled_at = new Date();
    if (status === 'delivered') timestamps.delivered_at = new Date();
    if (status === 'expired')   timestamps.expired_at   = new Date();
    if (status === 'shipped')   timestamps.shipped_at   = new Date();
    if (status === 'lost')      timestamps.lost_at      = new Date();
    if (status === 'returned')  timestamps.returned_at  = new Date();

    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  { status, updated_at: new Date(), ...timestamps },
    });
}
async countPendingByPhone(phone: string): Promise<number> {
    return this.prisma.botOrderSession.count({
        where: { status: 'pending', customer: { phone } },
    });
}
async findLastSessionByPhone(phone: string): Promise<(Order & { phone: string }) | null> {
    const row = await this.prisma.botOrderSession.findFirst({
        where:   { customer: { phone } },
        include: { customer: true },
        orderBy: { created_at: 'desc' },
    });
    if (!row) return null;
    return Object.assign(this.toEntity(row), { phone: row.customer.phone });
}
async updateConvStep(orderId: number, step: ConvStep, pendingChanges: Record<string, unknown>): Promise<void> {
    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  { conv_step: step, pending_changes: pendingChanges as Prisma.InputJsonValue },
    });
}
async setReviewRequestedAt(orderId: number): Promise<void> {
    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  { review_requested_at: new Date() },
    });
}
    async markAttemptSent(orderId: number, messageId: string): Promise<void> {
        await this.prisma.botOrderSession.update({
            where: { order_id: orderId },
            data:  {
                attempts:      { increment: 1 },
                wa_message_id: messageId,
                next_retry_at: new Date(Date.now() + Number(process.env.BOT_RETRY_DELAY_HOURS ?? 24) * 60 * 60 * 1000),
            },
        });
    }
async updateConvStepOnly(orderId: number, step: ConvStep): Promise<void> {
    await this.prisma.botOrderSession.update({
        where: { order_id: orderId },
        data:  { conv_step: step },
    });
}
    private toEntity(row: {
        id: number; order_id: number; order_total: unknown;
        status: string; conv_step: string; attempts: number; max_attempts: number;
    }): Order {
        return new Order(
            row.id,
            row.order_id,
            Number(row.order_total),
            row.status as OrderStatus,
            row.conv_step as ConvStep,
            row.attempts,
            row.max_attempts,
        );
    }
}