export class OrderCreatedEvent {
    constructor(
        public readonly orderId:     number,
        public readonly customerId:  number,
        public readonly sessionId:   number,
        public readonly wooOrder:    unknown,
    ) {}
}