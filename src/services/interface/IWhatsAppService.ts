import { OrderDto } from '../../shared/dtos';

export interface IWhatsAppService {
    sendConfirmationTemplate(order: OrderDto): Promise<string>;
    sendText(phone: string, text: string): Promise<void>;

    // Builders de mensajes (sin estado, sin IA)
    buildAskWhatToModify(firstName: string): string;
    buildAskNewAddress(): string;
    buildAskNewCity(): string;
    buildChangeSummary(firstName: string, order: OrderDto, changes: Record<string, string>): string;
    buildConfirmedMessage(firstName: string, city: string): string;
    buildCancelledMessage(firstName: string): string;
    buildRetryMessage(firstName: string, order: OrderDto): string;
    buildBlockedMessage(): string;
    buildTooManyPendingMessage(firstName: string): string;
    buildUnrecognizedMessage(): string;
}