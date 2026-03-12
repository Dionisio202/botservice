import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../../shared/database/db';
import { ICustomerHistoryRepository } from '../interface/ICustomerHistoryRepository';
import { BotCustomerHistory } from '../../shared/dtos';

interface CustomerRow extends RowDataPacket {
    id:                  number;
    phone:               string;
    total_orders:        number;
    confirmed_orders:    number;
    cancelled_orders:    number;
    expired_sessions:    number;
    is_blacklisted:      number; // TINYINT → 0 | 1
    blacklist_reason:    string | null;
    blacklisted_at:      Date | null;
    recent_cancels_json: string | null;
    first_order_at:      Date;
    last_order_at:       Date;
}

function parseCustomer(row: CustomerRow): BotCustomerHistory {
    return {
        ...row,
        is_blacklisted:      Boolean(row.is_blacklisted),
        recent_cancels_json: row.recent_cancels_json
            ? (JSON.parse(row.recent_cancels_json) as string[])
            : [],
    };
}

export class CustomerHistoryRepository implements ICustomerHistoryRepository {

    async findOrCreate(phone: string): Promise<BotCustomerHistory> {
        await pool.execute<ResultSetHeader>(
            `INSERT INTO bot_customer_history (phone)
             VALUES (?)
             ON DUPLICATE KEY UPDATE phone = phone`,
            [phone]
        );
        const [rows] = await pool.execute<CustomerRow[]>(
            'SELECT * FROM bot_customer_history WHERE phone = ?',
            [phone]
        );
        return parseCustomer(rows[0]);
    }

    async isBlacklisted(phone: string): Promise<boolean> {
        const [rows] = await pool.execute<(RowDataPacket & { is_blacklisted: number })[]>(
            'SELECT is_blacklisted FROM bot_customer_history WHERE phone = ?',
            [phone]
        );
        return rows.length > 0 ? Boolean(rows[0].is_blacklisted) : false;
    }

    async recordNewOrder(phone: string): Promise<void> {
        await pool.execute<ResultSetHeader>(
            `INSERT INTO bot_customer_history (phone, total_orders)
             VALUES (?, 1)
             ON DUPLICATE KEY UPDATE
                total_orders  = total_orders + 1,
                last_order_at = NOW()`,
            [phone]
        );
    }

    async recordConfirmed(phone: string): Promise<void> {
        await pool.execute<ResultSetHeader>(
            `UPDATE bot_customer_history
             SET confirmed_orders = confirmed_orders + 1
             WHERE phone = ?`,
            [phone]
        );
    }

    async recordCancelled(phone: string): Promise<void> {
        const threshold:  number = parseInt(process.env.BOT_BLACKLIST_THRESHOLD   ?? '3',  10);
        const windowDays: number = parseInt(process.env.BOT_BLACKLIST_WINDOW_DAYS ?? '30', 10);

        const customer = await this.findOrCreate(phone);

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - windowDays);

        const recent: string[] = (customer.recent_cancels_json ?? [])
            .filter((d: string) => new Date(d) > cutoff);
        recent.push(new Date().toISOString());

        const shouldBlacklist: boolean = recent.length >= threshold;

        await pool.execute<ResultSetHeader>(
            `UPDATE bot_customer_history
             SET cancelled_orders    = cancelled_orders + 1,
                 recent_cancels_json = ?,
                 is_blacklisted      = IF(?, 1, is_blacklisted),
                 blacklist_reason    = IF(? AND blacklist_reason IS NULL, 'Cancelaciones repetidas', blacklist_reason),
                 blacklisted_at      = IF(? AND blacklisted_at IS NULL, NOW(), blacklisted_at)
             WHERE phone = ?`,
            [JSON.stringify(recent), shouldBlacklist, shouldBlacklist, shouldBlacklist, phone]
        );
    }

    async recordExpired(phone: string): Promise<void> {
        await pool.execute<ResultSetHeader>(
            `UPDATE bot_customer_history
             SET expired_sessions = expired_sessions + 1
             WHERE phone = ?`,
            [phone]
        );
    }
}