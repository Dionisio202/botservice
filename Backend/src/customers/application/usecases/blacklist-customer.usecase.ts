import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICustomerRepository } from '../../domain/interfaces/customer-repository.interface';

export interface BlacklistCustomerInput {
    phone:   string;
    reason:  string;
    adminId: number;
}

@Injectable()
export class BlacklistCustomerUseCase {
    constructor(
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
    ) {}

    async execute(input: BlacklistCustomerInput): Promise<{ message: string }> {
        const customer = await this.customerRepo.findByPhone(input.phone);
        if (!customer) throw new NotFoundException('Cliente no encontrado');

        await this.customerRepo.blacklist(customer.id, input.reason, input.adminId);
        return { message: 'Cliente bloqueado correctamente' };
    }
}