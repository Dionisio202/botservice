import { OrderDto } from '../../shared/dtos';

export interface IWooCommerceService {
    getOrder(orderId: number): Promise<OrderDto>;
    setOrderProcessing(orderId: number): Promise<void>;
    setOrderCancelled(orderId: number): Promise<void>;
    updateShipping(orderId: number, shipping: Partial<Pick<OrderDto['shipping'], 'address_1' | 'city'>>): Promise<void>;
    addOrderNote(orderId: number, note: string): Promise<void>;
}