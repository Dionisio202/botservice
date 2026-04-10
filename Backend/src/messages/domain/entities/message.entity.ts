export type Direction   = 'inbound' | 'outbound';
export type MessageType = 'text' | 'template' | 'interactive' | 'media';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export class Message {
    constructor(
        public readonly id:           number,
        public readonly customer_id:  number,
        public readonly direction:    Direction,
        public readonly msg_type:     MessageType,
        public readonly content:      string,
        public readonly status:       MessageStatus,
        public readonly expires_at:   Date,
        public readonly created_at:   Date,
    ) {}

    isInbound():  boolean { return this.direction === 'inbound'; }
    isOutbound(): boolean { return this.direction === 'outbound'; }
    isExpired():  boolean { return new Date() > this.expires_at; }
}