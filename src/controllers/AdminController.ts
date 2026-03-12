import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../shared/database/db';

// ── /admin/stats ──────────────────────────────────────────────────────────────
export async function getStats(_req: Request, res: Response): Promise<void> {
    try {
        const [statusRows] = await pool.execute<RowDataPacket[]>(`
            SELECT status, COUNT(*) as total
            FROM bot_order_sessions
            GROUP BY status
        `);

        const [todayRows] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as total
            FROM bot_order_sessions
            WHERE DATE(created_at) = CURDATE()
        `);

        const [blacklistRows] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as total
            FROM bot_customer_history
            WHERE is_blacklisted = 1
        `);

        const [pendingRows] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as total
            FROM bot_order_sessions
            WHERE status = 'pending'
        `);

        const [rateRows] = await pool.execute<RowDataPacket[]>(`
            SELECT
                ROUND(
                    SUM(CASE WHEN status IN ('confirmed','modified') THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(*), 0), 1
                ) as confirmation_rate,
                ROUND(
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(*), 0), 1
                ) as cancellation_rate,
                ROUND(
                    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(*), 0), 1
                ) as expiration_rate
            FROM bot_order_sessions
        `);

        const statusMap: Record<string, number> = {};
        for (const row of statusRows as Array<{ status: string; total: number }>) {
            statusMap[row.status] = row.total;
        }

        res.json({
            today:             (todayRows[0] as { total: number }).total,
            pending:           (pendingRows[0] as { total: number }).total,
            blacklisted:       (blacklistRows[0] as { total: number }).total,
            confirmation_rate: (rateRows[0] as { confirmation_rate: number }).confirmation_rate ?? 0,
            cancellation_rate: (rateRows[0] as { cancellation_rate: number }).cancellation_rate ?? 0,
            expiration_rate:   (rateRows[0] as { expiration_rate: number }).expiration_rate   ?? 0,
            by_status:         statusMap,
        });
    } catch (err) {
        console.error('[Admin] getStats error:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas.' });
    }
}

// ── /admin/sessions ───────────────────────────────────────────────────────────
export async function getSessions(req: Request, res: Response): Promise<void> {
    try {
        const limit  = parseInt(req.query['limit']  as string ?? '50', 10);
        const offset = parseInt(req.query['offset'] as string ?? '0',  10);
        const status = req.query['status'] as string | undefined;

        const where  = status ? 'WHERE status = ?' : '';
        const params = status ? [status, limit, offset] : [limit, offset];

        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT order_id, phone, status, attempts, conv_step,
                    created_at, updated_at, next_retry_at
             FROM bot_order_sessions
             ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            params
        );

        const [countRows] = await pool.execute<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM bot_order_sessions ${where}`,
            status ? [status] : []
        );

        res.json({
            data:   rows,
            total:  (countRows[0] as { total: number }).total,
            limit,
            offset,
        });
    } catch (err) {
        console.error('[Admin] getSessions error:', err);
        res.status(500).json({ error: 'Error al obtener sesiones.' });
    }
}

// ── /admin/blacklist ──────────────────────────────────────────────────────────
export async function getBlacklist(_req: Request, res: Response): Promise<void> {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT phone, blacklist_reason, blacklisted_at,
                   cancelled_orders, total_orders
            FROM bot_customer_history
            WHERE is_blacklisted = 1
            ORDER BY blacklisted_at DESC
        `);
        res.json({ data: rows });
    } catch (err) {
        console.error('[Admin] getBlacklist error:', err);
        res.status(500).json({ error: 'Error al obtener blacklist.' });
    }
}

// ── /admin/blacklist/:phone  DELETE ───────────────────────────────────────────
export async function removeFromBlacklist(req: Request, res: Response): Promise<void> {
    try {
        const { phone } = req.params;
        await pool.execute(
            `UPDATE bot_customer_history
             SET is_blacklisted = 0, blacklist_reason = NULL, blacklisted_at = NULL
             WHERE phone = ?`,
            [phone]
        );
        res.json({ ok: true, message: `${phone} removido de blacklist.` });
    } catch (err) {
        console.error('[Admin] removeBlacklist error:', err);
        res.status(500).json({ error: 'Error al remover de blacklist.' });
    }
}

// ── /admin/sessions/:orderId/cancel  POST ─────────────────────────────────────
export async function cancelSession(req: Request, res: Response): Promise<void> {
    try {
        const orderId = parseInt(req.params['orderId'], 10);
        await pool.execute(
            `UPDATE bot_order_sessions SET status = 'cancelled' WHERE order_id = ?`,
            [orderId]
        );
        res.json({ ok: true, message: `Sesión #${orderId} cancelada manualmente.` });
    } catch (err) {
        console.error('[Admin] cancelSession error:', err);
        res.status(500).json({ error: 'Error al cancelar sesión.' });
    }
}