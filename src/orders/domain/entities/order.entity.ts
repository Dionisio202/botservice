export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'lost' | 'expired';
export type ConvStep = 'awaiting_action' | 'awaiting_modify_field' | 'awaiting_new_address' | 'awaiting_new_city' | 'awaiting_confirm_changes' | 'done';

export class Order {
    constructor(
        public readonly id:           number,
        public readonly order_id:     number,
        public readonly order_total:  number,
        public readonly status:       OrderStatus,
        public readonly conv_step:    ConvStep,
        public readonly attempts:     number,
        public readonly max_attempts: number,
    ) {}

    isExpired(): boolean { return this.attempts >= this.max_attempts; }
    isPending(): boolean { return this.status === 'pending'; }
    canRetry(): boolean  { return this.attempts < this.max_attempts; }
    isLost(): boolean    { return this.status === 'lost'; }
}