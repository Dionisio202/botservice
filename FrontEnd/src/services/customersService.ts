import { securedApi } from '@/services/serviceHelpers';
import type { CustomerListResponse, CustomerFilters, Customer } from '@/types/customer.types';

function toParams(obj: object): string {
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
    });
    return params.toString();
}

export const customersService = {
    getAll: (filters: CustomerFilters = {}) =>
        securedApi.get<CustomerListResponse>(`/customers?${toParams(filters)}`),

    getOne: (id: number) =>
        securedApi.get<Customer>(`/customers/${id}`),

    recordLost: (phone: string, amount: number) =>
        securedApi.post<{ amount: number }, unknown>(`/customers/${phone}/lost`, { amount }),

    unblacklist: (phone: string) =>
        securedApi.post<object, unknown>(`/customers/${phone}/unblacklist`, {}),

   blacklist: (phone: string, reason: string, adminId: number) =>
    securedApi.post<{ reason: string; adminId: number }, unknown>(
        `/customers/${phone}/blacklist`,
        { reason, adminId }
    ),

    reviewOverride: (phone: string, approved: boolean, trustFully = false) =>
        securedApi.patch<{ approved: boolean; trustFully?: boolean }, unknown>(
            `/customers/${phone}/review-override`,
            { approved, trustFully },
        ),
};