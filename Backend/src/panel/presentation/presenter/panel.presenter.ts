export class PanelPresenter {
    static toDashboard(data: {
        customers:         { total: number; blacklisted: number };
        orders:            { pending: number; confirmed: number; cancelled: number };
        total_lost_amount: number;
    }) {
        return {
            customers:         data.customers,
            orders:            data.orders,
            total_lost_amount: data.total_lost_amount,
        };
    }
}