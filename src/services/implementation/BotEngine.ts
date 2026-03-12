import { IBotEngine }                from '../interface/IBotEngine';
import { IWhatsAppService }          from '../interface/IWhatsAppService';
import { IWooCommerceService }       from '../interface/IWooCommerceService';
import { IBotSessionRepository }     from '../../repositories/interface/IBotSessionRepository';
import { ICustomerHistoryRepository} from '../../repositories/interface/ICustomerHistoryRepository';
import { BotOrderSession, OrderDto } from '../../shared/dtos';

function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function matches(text: string, keywords: readonly string[]): boolean {
    const n = normalize(text);
    return keywords.some((k) => n.includes(k));
}

const CONFIRM_KW = ['confirmar', 'confirmo', 'confirm', 'si', 'ok', 'dale', 'listo', 'acepto', 'yes', 'di'] as const;
const MODIFY_KW  = ['modificar', 'modifico', 'cambiar', 'cambio', 'editar', 'actualizar']                   as const;
const CANCEL_KW  = ['cancelar', 'cancelo', 'cancel', 'no quiero', 'anular']                                 as const;
const YES_KW     = ['si', 'ok', 'dale', 'listo', 'correcto', 'yes', 'di', 'confirmo', 'confirmar']          as const;
const NO_KW      = ['no', 'nope', 'negativo']                                                                as const;

export class BotEngine implements IBotEngine {

    constructor(
        private readonly sessionRepo:     IBotSessionRepository,
        private readonly customerRepo:    ICustomerHistoryRepository,
        private readonly whatsAppService: IWhatsAppService,
        private readonly wooService:      IWooCommerceService
    ) {}

    async processIncomingMessage(
        phone:          string,
        text:           string,
        buttonPayload?: string
    ): Promise<void> {

        const session: BotOrderSession | null =
            await this.sessionRepo.findActivePendingByPhone(phone);

        if (!session) {
            console.log(`[BotEngine] Sin sesión activa para ${phone}. Ignorado.`);
            return;
        }

        const order:      OrderDto = await this.wooService.getOrder(session.order_id);
        const firstName:  string   = order.billing.first_name;
        const input:      string   = buttonPayload ?? text;

        console.log(`[BotEngine] Orden #${session.order_id} | step: ${session.conv_step} | input: "${input}"`);

        switch (session.conv_step) {
            case 'awaiting_action':
                await this.handleMainAction(session, order, input, firstName, phone);
                break;
            case 'awaiting_modify_field':
                await this.handleModifyField(session, order, input, firstName, phone);
                break;
            case 'awaiting_new_address':
                await this.handleNewAddress(session, order, input, firstName, phone);
                break;
            case 'awaiting_new_city':
                await this.handleNewCity(session, order, input, firstName, phone);
                break;
            case 'awaiting_confirm_changes':
                await this.handleConfirmChanges(session, order, input, firstName, phone);
                break;
        }
    }

    private async handleMainAction(
        session:   BotOrderSession,
        order:     OrderDto,
        input:     string,
        firstName: string,
        phone:     string
    ): Promise<void> {

        if (input === 'CONFIRM' || matches(input, CONFIRM_KW)) {
            await this.wooService.setOrderProcessing(order.id);
            await this.wooService.addOrderNote(order.id, 'Pedido confirmado por cliente vía WhatsApp.');
            await this.sessionRepo.updateStatus(order.id, 'confirmed');
            await this.customerRepo.recordConfirmed(phone);
            await this.whatsAppService.sendText(
                phone,
                this.whatsAppService.buildConfirmedMessage(firstName, order.shipping.city)
            );

        } else if (input === 'MODIFY' || matches(input, MODIFY_KW)) {
            await this.sessionRepo.updateConvStep(order.id, 'awaiting_modify_field', {});
            await this.whatsAppService.sendText(
                phone,
                this.whatsAppService.buildAskWhatToModify(firstName)
            );

        } else if (input === 'CANCEL' || matches(input, CANCEL_KW)) {
            await this.wooService.setOrderCancelled(order.id);
            await this.wooService.addOrderNote(order.id, 'Pedido cancelado por cliente vía WhatsApp.');
            await this.sessionRepo.updateStatus(order.id, 'cancelled');
            await this.customerRepo.recordCancelled(phone);
            await this.whatsAppService.sendText(
                phone,
                this.whatsAppService.buildCancelledMessage(firstName)
            );

        } else {
            await this.whatsAppService.sendText(
                phone,
                this.whatsAppService.buildUnrecognizedMessage()
            );
        }
    }

