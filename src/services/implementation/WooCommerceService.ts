import { IWooCommerceService } from '../interface/IWooCommerceService';
import { OrderDto, OrderLineItemDto } from '../../shared/dtos';

interface WcLineItem {
    name:     string;
    quantity: number;
    total:    string;
}

interface WcOrderResponse {
    id:    number;
    total: string;
    billing: {
        first_name: string;
        last_name:  string;
        phone:      string;
        email:      string;
    };
    shipping: {
        address_1: string;
        address_2: string;
        city:      string;
        state:     string;
        country:   string;
    };
    line_items: WcLineItem[];
}

export class WooCommerceService implements IWooCommerceService {

    private get base(): string {
        return process.env.WC_API_URL ?? '';
    }

    private authHeader(): Record<string, string> {
        const key = process.env.WC_CONSUMER_KEY    ?? '';
        const sec = process.env.WC_CONSUMER_SECRET ?? '';
        return {
            'Content-Type':  'application/json',
            'Authorization': `Basic ${Buffer.from(`${key}:${sec}`).toString('base64')}`,
        };
    }

    async getOrder(orderId: number): Promise<OrderDto> {
        const res = await fetch(`${this.base}/orders/${orderId}`, {
            headers: this.authHeader(),
        });
        if (!res.ok) throw new Error(`WC getOrder error ${res.status}`);

        const data = await res.json() as WcOrderResponse;
        return {
            id:    data.id,
            total: data.total,
            billing: {
                first_name: data.billing.first_name,
                last_name:  data.billing.last_name,
                phone:      data.billing.phone,
                email:      data.billing.email,
            },
            shipping: {
                address_1: data.shipping.address_1,
                address_2: data.shipping.address_2,
                city:      data.shipping.city,
                state:     data.shipping.state,
                country:   data.shipping.country,
            },
            line_items: data.line_items.map((item: WcLineItem): OrderLineItemDto => ({
                name:     item.name,
                quantity: item.quantity,
                total:    item.total,
            })),
        };
    }

    async setOrderProcessing(orderId: number): Promise<void> {
        const res = await fetch(`${this.base}/orders/${orderId}`, {
            method:  'PUT',
            headers: this.authHeader(),
            body:    JSON.stringify({ status: 'processing' }),
        });
        if (!res.ok) throw new Error(`WC setProcessing error ${res.status}`);
    }

    async setOrderCancelled(orderId: number): Promise<void> {
        const res = await fetch(`${this.base}/orders/${orderId}`, {
            method:  'PUT',
            headers: this.authHeader(),
            body:    JSON.stringify({ status: 'cancelled' }),
        });
        if (!res.ok) throw new Error(`WC setCancelled error ${res.status}`);
    }

    async updateShipping(
        orderId:  number,
        shipping: Partial<Pick<OrderDto['shipping'], 'address_1' | 'city'>>
    ): Promise<void> {
        const res = await fetch(`${this.base}/orders/${orderId}`, {
            method:  'PUT',
            headers: this.authHeader(),
            body:    JSON.stringify({ shipping }),
        });
        if (!res.ok) throw new Error(`WC updateShipping error ${res.status}`);
    }

    async addOrderNote(orderId: number, note: string): Promise<void> {
        const res = await fetch(`${this.base}/orders/${orderId}/notes`, {
            method:  'POST',
            headers: this.authHeader(),
            body:    JSON.stringify({ note, customer_note: false }),
        });
        if (!res.ok) throw new Error(`WC addNote error ${res.status}`);
    }
}