import { Response } from 'express';
import crypto from 'crypto';
import { RawBodyRequest, OrderDto } from '../shared/dtos';
import { normalizePhone }           from '../shared/utils/phoneUtils';
import { sessionRepo, customerRepo, whatsAppService } from '../container';

function validateWooSignature(req: RawBodyRequest): boolean {
    const secret = process.env.WC_WEBHOOK_SECRET;
    if (!secret) return true;
    const signature = req.headers['x-wc-webhook-signature'] as string | undefined;
    if (!signature || !req.rawBody) return false;
    const hash = crypto.createHmac('sha256', secret).update(req.rawBody).digest('base64');
    return hash === signature;
}

export async function handleWooWebhook(req: RawBodyRequest, res: Response): Promise<void> {
    res.status(200).json({ status: 'received' });

    try {
        if (!validateWooSignature(req)) {
            console.warn('[WooWebhook] Firma inválida.');
            return;
        }

        const data = req.body as Partial<OrderDto>;
        if (!data?.id || !data?.billing?.phone) {
            console.warn('[WooWebhook] Payload sin id o teléfono.');
            return;
        }

        const order:     OrderDto = data as OrderDto;
        const phone:     string   = normalizePhone(order.billing.phone);
        const firstName: string   = order.billing.first_name || 'Cliente';

        console.log(`[WooWebhook] Orden #${order.id} → ${phone}`);

        // Guardia 1: Blacklist
        if (await customerRepo.isBlacklisted(phone)) {
            console.warn(`[WooWebhook] ${phone} en blacklist.`);
            await whatsAppService.sendText(phone, whatsAppService.buildBlockedMessage());
            return;
        }

        // Guardia 2: Límite de pedidos pendientes
        const maxPending: number = parseInt(process.env.BOT_MAX_PENDING_PER_CUSTOMER ?? '2', 10);
        if (await sessionRepo.countPendingByPhone(phone) >= maxPending) {
            console.warn(`[WooWebhook] ${phone} superó el límite de pendientes.`);
            await whatsAppService.sendText(phone, whatsAppService.buildTooManyPendingMessage(firstName));
            return;
        }

        await sessionRepo.create(order.id, phone);
        await customerRepo.recordNewOrder(phone);

        const messageId: string = await whatsAppService.sendConfirmationTemplate(order);
        await sessionRepo.markAttemptSent(order.id, messageId);

        console.log(`[WooWebhook] Template enviado → Orden #${order.id} | msg: ${messageId}`);

    } catch (err) {
        console.error('[WooWebhook] Error:', err);
    }
}