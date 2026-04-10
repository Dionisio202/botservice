import { securedApi } from '@/services/serviceHelpers';
import { TOKEN_KEY } from '@/services/serviceHelpers';
import type { Message } from '@/types/message.types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const messagesService = {
    getBySession: (sessionId: number) =>
        securedApi.get<Message[]>(`/messages/session/${sessionId}`),

    send: (dto: { session_id: number; customerId: number; phone: string; content: string }) =>
        securedApi.post<typeof dto, Message>('/messages/send', dto),

    sendMedia: async (dto: {
        phone:      string;
        customerId: number;
        sessionId:  number;
        caption?:   string;
        file:       File;
    }) => {
        const form = new FormData();
        form.append('file',       dto.file);
        form.append('phone',      dto.phone);
        form.append('customerId', String(dto.customerId));
        form.append('sessionId',  String(dto.sessionId));
        if (dto.caption) form.append('caption', dto.caption);

        const res = await fetch(`${BASE_URL}/messages/send-media`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
            body:    form,
        });
        const json = await res.json();
        return { ok: res.ok, data: json.data ?? null, error: json.error ?? null };
    },

    getQuickReplies: () =>
        securedApi.get<{ id: number; title: string; content: string; category: string | null }[]>('/quick-replies/active'),
};