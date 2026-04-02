export interface WooLineItem {
    name:     string;
    quantity: number;
    price:    string;
}

export interface WooOrderDto {
    id:         number;
    total:      string;
    status:     string;
    billing: {
        first_name: string;
        last_name:  string;
        phone:      string;
    };
    shipping: {
        address_1: string;
        city:      string;
    };
    line_items: WooLineItem[];
}