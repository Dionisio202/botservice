import { BotOrderSession, SessionStatus, ConvStep } from '../../shared/dtos';

export interface IBotSessionRepository {
    create(orderId: number, phone: string): Promise<void>;
    findByOrderId(orderId: number): Promise<BotOrderSession | null>;
    findActivePendingByPhone(phone: string): Promise<BotOrderSession | null>;
    countPendingByPhone(phone: string): Promise<number>;
    updateConvStep(
        orderId:        number,
        step:           ConvStep,
        pendingChanges: Record<string, string>
    ): Promise<void>;
    markAttemptSent(orderId: number, messageId: string): Promise<void>;
    updateStatus(orderId: number, status: SessionStatus): Promise<void>;
    findPendingRetries(): Promise<BotOrderSession[]>;
    findExpiredSessions(): Promise<BotOrderSession[]>;
}