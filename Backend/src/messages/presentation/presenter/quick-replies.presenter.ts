import { QuickReply } from '../../domain/entities/quick-reply.entity';

export class QuickRepliesPresenter {
    static toResponse(qr: QuickReply) {
        return {
            id:       qr.id,
            title:    qr.title,
            content:  qr.content,
            category: qr.category,
            active:   qr.is_active,
        };
    }

    static toList(qrs: QuickReply[]) {
        return qrs.map(this.toResponse);
    }
}