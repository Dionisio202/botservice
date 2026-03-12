import { IWhatsAppService } from '../interface/IWhatsAppService';
import { OrderDto } from '../../shared/dtos';

interface MetaApiResponse {
    messages: Array<{ id: string }>;
}

interface MetaTextPayload {
    messaging_product: 'whatsapp';
    to:   string;
    type: 'text';
    text: { body: string; preview_url: boolean };
}

interface MetaTemplatePayload {
    messaging_product: 'whatsapp';
    to:   string;
    type: 'template';
    template: {
        name:       string;
        language:   { code: string };
        components: unknown[];
    };
}

export function normalizePhone(phone: string): string {
    let digits: string = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
        digits = '593' + digits.slice(1);
    }
    return digits;
}

export class WhatsAppService implements IWhatsAppService {

    private get url(): string {
        return `https://graph.facebook.com/v22.0/${process.env.META_PHONE_ID}/messages`;
    }
    private get token(): string  { return process.env.META_WHATSAPP_TOKEN ?? ''; }
    private get agent(): string  { return process.env.BOT_AGENT_NAME ?? 'Camila'; }
    private get store(): string  { return process.env.STORE_NAME     ?? 'Nuestra tienda'; }
    private get emoji(): string  { return process.env.STORE_EMOJI    ?? '🌿'; }

    private async post<T>(payload: MetaTextPayload | MetaTemplatePayload): Promise<T> {
        const res = await fetch(this.url, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${this.token}`,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err: string = await res.text();
            throw new Error(`Meta API ${res.status}: ${err}`);
        }
        return res.json() as Promise<T>;
    }

    async sendConfirmationTemplate(order: OrderDto): Promise<string> {
        const phone: string = normalizePhone(order.billing.phone);
        const productList: string = order.line_items
            .map((i) => `• ${i.name} x${i.quantity}`)
            .join('\n');

        const data = await this.post<MetaApiResponse>({
            messaging_product: 'whatsapp',
            to:   phone,
            type: 'template',
            template: {
                name:     process.env.WA_TEMPLATE_NAME     ?? 'confirmar_pedido',
                language: { code: process.env.WA_TEMPLATE_LANGUAGE ?? 'es_MX' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: order.billing.first_name },           // {{1}}
                            { type: 'text', text: this.agent },                          // {{2}}
                            { type: 'text', text: this.store },                          // {{3}}
                            { type: 'text', text: String(order.id) },                    // {{4}}
                            { type: 'text', text: productList },                         // {{5}}
                            { type: 'text', text: `$${order.total}` },                  // {{6}}
                            { type: 'text', text: `${order.shipping.city} - ${order.shipping.address_1}` }, // {{7}}
                        ],
                    },
                    { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'CONFIRM' }] },
                    { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'MODIFY'  }] },
                    { type: 'button', sub_type: 'quick_reply', index: '2', parameters: [{ type: 'payload', payload: 'CANCEL'  }] },
                ],
            },
        });
        return data.messages[0]?.id ?? '';
    }

    async sendText(phone: string, text: string): Promise<void> {
        await this.post<MetaApiResponse>({
            messaging_product: 'whatsapp',
            to:   normalizePhone(phone),
            type: 'text',
            text: { body: text, preview_url: false },
        });
    }

    // ── Builders de mensajes (sin IA, costo $0) ───────────────────────────────

    buildAskWhatToModify(firstName: string): string {
        return (
            `Claro, ${firstName}. 😊 ¿Qué dato deseas modificar?\n\n` +
            `*1* → Dirección de entrega\n` +
            `*2* → Ciudad\n\n` +
            `Responde con *1* o *2*.`
        );
    }

    buildAskNewAddress(): string {
        return `Por favor, escríbeme la nueva dirección completa de entrega. 📍`;
    }

    buildAskNewCity(): string {
        return `Por favor, escríbeme la nueva ciudad de entrega. 🏙️`;
    }

    buildChangeSummary(firstName: string, order: OrderDto, changes: Record<string, string>): string {
        const addr:  string = changes['address_1'] ?? order.shipping.address_1;
        const city:  string = changes['city']      ?? order.shipping.city;
        const prods: string = order.line_items.map((i) => `${i.quantity} x ${i.name}`).join(', ');

        return (
            `Gracias, ${firstName}. Aquí está el resumen actualizado:\n\n` +
            `👤 *Nombre:* ${firstName} ${order.billing.last_name}\n` +
            `📦 *Productos:* ${prods}\n` +
            `💵 *Total:* $${order.total}\n` +
            `🏙️ *Ciudad:* ${city}\n` +
            `📍 *Dirección:* ${addr}\n` +
            `📱 *Contacto:* +${normalizePhone(order.billing.phone)}\n\n` +
            `¿Confirmas que los datos son correctos? Responde *SÍ* o *NO*.`
        );
    }

    buildConfirmedMessage(firstName: string, city: string): string {
        return (
            `¡🎉 ${firstName}, gracias por confirmar tu pedido!\n\n` +
            `La entrega para *${city}* toma entre 1 y 5 días hábiles. ` +
            `Cuando se genere la guía 🚚 te la compartiremos 📦.\n\n` +
            `Ten el pago listo para el mensajero. ` +
            `Agradecemos tu confianza en *${this.store}* ${this.emoji}`
        );
    }

    buildCancelledMessage(firstName: string): string {
        return (
            `Hemos cancelado tu pedido, ${firstName}. 😔\n\n` +
            `Si fue un error, puedes realizar un nuevo pedido. ` +
            `¡Esperamos verte pronto en *${this.store}*! 🙏`
        );
    }

    buildRetryMessage(firstName: string, order: OrderDto): string {
        const prods: string = order.line_items.map((i) => `${i.quantity} x ${i.name}`).join(', ');
        return (
            `Hola ${firstName} 👋, soy ${this.agent} de *${this.store}*.\n\n` +
            `Te recordamos que tienes un pedido pendiente:\n\n` +
            `📦 *Pedido #${order.id}:* ${prods}\n` +
            `💵 *Total:* $${order.total}\n\n` +
            `Responde *CONFIRMAR*, *MODIFICAR* o *CANCELAR*.`
        );
    }

    buildBlockedMessage(): string {
        return (
            `Lo sentimos, no podemos procesar tu pedido en este momento. ` +
            `Por favor comunícate con nosotros directamente.`
        );
    }

    buildTooManyPendingMessage(firstName: string): string {
        const max: string = process.env.BOT_MAX_PENDING_PER_CUSTOMER ?? '2';
        return (
            `Hola ${firstName}, ya tienes ${max} pedidos pendientes de confirmar. ` +
            `Por favor confirma o cancela tus pedidos anteriores antes de continuar.`
        );
    }

    buildUnrecognizedMessage(): string {
        return (
            `No entendí tu respuesta 😊. Por favor responde:\n\n` +
            `✅ *CONFIRMAR* para aceptar\n` +
            `✏️ *MODIFICAR* para cambiar datos de envío\n` +
            `❌ *CANCELAR* para cancelar`
        );
    }
}