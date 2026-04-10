const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface ApiResponse<T> {
    ok:    boolean;
    data:  T | null;
    error: string | null;
}

async function parseResponse<TOut>(res: Response): Promise<ApiResponse<TOut>> {
    const text = await res.text();
    let json: Record<string, unknown> | null = null;

    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    if (!res.ok) {
        const msg =
            (json as Record<string, string> | null)?.error ??
            (json as Record<string, string> | null)?.message ??
            text ??
            `Error ${res.status}`;
        return { ok: false, data: null, error: msg };
    }

    return { ok: true, data: json as TOut, error: null };
}

interface RequestConfig {
    method:      string;
    url:         string;
    token?:      string;
    body?:       string;
    contentType?: string;
}

function buildHeaders(token?: string, contentType?: string): HeadersInit {
    const headers: HeadersInit = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (token)       headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function request<TOut>(config: RequestConfig): Promise<ApiResponse<TOut>> {
    const { method, url, body, contentType, token } = config;
    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method,
            headers: buildHeaders(token, contentType),
            ...(body !== undefined ? { body } : {}),
        });
        return parseResponse<TOut>(res);
    } catch {
        return { ok: false, data: null, error: 'Error de conexión con el servidor.' };
    }
}

function get<TOut>(url: string, token?: string): Promise<ApiResponse<TOut>> {
    return request<TOut>({ method: 'GET', url, token });
}

function post<TIn, TOut>(url: string, body: TIn, token?: string): Promise<ApiResponse<TOut>> {
    return request<TOut>({ method: 'POST', url, token, body: JSON.stringify(body), contentType: 'application/json' });
}

function patch<TIn, TOut>(url: string, body: TIn, token?: string): Promise<ApiResponse<TOut>> {
    return request<TOut>({ method: 'PATCH', url, token, body: JSON.stringify(body), contentType: 'application/json' });
}

function del<TOut>(url: string, token?: string): Promise<ApiResponse<TOut>> {
    return request<TOut>({ method: 'DELETE', url, token });
}

export const api = { get, post, patch, delete: del };