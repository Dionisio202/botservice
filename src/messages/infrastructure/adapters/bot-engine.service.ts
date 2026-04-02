import { Injectable, Inject } from '@nestjs/common';
import type { IOrderRepository } from '../../../orders/domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matches(text: string, keywords: readonly string[]): boolean {
    const n = normalize(text);
    return keywords.some((k) => n.includes(k));
}

const CONFIRM_KW = ['confirmar', 'confirmo', 'confirm', 'si', 'ok', 'dale', 'listo', 'acepto', 'yes'] as const;
const MODIFY_KW  = ['modificar', 'modifico', 'cambiar', 'cambio', 'editar', 'actualizar']              as const;
const CANCEL_KW  = ['cancelar', 'cancelo', 'cancel', 'no quiero', 'anular']                            as const;
const YES_KW     = ['si', 'ok', 'dale', 'listo', 'correcto', 'yes', 'confirmo', 'confirmar']           as const;
const NO_KW      = ['no', 'nope', 'negativo']                                                           as const;

@Injectable()
export class BotEngineService {
    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo: IOrderRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
        @Inject('IWhatsAppAdapter')
        private readonly whatsApp: IWhatsAppAdapter,
    ) {}

    async processIncomingMessage(phone: string, text: string, buttonPayload?: string): Promise<void> {
        const session = await this.orderRepo.findActivePendingByPhone(phone);
        if (!session) return;

        const input = buttonPayload ?? text;

        switch (session.conv_step) {
            case 'awaiting_action':
                await this.handleMainAction(session, input, phone);
                break;
            case 'awaiting_modify_field':
                await this.handleModifyField(session, input, phone);
                break;
            case 'awaiting_new_address':
                await this.handleNewAddress(session, input, phone);
                break;
            case 'awaiting_new_city':
                await this.handleNewCity(session, input, phone);
                break;
            case 'awaiting_confirm_changes':
                await this.handleConfirmChanges(session, input, phone);
                break;
        }
    }

    private async handleMainAction(
        session: Awaited<ReturnType<IOrderRepository['findActivePendingByPhone']>> & object,
        input:   string,
        phone:   string,
    ): Promise<void> {
        if (input === 'CONFIRM' || matches(input, CONFIRM_KW)) {
            await this.orderRepo.updateStatus(session!.order_id, 'confirmed');
            await this.customerRepo.recordConfirmed(phone);
            await this.whatsApp.sendText(phone, this.whatsApp.buildConfirmedMessage('', session!.order_id.toString()));

        } else if (input === 'MODIFY' || matches(input, MODIFY_KW)) {
            await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_modify_field', {});
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskWhatToModify(''));

        } else if (input === 'CANCEL' || matches(input, CANCEL_KW)) {
            await this.orderRepo.updateStatus(session!.order_id, 'cancelled');
            await this.customerRepo.recordCancelled(phone);
            await this.whatsApp.sendText(phone, this.whatsApp.buildCancelledMessage(''));

        } else {
            await this.whatsApp.sendText(phone, this.whatsApp.buildUnrecognizedMessage());
        }
    }

    private async handleModifyField(
        session: Awaited<ReturnType<IOrderRepository['findActivePendingByPhone']>> & object,
        input:   string,
        phone:   string,
    ): Promise<void> {
        const n = normalize(input);

        if (n === '1' || n.includes('direcc') || n.includes('calle')) {
            await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_new_address', session!.pending_changes ?? {});
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskNewAddress());

        } else if (n === '2' || n.includes('ciudad') || n.includes('city')) {
            await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_new_city', session!.pending_changes ?? {});
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskNewCity());

        } else {
            await this.whatsApp.sendText(phone, `No entendí 😊. Responde:\n\n*1* → Cambiar dirección\n*2* → Cambiar ciudad`);
        }
    }

    private async handleNewAddress(
        session: Awaited<ReturnType<IOrderRepository['findActivePendingByPhone']>> & object,
        input:   string,
        phone:   string,
    ): Promise<void> {
        if (input.trim().length < 5) {
            await this.whatsApp.sendText(phone, `La dirección está incompleta 😊. Escríbeme la dirección completa.`);
            return;
        }
        const changes = { ...(session!.pending_changes ?? {}), address_1: input.trim() };
        await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);
        await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', {} as WooOrderDto, changes));
    }

    private async handleNewCity(
        session: Awaited<ReturnType<IOrderRepository['findActivePendingByPhone']>> & object,
        input:   string,
        phone:   string,
    ): Promise<void> {
        if (input.trim().length < 3) {
            await this.whatsApp.sendText(phone, `Escríbeme el nombre completo de la ciudad. 🏙️`);
            return;
        }
        const changes = { ...(session!.pending_changes ?? {}), city: input.trim() };
        await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);
        await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', {} as WooOrderDto, changes));
    }

    private async handleConfirmChanges(
        session: Awaited<ReturnType<IOrderRepository['findActivePendingByPhone']>> & object,
        input:   string,
        phone:   string,
    ): Promise<void> {
        if (matches(input, YES_KW)) {
            await this.orderRepo.updateStatus(session!.order_id, 'confirmed');
            await this.customerRepo.recordConfirmed(phone);
            const city = session!.pending_changes?.['city'] ?? '';
            await this.whatsApp.sendText(phone, this.whatsApp.buildConfirmedMessage('', city));

        } else if (matches(input, NO_KW)) {
            await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_modify_field', {});
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskWhatToModify(''));

        } else {
            await this.whatsApp.sendText(phone, `Responde *SÍ* para confirmar los cambios o *NO* para corregirlos. 😊`);
        }
    }
}