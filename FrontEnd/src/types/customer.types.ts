export interface Customer {
    id:                  number;
    phone:               string;
    customer_name:       string | null;
    total_orders:        number;
    confirmed_orders:    number;
    cancelled_orders:    number;
    lost_orders:         number;
    expired_sessions:    number;
    total_lost_amount:   string;
    is_blacklisted:      boolean;
    blacklist_reason:    string | null;
    blacklisted_at:      string | null;
    risk_score:          number;
    customer_tier:       string;
    needs_agent_review:  boolean;
    agent_review_reason: string | null;
    manually_trusted:    boolean;
    first_order_at:      string;
    last_order_at:       string;
}

export interface CustomerListResponse {
    data:       Customer[];
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
}

export interface CustomerFilters {
    page?:   number;
    limit?:  number;
    phone?:  string;
    name?:   string;
    tier?:   string;
    status?: string;
    from?:   string;
    to?:     string;
}