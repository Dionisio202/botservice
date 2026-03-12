import { Request, Response } from 'express';
import { normalizePhone } from '../shared/utils/phoneUtils';
import { botEngine }      from '../container';

// ── Tipos del payload de Meta ─────────────────────────────────────────────────

interface MetaTextMessage {
    type: 'text';
    from: string;
    text: { body: string };
}

interface MetaButtonMessage {
    type:   'button';
    from:   string;
    button: { payload: string; text: string };
}

interface MetaInteractiveButtonReply {
    type:        'interactive';
    from:        string;
    interactive: { type: 'button_reply'; button_reply: { id: string; title: string } };
}

interface MetaInteractiveListReply {
    type:        'interactive';
    from:        string;
    interactive: { type: 'list_reply'; list_reply: { id: string; title: string } };
}

interface MetaUnsupportedMessage {
    type: 'audio' | 'image' | 'video' | 'sticker' | 'document' | 'location';
    from: string;
}

type MetaMessage =
    | MetaTextMessage
    | MetaButtonMessage
    | MetaInteractiveButtonReply
    | MetaInteractiveListReply
    | MetaUnsupportedMessage;

interface MetaWebhookBody {
    object: string;
    entry: Array<{
        changes: Array<{
            value: { messages?: MetaMessage[] };
        }>;
    }>;
}

// ── Verificación GET ──────────────────────────────────────────────────────────

export function verifyMetaWebhook(req: Request, res: Response): void {
    const mode:      unknown = req.query['hub.mode'];
    const token:     unknown = req.query['hub.verify_token'];
    const challenge: unknown = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
        console.log('[MetaWebhook] Verificación exitosa.');
        res.status(200).send(String(challenge));
    } else {
        console.warn('[MetaWebhook] Verificación fallida.');
        res.sendStatus(403);
    }
}

// ── Mensajes entrantes POST ───────────────────────────────────────────────────

export async function handleMetaWebhook(req: Request, res: Response): Promise<void> {
    res.sendStatus(200);

    try {
        const body = req.body as Partial<MetaWebhookBody>;
        if (body?.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                for (const message of change.value?.messages ?? []) {
                    await dispatch(message);
                }
            }
        }
    } catch (err) {
        console.error('[MetaWebhook] Error:', err);
    }
}

async function dispatch(message: MetaMessage): Promise<void> {
    const phone: string = normalizePhone(message.from);
    let text:          string = '';
    let buttonPayload: string = '';

    switch (message.type) {
        case 'text':
            text = message.text.body;
            break;

        case 'button':
            buttonPayload = message.button.payload;
            text          = message.button.text;
            break;

        case 'interactive':
            if (message.interactive.type === 'button_reply') {
                buttonPayload = message.interactive.button_reply.id;
                text          = message.interactive.button_reply.title;
            } else {
                text = message.interactive.list_reply.title;
            }
            break;

        default:
            console.log(`[MetaWebhook] Tipo no manejado: ${(message as MetaUnsupportedMessage).type}`);
            return;
    }

    if (!text && !buttonPayload) return;

    console.log(`[MetaWebhook] ${phone} → "${text}" | payload:"${buttonPayload}"`);
    await botEngine.processIncomingMessage(phone, text, buttonPayload);
}