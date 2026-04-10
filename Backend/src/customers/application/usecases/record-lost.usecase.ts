import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICustomerRepository } from '../../domain/interfaces/customer-repository.interface';

@Injectable()
export class RecordLostUseCase {
    constructor(
        @Inject('ICustomerRepository')
        private readonly customerRepo: ICustomerRepository,
    ) {}

    async execute(phone: string, amount: number): Promise<{ message: string }> {
        const customer = await this.customerRepo.findByPhone(phone);
        if (!customer) throw new NotFoundException('Cliente no encontrado');

        await this.customerRepo.recordLost(phone, amount);
        return { message: 'Pérdida registrada correctamente' };
    }
}