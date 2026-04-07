import { Injectable, Inject } from '@nestjs/common';
import type { IOrderRepository } from '../../../orders/domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';
import { normalizePhone } from '../../../orders/infrastructure/utils/phone.utils';

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
const ASESOR_MSG = `Un asesor revisará tu caso y se contactará contigo pronto 🌿`;

type Session = Awaited<ReturnType<IOrderRepository['findActivePendingByPhone']>> & object;

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
        const customer = await this.customerRepo.findByPhone(phone);

        if (customer?.is_blacklisted) return;

        const session = await this.orderRepo.findActivePendingByPhone(phone);

        if (!session) {
            await this.handleNoSession(phone, customer);
            return;
        }

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
            case 'awaiting_new_province':
                await this.handleNewProvince(session, input, phone);
                break;
            case 'awaiting_new_name':
                await this.handleNewName(session, input, phone);
                break;
            case 'awaiting_new_phone':
                await this.handleNewPhone(session, input, phone);
                break;
            case 'awaiting_new_quantity':
                await this.handleNewQuantity(session, input, phone);
                break;
            case 'awaiting_confirm_changes':
                await this.handleConfirmChanges(session, input, phone);
                break;
            case 'awaiting_review':
                await this.handleReview(session, input, phone);
                break;
        }
    }

    private async flagAndNotify(phone: string, orderId: number, reason: string): Promise<void> {
        await this.customerRepo.flagAgentReview(phone, reason);
        await this.whatsApp.sendText(phone, ASESOR_MSG);
    }

    private async incrementAndCheck(session: Session, phone: string, reason: string): Promise<boolean> {
        const count = (session!.unrecognized_count ?? 0) + 1;
        await this.orderRepo.incrementUnrecognized(session!.order_id);
        const limit = Number(process.env.BOT_UNRECOGNIZED_LIMIT ?? 3);
if (count >= limit) {
            await this.flagAndNotify(phone, session!.order_id, reason);
            return true;
        }
        return false;
    }

   private buildOrderFromSession(session: Session): WooOrderDto {
    const items = Array.isArray(session!.order_items)
        ? (session!.order_items as Array<{ name: string; quantity: number; price: string | number }>)
        : [];

    const changes = (session!.pending_changes ?? {}) as Record<string, unknown>;
    const firstName = String(changes['billing_first_name'] ?? '');

    return {
        id:         session!.order_id,
        total:      String(session!.order_total ?? ''),
        status:     'pending',
        billing:    { first_name: firstName, last_name: '', phone: session!.phone, city: '', state: '', address_1: '' },
        shipping:   { address_1: '', city: '', state: '' },
        line_items: items.map(i => ({ name: i.name, quantity: i.quantity, price: String(i.price) })),
    };
}

    private async handleNoSession(
        phone: string,
        customer: Awaited<ReturnType<ICustomerRepository['findByPhone']>> | null,
    ): Promise<void> {
        if (!customer) return;

        const lastSession = await this.orderRepo.findLastSessionByPhone(phone);
        if (!lastSession) return;

        if (lastSession.status === 'expired') {
            await this.whatsApp.sendText(
                phone,
                `Tu pedido #${lastSession.order_id} ya expiró ⏰.\nSi deseas realizar uno nuevo, visita nuestra tienda.`,
            );
            return;
        }

        if (lastSession.status === 'cancelled') {
            await this.whatsApp.sendText(
                phone,
                `Tu pedido #${lastSession.order_id} fue cancelado ❌.\nPuedes realizar un nuevo pedido cuando gustes 🌿`,
            );
            return;
        }
    }

    private async handleMainAction(session: Session, input: string, phone: string): Promise<void> {
        if (input === 'CONFIRM' || matches(input, CONFIRM_KW)) {
            await this.orderRepo.updateStatus(session!.order_id, 'confirmed');
            await this.customerRepo.recordConfirmed(phone);
            await this.whatsApp.sendText(phone, this.whatsApp.buildConfirmedMessage('', session!.order_id.toString()));

        } else if (input === 'MODIFY' || matches(input, MODIFY_KW)) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_modify_field');
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskWhatToModify(''));

        } else if (input === 'CANCEL' || matches(input, CANCEL_KW)) {
            await this.orderRepo.updateStatus(session!.order_id, 'cancelled');
            await this.customerRepo.recordCancelled(phone);
            await this.whatsApp.sendText(phone, this.whatsApp.buildCancelledMessage(''));

        } else {
            const silenced = await this.incrementAndCheck(session, phone, 'Mensajes no reconocidos en menú principal');
            if (silenced) return;
            await this.whatsApp.sendText(phone, this.whatsApp.buildUnrecognizedMessage());
        }
    }

    private async handleModifyField(session: Session, input: string, phone: string): Promise<void> {
        const n = normalize(input);

        if (n === '0') {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
            await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
            return;
        }

        if (n === '1' || n.includes('direcc') || n.includes('calle')) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_new_address');
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskNewAddress());

        } else if (n === '2' || n.includes('ciudad') || n.includes('city')) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_new_city');
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskNewCity());

        } else if (n === '3' || n.includes('provincia')) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_new_province');
            await this.whatsApp.sendText(phone, `¿Cuál es la provincia correcta? 📍\n\n*0* → Volver al menú`);

        } else if (n === '4' || n.includes('nombre')) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_new_name');
            await this.whatsApp.sendText(phone, `¿Cuál es el nombre completo del destinatario? 👤\n\n*0* → Volver al menú`);

        } else if (n === '5' || n.includes('telefono') || n.includes('celular') || n.includes('numero')) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_new_phone');
            await this.whatsApp.sendText(phone, `¿Cuál es el número de contacto? 📱\n\n*0* → Volver al menú`);

        } else if (n === '6' || n.includes('cantidad')) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_new_quantity');
            await this.whatsApp.sendText(phone, `¿Cuántas unidades deseas? 📦\n\n*0* → Volver al menú`);

        } else {
            const silenced = await this.incrementAndCheck(session, phone, 'Mensajes no reconocidos en menú de modificación');
            if (silenced) return;
            await this.whatsApp.sendText(
                phone,
                `No entendí 😊. Responde:\n\n*1* → Dirección\n*2* → Ciudad\n*3* → Provincia\n*4* → Nombre\n*5* → Teléfono\n*6* → Cantidad\n*0* → Volver al menú`,
            );
        }
    }

    private async handleNewAddress(session: Session, input: string, phone: string): Promise<void> {
        if (normalize(input) === '0') {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
            await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
            return;
        }
        if (input.trim().length < 5) {
            const silenced = await this.incrementAndCheck(session, phone, 'Dirección inválida repetida');
            if (silenced) return;
            await this.whatsApp.sendText(phone, `La dirección está incompleta 😊. Escríbeme la dirección completa.\n\n*0* → Volver al menú`);
            return;
        }
        const changes = { ...(session!.pending_changes ?? {}), address_1: input.trim() };
        await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);
        await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', this.buildOrderFromSession(session), changes));
    }

    private async handleNewCity(session: Session, input: string, phone: string): Promise<void> {
        if (normalize(input) === '0') {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
            await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
            return;
        }
        if (input.trim().length < 3) {
            const silenced = await this.incrementAndCheck(session, phone, 'Ciudad inválida repetida');
            if (silenced) return;
            await this.whatsApp.sendText(phone, `Escríbeme el nombre completo de la ciudad. 🏙️\n\n*0* → Volver al menú`);
            return;
        }
        const changes = { ...(session!.pending_changes ?? {}), city: input.trim() };
        await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);
        await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', this.buildOrderFromSession(session), changes));
    }

    private async handleNewProvince(session: Session, input: string, phone: string): Promise<void> {
        if (normalize(input) === '0') {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
            await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
            return;
        }
        const trimmed = input.trim();
        if (trimmed.length < 3 || /^\d+$/.test(trimmed)) {
            const silenced = await this.incrementAndCheck(session, phone, 'Provincia inválida repetida');
            if (silenced) return;
            await this.whatsApp.sendText(phone, `Escríbeme el nombre completo de la provincia. 📍\n\n*0* → Volver al menú`);
            return;
        }
        const changes = { ...(session!.pending_changes ?? {}), state: trimmed };
        await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);
        await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', this.buildOrderFromSession(session), changes));
    }

   private async handleNewName(session: Session, input: string, phone: string): Promise<void> {
    if (normalize(input) === '0') {
        await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
        await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
        return;
    }
    const trimmed = input.trim();
    if (trimmed.length < 3 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trimmed)) {
        const silenced = await this.incrementAndCheck(session, phone, 'Nombre inválido repetido');
        if (silenced) return;
        await this.whatsApp.sendText(phone, `Escríbeme el nombre completo solo con letras. 👤\n\n*0* → Volver al menú`);
        return;
    }
    const changes = { ...(session!.pending_changes ?? {}), billing_first_name: trimmed };
    await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);

    const updatedSession = { ...session, pending_changes: changes };
    await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', this.buildOrderFromSession(updatedSession as Session), changes));
}

   private async handleNewPhone(session: Session, input: string, phone: string): Promise<void> {
    if (normalize(input) === '0') {
        await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
        await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
        return;
    }
    try {
        const normalized = normalizePhone(input.trim());
        const changes = { ...(session!.pending_changes ?? {}), billing_phone: normalized };
        await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);

        const updatedSession = { ...session, pending_changes: changes };
        await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', this.buildOrderFromSession(updatedSession as Session), changes));
    } catch {
        const silenced = await this.incrementAndCheck(session, phone, 'Teléfono inválido repetido');
        if (silenced) return;
        await this.whatsApp.sendText(phone, `Ingresa un número válido de Ecuador. 📱\n\nEjemplo: 0991234567\n\n*0* → Volver al menú`);
    }
}

    private async handleNewQuantity(session: Session, input: string, phone: string): Promise<void> {
    if (normalize(input) === '0') {
        await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
        await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
        return;
    }
    const qty = parseInt(input.trim(), 10);
    if (isNaN(qty) || qty <= 0) {
        const silenced = await this.incrementAndCheck(session, phone, 'Cantidad inválida repetida');
        if (silenced) return;
        await this.whatsApp.sendText(phone, `Ingresa un número válido mayor a 0. 📦\n\n*0* → Volver al menú`);
        return;
    }

    const items = Array.isArray(session!.order_items)
        ? (session!.order_items as Array<{ name: string; quantity: number; price: number; subtotal: string; total: string; [key: string]: unknown }>)
        : [];

    const updatedItems = items.map(item => ({
        ...item,
        quantity: qty,
        subtotal: String(Number(item.price) * qty),
        total:    String(Number(item.price) * qty),
    }));

    const newTotal = updatedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    await this.orderRepo.updateOrderItems(session!.order_id, updatedItems, newTotal);

    const changes = { ...(session!.pending_changes ?? {}) };
    delete (changes as Record<string, unknown>)['quantity'];

    await this.orderRepo.updateConvStep(session!.order_id, 'awaiting_confirm_changes', changes);

    const updatedSession = { ...session, order_items: updatedItems, order_total: newTotal };
    await this.whatsApp.sendText(phone, this.whatsApp.buildChangeSummary('', this.buildOrderFromSession(updatedSession as Session), changes));
}

    private async handleConfirmChanges(session: Session, input: string, phone: string): Promise<void> {
        if (normalize(input) === '0') {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
            await this.whatsApp.sendText(phone, this.whatsApp.buildMainMenu(''));
            return;
        }
     if (matches(input, YES_KW)) {
    await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_action');
    await this.whatsApp.sendText(phone, 
        `✅ Cambios guardados.\n\n` + this.whatsApp.buildMainMenu('')
    );
}else if (matches(input, NO_KW)) {
            await this.orderRepo.updateConvStepOnly(session!.order_id, 'awaiting_modify_field');
            await this.whatsApp.sendText(phone, this.whatsApp.buildAskWhatToModify(''));

        } else {
            const silenced = await this.incrementAndCheck(session, phone, 'Mensajes no reconocidos en confirmación de cambios');
            if (silenced) return;
            await this.whatsApp.sendText(phone, `Responde *SÍ* para confirmar los cambios o *NO* para corregirlos. 😊\n\n*0* → Volver al menú`);
        }
    }

    private async handleReview(session: Session, input: string, phone: string): Promise<void> {
        const rating = parseInt(input.trim(), 10);

        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            await this.orderRepo.saveRating(session!.order_id, rating);
            await this.whatsApp.sendText(
                phone,
                `¡Gracias por tu calificación! ${'⭐'.repeat(rating)}\nTu opinión nos ayuda a mejorar 🌿`,
            );
            return;
        }

        const silenced = await this.incrementAndCheck(session, phone, 'No respondió review post-entrega');
        if (silenced) return;
        await this.whatsApp.sendText(phone, `Califica tu experiencia del *1* al *5* ⭐`);
    }
}