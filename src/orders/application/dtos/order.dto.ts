export interface WooLineItem {
    name:     string;
    quantity: number;
    price:    string;
}

export interface WooOrderDto {
    id:             number;
    total:          string;
    shipping_total: string;
    status:         string;
    billing: {
        first_name: string;
        last_name:  string;
        phone:      string;
        city:       string;
        state:      string;
        address_1:  string;
    };
    shipping: {
        address_1: string;
        city:      string;
        state:     string;
    };
    line_items: WooLineItem[];
}