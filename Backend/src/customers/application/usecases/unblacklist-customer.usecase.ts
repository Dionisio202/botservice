import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICustomerRepository } from '../../domain/interfaces/customer-repository.interface';

@Injectable()
export class UnblacklistCustomerUseCase {
    constructor(
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
    ) {}

    async execute(phone: string): Promise<{ message: string }> {
        const customer = await this.customerRepo.findByPhone(phone);
        if (!customer) throw new NotFoundException('Cliente no encontrado');

        await this.customerRepo.unblacklist(customer.id);
        return { message: 'Cliente desbloqueado correctamente' };
    }
}