    private async handleModifyField(
        session:   BotOrderSession,
        order:     OrderDto,
        input:     string,
        firstName: string,
        phone:     string
    ): Promise<void> {
        const n = normalize(input);

        if (n === '1' || n.includes('direcc') || n.includes('calle')) {
            await this.sessionRepo.updateConvStep(order.id, 'awaiting_new_address', session.pending_changes ?? {});
            await this.whatsAppService.sendText(phone, this.whatsAppService.buildAskNewAddress());

        } else if (n === '2' || n.includes('ciudad') || n.includes('city')) {
            await this.sessionRepo.updateConvStep(order.id, 'awaiting_new_city', session.pending_changes ?? {});
            await this.whatsAppService.sendText(phone, this.whatsAppService.buildAskNewCity());

        } else {
            await this.whatsAppService.sendText(
                phone,
                `No entendí 😊. Responde:\n\n*1* → Cambiar dirección\n*2* → Cambiar ciudad`
            );
        }
    }

    private async handleNewAddress(
        session:   BotOrderSession,
        order:     OrderDto,
        input:     string,
        firstName: string,
        phone:     string
    ): Promise<void> {
        if (input.trim().length < 5) {
            await this.whatsAppService.sendText(
                phone,
                `La dirección está incompleta 😊. Escríbeme la dirección completa (calle, número, referencia).`
            );
            return;
        }
        const changes: Record<string, string> = {
            ...(session.pending_changes ?? {}),
            address_1: input.trim(),
        };
        await this.sessionRepo.updateConvStep(order.id, 'awaiting_confirm_changes', changes);
        await this.whatsAppService.sendText(
            phone,
            this.whatsAppService.buildChangeSummary(firstName, order, changes)
        );
    }

    private async handleNewCity(
        session:   BotOrderSession,
        order:     OrderDto,
        input:     string,
        firstName: string,
        phone:     string
    ): Promise<void> {
        if (input.trim().length < 3) {
            await this.whatsAppService.sendText(phone, `Escríbeme el nombre completo de la ciudad. 🏙️`);
            return;
        }
        const changes: Record<string, string> = {
            ...(session.pending_changes ?? {}),
            city: input.trim(),
        };
        await this.sessionRepo.updateConvStep(order.id, 'awaiting_confirm_changes', changes);
        await this.whatsAppService.sendText(
            phone,
            this.whatsAppService.buildChangeSummary(firstName, order, changes)
        );
    }

    private async handleConfirmChanges(
        session:   BotOrderSession,
        order:     OrderDto,
        input:     string,
        firstName: string,
        phone:     string
    ): Promise<void> {
        if (matches(input, YES_KW)) {
            const changes: Record<string, string> = session.pending_changes ?? {};

            await this.wooService.updateShipping(order.id, {
                address_1: changes['address_1'],
                city:      changes['city'],
            });
            await this.wooService.addOrderNote(
                order.id,
                `Envío modificado vía WhatsApp: ${JSON.stringify(changes)}`
            );
            await this.wooService.setOrderProcessing(order.id);
            await this.sessionRepo.updateStatus(order.id, 'modified');
            await this.customerRepo.recordConfirmed(phone);

            const city: string = changes['city'] ?? order.shipping.city;
            await this.whatsAppService.sendText(
                phone,
                this.whatsAppService.buildConfirmedMessage(firstName, city)
            );

        } else if (matches(input, NO_KW)) {
            await this.sessionRepo.updateConvStep(order.id, 'awaiting_modify_field', {});
            await this.whatsAppService.sendText(
                phone,
                this.whatsAppService.buildAskWhatToModify(firstName)
            );

        } else {
            await this.whatsAppService.sendText(
                phone,
                `Responde *SÍ* para confirmar los cambios o *NO* para corregirlos. 😊`
            );
        }
    }
}