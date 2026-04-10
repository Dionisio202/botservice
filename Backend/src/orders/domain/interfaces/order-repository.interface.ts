import { Order, OrderStatus, ConvStep } from '../entities/order.entity';
import { Prisma } from '@prisma/client';

export interface IOrderRepository {
    findByOrderId(orderId: number): Promise<Order | null>;
    findActivePendingByPhone(phone: string): Promise<(Order & { 
    phone: string; 
    pending_changes: Record<string, unknown>; 
    unrecognized_count: number;
    order_items: unknown;
    order_total: number;
}) | null>;
    findPendingRetries(): Promise<Array<Order & { phone: string }>>;
    findExpiredSessions(): Promise<Array<Order & { phone: string }>>;
    create(data: CreateOrderData): Promise<Order>;
    updateStatus(orderId: number, status: OrderStatus): Promise<void>;
    updateConvStep(orderId: number, step: ConvStep, pendingChanges: Record<string, unknown>): Promise<void>;
    markAttemptSent(orderId: number, messageId: string): Promise<void>;
    saveRating(orderId: number, rating: number): Promise<void>;
    incrementUnrecognized(orderId: number): Promise<void>;
    countPendingByPhone(phone: string): Promise<number>;
findLastSessionByPhone(phone: string): Promise<(Order & { phone: string }) | null>;
setReviewRequestedAt(orderId: number): Promise<void>;
updateConvStepOnly(orderId: number, step: ConvStep): Promise<void>;
updateOrderItems(orderId: number, items: unknown, newTotal: number): Promise<void>;
}

export interface CreateOrderData {
    order_id:     number;
    customer_id:  number;
    customer_name?: string;
    order_total:  number;
    order_items:  Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    max_attempts: number;
    initial_changes?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
}