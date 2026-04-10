import { Injectable, Inject } from '@nestjs/common';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';
import { normalizePhone } from '../../../orders/infrastructure/utils/phone.utils';

interface SendMediaInput {
    phone:      string;
    customerId: number;
    sessionId?: number;
    caption?:   string;
    filePath:   string;
    filename:   string;
    mimetype:   string;
    agentId:    number;
}

@Injectable()
export class SendMediaUseCase {
    constructor(
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
    ) {}

    async execute(input: SendMediaInput): Promise<void> {
        const normalized = normalizePhone(input.phone);
        const publicUrl  = `${process.env.MEDIA_PUBLIC_URL ?? 'https://botecu.ecuentrega.com/media'}/${input.filename}`;
        const mediaType  = input.mimetype === 'application/pdf' ? 'document' : 'image';

        await this.whatsApp.sendMedia(normalized, publicUrl, mediaType, input.caption);

        await this.messageRepo.create({
            customer_id:      input.customerId,
            order_session_id: input.sessionId,
            direction:        'outbound',
            msg_type:         'media',
            content:          input.caption ?? input.filename,
            sent_by:          input.agentId,
            media_url:        publicUrl,
            media_type:       mediaType,
        });
    }
}