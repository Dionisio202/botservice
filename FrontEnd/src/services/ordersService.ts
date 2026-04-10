import { securedApi } from '@/services/serviceHelpers';

export const ordersService = {
    updateStatus: (id: number, status: string) =>
        securedApi.patch<{ status: string }, unknown>(`/orders/${id}/status`, { status }),
};