import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { IOrderRepository, CreateOrderData } from '../../domain/interfaces/order-repository.interface';
import { Order, OrderStatus, ConvStep } from '../../domain/entities/order.entity';

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

    async findActivePendingByPhone(phone: string): Promise<(Order & { phone: string; pending_changes: Record<string, string> }) | null> {
        const row = await this.prisma.botOrderSession.findFirst({
            where:   { status: 'pending', customer: { phone } },
            include: { customer: true },
        });
        if (!row) return null;

        return Object.assign(this.toEntity(row), {
            phone:           row.customer.phone,
            pending_changes: (row.pending_changes as Record<string, string>) ?? {},
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
            order_id:     data.order_id,
            customer_id:  data.customer_id,
            order_total:  data.order_total,
            order_items:  data.order_items,
            max_attempts: data.max_attempts,
        },
    });
    return this.toEntity(row);
}

    async updateStatus(orderId: number, status: OrderStatus): Promise<void> {
        await this.prisma.botOrderSession.update({
            where: { order_id: orderId },
            data:  { status, updated_at: new Date() },
        });
    }

    async updateConvStep(orderId: number, step: ConvStep, pendingChanges: Record<string, string>): Promise<void> {
        await this.prisma.botOrderSession.update({
            where: { order_id: orderId },
            data:  { conv_step: step, pending_changes: pendingChanges },
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