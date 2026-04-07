import { Injectable } from '@nestjs/common';
import type { IWhatsAppAdapter } from '../../domain/interfaces/whatsapp-adapter.interface';
import type { WooOrderDto } from '../../../orders/application/dtos/order.dto';
import { normalizePhone } from '../../../orders/infrastructure/utils/phone.utils';

interface MetaApiResponse {
    messages: Array<{ id: string }>;
}

@Injectable()
export class MetaWhatsAppAdapter implements IWhatsAppAdapter {

    private get url(): string {
        return `https://graph.facebook.com/v21.0/${process.env.META_PHONE_ID}/messages`;
    }
    private get token(): string { return process.env.META_WHATSAPP_TOKEN ?? ''; }
    private get agent(): string { return process.env.BOT_AGENT_NAME ?? 'Maria'; }
    private get store(): string { return process.env.STORE_NAME     ?? 'Nuestra tienda'; }
    private get emoji(): string { return process.env.STORE_EMOJI    ?? '🌿'; }

    private readonly EC_PROVINCES: Record<string, string> = {
        'EC-A': 'Azuay',       'EC-B': 'Bolívar',          'EC-F': 'Cañar',
        'EC-C': 'Carchi',      'EC-H': 'Chimborazo',       'EC-X': 'Cotopaxi',
        'EC-O': 'El Oro',      'EC-E': 'Esmeraldas',       'EC-W': 'Galápagos',
        'EC-G': 'Guayas',      'EC-I': 'Imbabura',         'EC-L': 'Loja',
        'EC-R': 'Los Ríos',    'EC-M': 'Manabí',           'EC-S': 'Morona Santiago',
        'EC-N': 'Napo',        'EC-D': 'Orellana',         'EC-P': 'Pastaza',
        'EC-Y': 'Pichincha',   'EC-SE': 'Santa Elena',     'EC-SD': 'Santo Domingo',
        'EC-U': 'Sucumbíos',   'EC-T': 'Tungurahua',       'EC-Z': 'Zamora Chinchipe',
    };

    private resolveProvince(code: string): string {
        return this.EC_PROVINCES[code] ?? code;
    }

