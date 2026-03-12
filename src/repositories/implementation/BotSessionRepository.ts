import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../../shared/database/db';
import { IBotSessionRepository } from '../interface/IBotSessionRepository';
import { BotOrderSession, SessionStatus, ConvStep } from '../../shared/dtos';

interface SessionRow extends RowDataPacket {
    id:                number;
    order_id:          number;
    phone:             string;
    status:            SessionStatus;
    attempts:          number;
    max_attempts:      number;
    next_retry_at:     Date | null;
    retry_delay_hours: number;
    conv_step:         ConvStep;
    pending_changes:   string | null;
    wa_message_id:     string | null;
    created_at:        Date;
    updated_at:        Date;
}

function parseSession(row: SessionRow): BotOrderSession {
    return {
        ...row,
        pending_changes: row.pending_changes
            ? (JSON.parse(row.pending_changes) as Record<string, string>)
            : null,
    };
}

export class BotSessionRepository implements IBotSessionRepository {

    async create(orderId: number, phone: string): Promise<void> {
        const maxAttempts:     number = parseInt(process.env.BOT_MAX_ATTEMPTS      ?? '2',  10);
        const retryDelayHours: number = parseInt(process.env.BOT_RETRY_DELAY_HOURS ?? '24', 10);

        await pool.execute<ResultSetHeader>(
            `INSERT INTO bot_order_sessions
                (order_id, phone, status, attempts, max_attempts, retry_delay_hours, conv_step)
             VALUES (?, ?, 'pending', 0, ?, ?, 'awaiting_action')
             ON DUPLICATE KEY UPDATE
                phone           = VALUES(phone),
                status          = 'pending',
                attempts        = 0,
                next_retry_at   = NULL,
                conv_step       = 'awaiting_action',
                pending_changes = NULL,
                updated_at      = NOW()`,
            [orderId, phone, maxAttempts, retryDelayHours]
        );
    }

    async findByOrderId(orderId: number): Promise<BotOrderSession | null> {
        const [rows] = await pool.execute<SessionRow[]>(
            'SELECT * FROM bot_order_sessions WHERE order_id = ?',
            [orderId]
        );
        return rows.length > 0 ? parseSession(rows[0]) : null;
    }

    async findActivePendingByPhone(phone: string): Promise<BotOrderSession | null> {
        const [rows] = await pool.execute<SessionRow[]>(
            `SELECT * FROM bot_order_sessions
             WHERE phone = ? AND status = 'pending'
             ORDER BY created_at DESC LIMIT 1`,
            [phone]
        );
        return rows.length > 0 ? parseSession(rows[0]) : null;
    }

    async countPendingByPhone(phone: string): Promise<number> {
        const [rows] = await pool.execute<(RowDataPacket & { cnt: number })[]>(
            `SELECT COUNT(*) AS cnt FROM bot_order_sessions
             WHERE phone = ? AND status = 'pending'`,
            [phone]
        );
        return rows[0].cnt;
    }

    async updateConvStep(
        orderId:        number,
        step:           ConvStep,
        pendingChanges: Record<string, string> = {}
    ): Promise<void> {
        await pool.execute<ResultSetHeader>(
            `UPDATE bot_order_sessions
             SET conv_step = ?, pending_changes = ?, updated_at = NOW()
             WHERE order_id = ?`,
            [step, JSON.stringify(pendingChanges), orderId]
        );
    }

    async markAttemptSent(orderId: number, messageId: string): Promise<void> {
        const retryDelayHours: number = parseInt(process.env.BOT_RETRY_DELAY_HOURS ?? '24', 10);
        await pool.execute<ResultSetHeader>(
            `UPDATE bot_order_sessions
             SET attempts      = attempts + 1,
                 wa_message_id = ?,
                 next_retry_at = DATE_ADD(NOW(), INTERVAL ? HOUR),
                 updated_at    = NOW()
             WHERE order_id = ?`,
            [messageId, retryDelayHours, orderId]
        );
    }

    async updateStatus(orderId: number, status: SessionStatus): Promise<void> {
        await pool.execute<ResultSetHeader>(
            `UPDATE bot_order_sessions
             SET status = ?, next_retry_at = NULL, updated_at = NOW()
             WHERE order_id = ?`,
            [status, orderId]
        );
    }

    async findPendingRetries(): Promise<BotOrderSession[]> {
        const [rows] = await pool.execute<SessionRow[]>(
            `SELECT * FROM bot_order_sessions
             WHERE status        = 'pending'
               AND next_retry_at IS NOT NULL
               AND next_retry_at <= NOW()
               AND attempts      < max_attempts`
        );
        return rows.map(parseSession);
    }

    async findExpiredSessions(): Promise<BotOrderSession[]> {
        const expireHours: number = parseInt(process.env.BOT_SESSION_EXPIRE_HOURS ?? '48', 10);
        const [rows] = await pool.execute<SessionRow[]>(
            `SELECT * FROM bot_order_sessions
             WHERE status     = 'pending'
               AND attempts  >= max_attempts
               AND updated_at <= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
            [expireHours]
        );
        return rows.map(parseSession);
    }
}