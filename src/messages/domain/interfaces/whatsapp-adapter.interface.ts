import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';

export interface IWhatsAppAdapter {
    sendConfirmationTemplate(order: WooOrderDto, phone: string): Promise<string>;
    sendText(phone: string, text: string): Promise<void>;
    buildConfirmedMessage(firstName: string, city: string): string;
    buildCancelledMessage(firstName: string): string;
    buildRetryMessage(firstName: string, order: WooOrderDto): string;
    buildAskWhatToModify(firstName: string): string;
    buildAskNewAddress(): string;
    buildAskNewCity(): string;
    buildChangeSummary(firstName: string, order: WooOrderDto, changes: Record<string, string>): string;
    buildUnrecognizedMessage(): string;
    buildBlockedMessage(): string;
}