import { publicApi, securedApi, TOKEN_KEY } from '@/services/serviceHelpers';
import type { AuthUser } from '@/types/auth.types';

interface LoginResponse {
    accessToken: string;
}

interface JwtPayload {
    sub:      number;
    username: string;
    role:     'admin' | 'agent';
    exp:      number;
}

function decodeJwt(token: string): JwtPayload | null {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload)) as JwtPayload;
    } catch {
        return null;
    }
}

function payloadToUser(payload: JwtPayload): AuthUser {
    return {
        id:       payload.sub,
        username: payload.username,
        role:     payload.role,
    };
}

export const authService = {
    async login(email: string, password: string): Promise<{ ok: boolean; user: AuthUser | null; error?: string }> {
        const result = await publicApi.post<{ username: string; password: string }, LoginResponse>(
            '/auth/login',
            { username: email, password }
        );

        if (!result.ok || !result.data) {
            return { ok: false, user: null, error: result.error ?? 'Credenciales incorrectas.' };
        }

        localStorage.setItem(TOKEN_KEY, result.data.accessToken);

        const payload = decodeJwt(result.data.accessToken);
        if (!payload) return { ok: false, user: null, error: 'Token inválido.' };

        return { ok: true, user: payloadToUser(payload) };
    },

    me(): AuthUser | null {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;

        const payload = decodeJwt(token);
        if (!payload) return null;

        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }

        return payloadToUser(payload);
    },

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
    },

    isAuthenticated(): boolean {
        return !!this.me();
    },

    register: (dto: { username: string; password: string; role: 'admin' | 'agent' }) =>
        securedApi.post<typeof dto, unknown>('/auth/register', dto),

    changePassword: (dto: { username: string; newPassword: string }) =>
        securedApi.post<typeof dto, unknown>('/auth/change-password', dto),
};