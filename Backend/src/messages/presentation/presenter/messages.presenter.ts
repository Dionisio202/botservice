import { WaMessage } from '@prisma/client';

export class MessagesPresenter {
    static toResponse(msg: WaMessage) {
        return {
            id:               msg.id,
            direction:        msg.direction,
            type:             msg.msg_type,
            content:          msg.content,
            status:           msg.status,
            created_at:       msg.created_at,
        };
    }

    static toList(messages: WaMessage[]) {
        return messages.map(this.toResponse);
    }
}