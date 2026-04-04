export class Customer {
    constructor(
        public readonly id:                  number,
        public readonly phone:               string,
        public readonly customer_name:       string | null,
        public readonly lost_orders:         number,
        public readonly cancelled_orders:    number,
        public readonly is_blacklisted:      boolean,
        public readonly total_lost_amount:   number,
        public readonly confirmed_orders:    number,
        public readonly expired_sessions:    number,
        public readonly customer_tier:       string,
        public readonly manually_trusted:    boolean,
    ) {}

    isRisky(): boolean       { return this.lost_orders >= 3; }
    canOrder(): boolean      { return !this.is_blacklisted; }
    isBlacklisted(): boolean { return this.is_blacklisted; }
}