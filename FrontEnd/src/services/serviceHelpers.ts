import { api, type ApiResponse } from '@/services/api';
export interface NestResponse<T> {
    success:    boolean;
    data:       T | null;
    error:      string | null;
    statusCode: number;
}

export interface ServiceResult<T> {
    ok:    boolean;
    data:  T | null;
    error: string | null;
}

const TOKEN_KEY = 'ecu_token';

const tok = () => localStorage.getItem(TOKEN_KEY) ?? undefined;

async function unwrap<T>(
    call: Promise<ApiResponse<NestResponse<T>>>
): Promise<ServiceResult<T>> {
    const res = await call;

    if (!res.ok || !res.data) {
        return { ok: false, data: null, error: res.error };
    }

    if (!res.data.success) {
        return { ok: false, data: null, error: res.data.error ?? 'Ocurrió un error inesperado.' };
    }

    return { ok: true, data: res.data.data, error: null };
}

export const securedApi = {
    get<T>(url: string) {
        return unwrap<T>(api.get<NestResponse<T>>(url, tok()));
    },
    post<TIn, TOut>(url: string, body: TIn) {
        return unwrap<TOut>(api.post<TIn, NestResponse<TOut>>(url, body, tok()));
    },
    patch<TIn, TOut>(url: string, body: TIn) {
        return unwrap<TOut>(api.patch<TIn, NestResponse<TOut>>(url, body, tok()));
    },
    delete<T>(url: string) {
        return unwrap<T>(api.delete<NestResponse<T>>(url, tok()));
    },
};

export const publicApi = {
    post<TIn, TOut>(url: string, body: TIn) {
        return unwrap<TOut>(api.post<TIn, NestResponse<TOut>>(url, body));
    },
};

export { TOKEN_KEY };