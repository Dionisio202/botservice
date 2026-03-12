import { Request } from 'express';

// ── WooCommerce DTOs (los que ya tenías) ──────────────────────────────────────

export interface OrderLineItemDto {
    name:     string;
    quantity: number;
    total:    string; // WooCommerce envía los subtotales como string
}

export interface OrderDto {
    id:    number;
    total: string; // WooCommerce envía el total final como string (ej. "330.00")
    billing: {
        first_name: string;
        last_name:  string;
        phone:      string;
        email:      string;
    };
    shipping: {
        address_1: string;
        address_2: string; // A veces el cliente pone referencias aquí
        city:      string;
        state:     string; // Provincia o estado
        country:   string;
    };
    line_items: OrderLineItemDto[];
}

// ── Tipos del Bot ─────────────────────────────────────────────────────────────

export type SessionStatus =
    | 'pending'
    | 'confirmed'
    | 'modified'
    | 'cancelled'
    | 'expired'
    | 'blocked';

export type ConvStep =
    | 'awaiting_action'
    | 'awaiting_modify_field'
    | 'awaiting_new_address'
    | 'awaiting_new_city'
    | 'awaiting_confirm_changes';

export interface BotOrderSession {
    id:                number;
    order_id:          number;
    phone:             string;
    status:            SessionStatus;
    attempts:          number;
    max_attempts:      number;
    next_retry_at:     Date | null;
    retry_delay_hours: number;
    conv_step:         ConvStep;
    pending_changes:   Record<string, string> | null;
    wa_message_id:     string | null;
    created_at:        Date;
    updated_at:        Date;
}

export interface BotCustomerHistory {
    id:                  number;
    phone:               string;
    total_orders:        number;
    confirmed_orders:    number;
    cancelled_orders:    number;
    expired_sessions:    number;
    is_blacklisted:      boolean;
    blacklist_reason:    string | null;
    blacklisted_at:      Date | null;
    recent_cancels_json: string[] | null;
    first_order_at:      Date;
    last_order_at:       Date;
}

// ── Request extendido para HMAC de WooCommerce ────────────────────────────────

export interface RawBodyRequest extends Request {
    rawBody?: Buffer;
}