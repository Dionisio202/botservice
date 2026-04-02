import { Order, OrderStatus, ConvStep } from '../entities/order.entity';
import { Prisma } from '@prisma/client';

export interface IOrderRepository {
    findByOrderId(orderId: number): Promise<Order | null>;
    findActivePendingByPhone(phone: string): Promise<(Order & { phone: string; pending_changes: Record<string, string> }) | null>;
    findPendingRetries(): Promise<Array<Order & { phone: string }>>;
    findExpiredSessions(): Promise<Array<Order & { phone: string }>>;
    create(data: CreateOrderData): Promise<Order>;
    updateStatus(orderId: number, status: OrderStatus): Promise<void>;
    updateConvStep(orderId: number, step: ConvStep, pendingChanges: Record<string, string>): Promise<void>;
    markAttemptSent(orderId: number, messageId: string): Promise<void>;
}

export interface CreateOrderData {
    order_id:     number;
    customer_id:  number;
    order_total:  number;
    order_items:  Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    max_attempts: number;
}