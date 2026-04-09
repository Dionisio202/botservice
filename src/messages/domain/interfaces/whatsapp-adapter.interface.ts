import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';

export interface IWhatsAppAdapter {
    sendConfirmationTemplate(order: WooOrderDto, phone: string): Promise<string>;
    sendText(phone: string, text: string): Promise<void>;
    buildConfirmedMessage(firstName: string, orderId: string): string;
    buildCancelledMessage(firstName: string): string;
    buildRetryMessage(firstName: string, order: WooOrderDto): string;
    buildAskWhatToModify(firstName: string): string;
    buildAskNewAddress(): string;
    buildAskNewCity(): string;
    buildAskSelectProduct(items: Array<{ name: string; quantity: number }>): string;
    buildChangeSummary(firstName: string, order: WooOrderDto, changes: Record<string, unknown>): string;
    buildUnrecognizedMessage(): string;
    buildBlockedMessage(): string;
    buildMainMenu(firstName: string): string;
    sendMedia(phone: string, mediaUrl: string, type: 'image' | 'document', caption?: string): Promise<void>;
    downloadMedia(mediaId: string): Promise<string>;
}