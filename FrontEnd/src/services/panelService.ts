import { securedApi } from '@/services/serviceHelpers';
import type { DashboardData, ReviewListResponse, ConversationListResponse } from '@/types/panel.types';

export interface DateRangeFilters {
    from?: string;
    to?:   string;
}

export interface ReviewFilters extends DateRangeFilters {
    page?:  number;
    limit?: number;
    phone?: string;
    name?:  string;
}

export interface ConversationFilters {
    page?:   number;
    limit?:  number;
    status?: string;
    phone?:  string;
    search?: string;
}

function toParams(obj: object): string {
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
    });
    return params.toString();
}

export const panelService = {
    getDashboard: (filters: DateRangeFilters = {}) =>
        securedApi.get<DashboardData>(`/panel/dashboard?${toParams(filters)}`),

    getReviewList: (filters: ReviewFilters = {}) =>
        securedApi.get<ReviewListResponse>(`/panel/review?${toParams(filters)}`),

    getConversations: (filters: ConversationFilters = {}) =>
        securedApi.get<ConversationListResponse>(`/panel/conversations?${toParams(filters)}`),
};