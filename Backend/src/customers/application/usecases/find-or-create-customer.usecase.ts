import { Injectable, Inject } from '@nestjs/common';
import type { ICustomerRepository } from '../../domain/interfaces/customer-repository.interface';
import { Customer } from '../../domain/entities/customer.entity';

@Injectable()
export class FindOrCreateCustomerUseCase {
    constructor(
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
    ) {}

    async execute(phone: string, name?: string): Promise<Customer> {
        const existing = await this.customerRepo.findByPhone(phone);
        if (existing) return existing;
        return this.customerRepo.create(phone, name);
    }
}