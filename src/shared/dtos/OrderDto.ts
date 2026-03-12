export interface OrderLineItemDto {
    name: string;
    quantity: number;
    total: string; // WooCommerce envía los subtotales como string
}

export interface OrderDto {
    id: number;
    total: string; // WooCommerce envía el total final como string (ej. "330.00")
    billing: {
        first_name: string;
        last_name: string;
        phone: string;
        email: string;
    };
    shipping: {
        address_1: string;
        address_2: string; // A veces el cliente pone referencias aquí
        city: string;
        state: string;     // Provincia o estado
        country: string;
    };
    line_items: OrderLineItemDto[];
}