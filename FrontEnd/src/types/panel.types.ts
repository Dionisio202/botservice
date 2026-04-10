export interface ReviewCustomer {
    id:                  number;
    phone:               string;
    customer_name:       string | null;
    agent_review_reason: string | null;
    risk_score:          number;
    customer_tier:       string;
    cancelled_orders:    number;
    lost_orders:         number;
    last_order_at:       string;
    order_sessions:      {
        order_id:    number;
        order_items: unknown;
        order_total: string | null;
        status:      string;
        created_at:  string;
    }[];
}

export interface DashboardData {
    customers: {
        total:              number;
        blacklisted:        number;
        needs_agent_review: number;
    };
    orders: {
        pending:   number;
        confirmed: number;
        cancelled: number;
    };
    total_lost_amount: number;
    review_list:       ReviewCustomer[];
}

export interface ReviewListResponse {
    data:       ReviewCustomer[];
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
}

export interface ConversationSession {
    id:                 number;
    order_id:           number;
    customer_name:      string | null;
    order_total:        string | null;
    order_items:        unknown;
    status:             string;
    conv_step:          string;
    attempts:           number;
    created_at:         string;
    updated_at:         string;
    pending_changes:    unknown;
    unrecognized_count: number;
    customer: {
        id:                 number;
        phone:              string;
        customer_name:      string | null;
        customer_tier:      string;
        risk_score:         number;
        needs_agent_review: boolean;
        is_blacklisted:     boolean;
    };
    messages: {
        id:         number;
        direction:  string;
        content:    string;
        msg_type:   string;
        created_at: string;
        media_url:  string | null;
        media_type: string | null;
    }[];
}

export interface ConversationListResponse {
    data:       ConversationSession[];
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
}
export type { Message } from '@/types/message.types';