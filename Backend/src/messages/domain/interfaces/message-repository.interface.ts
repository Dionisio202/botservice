import { Message } from '../entities/message.entity';
import { Direction, MessageType } from '../entities/message.entity';

export interface IMessageRepository {
    create(data: CreateMessageData): Promise<Message>;
    findByOrderSession(orderSessionId: number): Promise<Message[]>;
    findExpiredWithMedia(): Promise<{ media_url: string | null }[]>;
    deleteExpired(): Promise<number>;
}

export interface CreateMessageData {
    customer_id:      number;
    order_session_id?: number;
    wa_message_id?:   string;
    direction:        Direction;
    msg_type:         MessageType;
    content:          string;
    template_id?:     number;
    sent_by?:         number;
    media_url?:       string;
    media_type?:      'image' | 'document' | 'video';
}