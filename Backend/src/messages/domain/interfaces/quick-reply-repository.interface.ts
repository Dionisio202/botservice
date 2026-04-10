import { QuickReply } from '../entities/quick-reply.entity';

export interface IQuickReplyRepository {
    findAll(): Promise<QuickReply[]>;
    findActive(): Promise<QuickReply[]>;
    create(data: CreateQuickReplyData): Promise<QuickReply>;
    update(id: number, data: Partial<CreateQuickReplyData>): Promise<QuickReply>;
    delete(id: number): Promise<void>;
}

export interface CreateQuickReplyData {
    title:      string;
    content:    string;
    category?:  string;
    created_by?: number;
}