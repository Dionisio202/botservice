import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CustomersModule } from '../customers/customers.module';
import { OrdersController } from './presentation/controller/orders.controller';
import { WooController } from './presentation/webhooks/woo.controller';
import { ProcessOrderUseCase } from './application/usecases/process-order.usecase';
import { ProcessOrderUpdateUseCase } from './application/usecases/process-order-update.usecase';
import { ConfirmOrderUseCase } from './application/usecases/confirm-order.usecase';
import { CancelOrderUseCase } from './application/usecases/cancel-order.usecase';
import { RetryOrderUseCase } from './application/usecases/retry-order.usecase';
import { PrismaOrderRepository } from './infrastructure/repository/prisma-order.repository';
import { PrismaCustomerRepository } from '../customers/infrastructure/repository/prisma-customer.repository';
import { MetaWhatsAppAdapter } from '../messages/infrastructure/adapters/meta-whatsapp.adapter';

@Module({
    imports:     [SharedModule, CustomersModule],
    controllers: [OrdersController, WooController],
    providers: [
        ProcessOrderUseCase,
        ProcessOrderUpdateUseCase,
        ConfirmOrderUseCase,
        CancelOrderUseCase,
        RetryOrderUseCase,
        { provide: 'IWhatsAppAdapter',    useClass: MetaWhatsAppAdapter },
        { provide: 'IOrderRepository',    useClass: PrismaOrderRepository },
        { provide: 'ICustomerRepository', useClass: PrismaCustomerRepository },
    ],
    exports: [
        ProcessOrderUseCase,
        ProcessOrderUpdateUseCase,
        ConfirmOrderUseCase,
        CancelOrderUseCase,
        { provide: 'IOrderRepository',    useClass: PrismaOrderRepository },
    ],
})
export class OrdersModule {}