    private async post<T>(payload: unknown): Promise<T> {
        const res = await fetch(this.url, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${this.token}`,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Meta API ${res.status}: ${err}`);
        }
        return res.json() as Promise<T>;
    }

    async sendMedia(phone: string, mediaUrl: string, type: 'image' | 'document', caption?: string): Promise<void> {
        await this.post({
            messaging_product: 'whatsapp',
            to:   normalizePhone(phone),
            type,
            [type]: { link: mediaUrl, caption: caption ?? '' },
        });
    }

    async downloadMedia(mediaId: string): Promise<string> {
        const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${this.token}` },
        });
        const data = await res.json() as { url: string };
        return data.url;
    }

    async sendConfirmationTemplate(order: WooOrderDto, phone: string): Promise<string> {
        const productList = order.line_items.map((i) => `• ${i.name} x${i.quantity}`).join('\n');
        const city        = order.billing.city     || order.shipping.city     || '';
        const province    = this.resolveProvince(order.billing.state || order.shipping.state || '');
        const address     = order.billing.address_1 || order.shipping.address_1 || '';
        const location    = [ province,city, address].filter(Boolean).join(' - ');

        const data = await this.post<MetaApiResponse>({
            messaging_product: 'whatsapp',
            to:   normalizePhone(phone),
            type: 'template',
            template: {
                name:     process.env.WA_TEMPLATE_NAME     ?? 'confirmar_pedido',
                language: { code: process.env.WA_TEMPLATE_LANGUAGE ?? 'es_EC' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: order.billing.first_name },
                            { type: 'text', text: this.agent },
                            { type: 'text', text: this.store },
                            { type: 'text', text: String(order.id) },
                            { type: 'text', text: productList },
                            { type: 'text', text: `$${order.total}` },
                            { type: 'text', text: location },
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
        await this.post({
            messaging_product: 'whatsapp',
            to:   normalizePhone(phone),
            type: 'text',
            text: { body: text, preview_url: false },
        });
    }

    buildAskWhatToModify(firstName: string): string {
        return (
            `${firstName ? `Claro ${firstName},` : 'Claro,'} 😊 ¿Qué dato deseas modificar?\n\n` +
            `*1* → Dirección de entrega\n` +
            `*2* → Ciudad\n` +
            `*3* → Provincia\n` +
            `*4* → Nombre del destinatario\n` +
            `*5* → Número de contacto\n` +
            `*6* → Cantidad\n` +
            `*0* → Volver al menú principal`
        );
    }

    buildAskNewAddress(): string {
        return `Por favor, escríbeme la nueva dirección completa de entrega. 📍`;
    }

    buildAskNewCity(): string {
        return `Por favor, escríbeme la nueva ciudad de entrega. 🏙️`;
    }

 buildChangeSummary(firstName: string, order: WooOrderDto, changes: Record<string, unknown>): string {
    const addr     = String(changes['address_1']          ?? order.shipping?.address_1 ?? order.billing?.address_1 ?? '');
    const city     = String(changes['city']               ?? order.shipping?.city      ?? order.billing?.city      ?? '');
    const stateRaw = String(changes['state']              ?? order.shipping?.state     ?? order.billing?.state     ?? '');
    const province = this.resolveProvince(stateRaw);
    const phone    = String(changes['billing_phone']      ?? '');
    const name     = order.billing?.first_name            ?? '';
    const prods    = order.line_items?.length
        ? order.line_items.map((i) => `${i.quantity} x ${i.name}`).join(', ')
        : '';

    let summary =
        `Gracias${name ? ` ${name}` : ''}. Aquí está el resumen actualizado:\n\n` +
        `📦 *Productos:* ${prods}\n` +
        `🗺️ *Provincia:* ${province}\n` +
        `🏙️ *Ciudad:* ${city}\n` +
        `📍 *Dirección:* ${addr}\n`;

    if (name)  summary += `👤 *Nombre:* ${name}\n`;
    if (phone) summary += `📱 *Teléfono:* ${phone}\n`;

   const total = order.line_items?.length
    ? order.line_items.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0)
    : Number(order.total ?? 0);

summary += `💵 *Total:* $${total.toFixed(2)}\n`;
summary += `\n¿Confirmas que los datos son correctos? Responde *SÍ* o *NO*.`;

    return summary;
}

    buildConfirmedMessage(firstName: string, orderId: string): string {
        return (
            `¡🎉 ${firstName ? firstName + ', ' : ''}gracias por confirmar tu pedido!\n\n` +
            `Tu pedido *#${orderId}* ya está en proceso 📦.\n` +
            `Cuando se genere la guía 🚚 te la compartiremos por aquí.\n\n` +
            `Ten el pago listo cuando llegue el mensajero 💵\n` +
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

    buildRetryMessage(firstName: string, order: WooOrderDto): string {
        const prods = order.line_items.map((i) => `${i.quantity} x ${i.name}`).join(', ');
        return (
            `Hola ${firstName} 👋, soy ${this.agent} de *${this.store}*.\n\n` +
            `Te recordamos que tienes un pedido pendiente:\n\n` +
            `📦 *Pedido #${order.id}:* ${prods}\n` +
            `💵 *Total:* $${order.total}\n\n` +
            `Responde *CONFIRMAR*, *MODIFICAR* o *CANCELAR*.`
        );
    }

    buildMainMenu(firstName: string): string {
        return (
            `${firstName ? `Hola ${firstName} 👋` : '👋'} ¿Qué deseas hacer con tu pedido?\n\n` +
            `✅ *CONFIRMAR*\n` +
            `✏️ *MODIFICAR*\n` +
            `❌ *CANCELAR*`
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

    buildBlockedMessage(): string {
        return `Lo sentimos, no podemos procesar tu pedido en este momento. Por favor comunícate con nosotros directamente.`;
    }
}