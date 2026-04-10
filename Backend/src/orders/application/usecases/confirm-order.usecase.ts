import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IOrderRepository } from '../../domain/interfaces/order-repository.interface';
import type { ICustomerRepository } from '../../../customers/domain/interfaces/customer-repository.interface';

@Injectable()
export class ConfirmOrderUseCase {
    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo: IOrderRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
    ) {}

    async execute(orderId: number, phone: string): Promise<void> {
        const order = await this.orderRepo.findByOrderId(orderId);
        if (!order) throw new NotFoundException('Sesión no encontrada');

        await this.orderRepo.updateStatus(orderId, 'confirmed');
        await this.customerRepo.recordConfirmed(phone);
    }
}