import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CustomersController } from './presentation/controller/customers.controller';
import { FindOrCreateCustomerUseCase } from './application/usecases/find-or-create-customer.usecase';
import { BlacklistCustomerUseCase } from './application/usecases/blacklist-customer.usecase';
import { UnblacklistCustomerUseCase } from './application/usecases/unblacklist-customer.usecase';
import { RecordLostUseCase } from './application/usecases/record-lost.usecase';
import { PrismaCustomerRepository } from './infrastructure/repository/prisma-customer.repository';

@Module({
    imports:     [SharedModule],
    controllers: [CustomersController],
    providers: [
        FindOrCreateCustomerUseCase,
        BlacklistCustomerUseCase,
        UnblacklistCustomerUseCase,
        RecordLostUseCase,
        { provide: 'ICustomerRepository', useClass: PrismaCustomerRepository },
    ],
    exports: [
        FindOrCreateCustomerUseCase,
        BlacklistCustomerUseCase,
        UnblacklistCustomerUseCase,
        RecordLostUseCase,
    ],
})
export class CustomersModule {}