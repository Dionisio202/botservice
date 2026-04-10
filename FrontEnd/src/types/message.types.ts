export interface Message {
    id:         number;
    direction:  'inbound' | 'outbound';
    content:    string;
    msg_type:   string;
    created_at: string;
    media_url:  string | null;
    media_type: string | null;
}

export interface SendMessageDto {
    session_id:   number;
    customer_id:  number;
    phone:        string;
    content:      string;
}