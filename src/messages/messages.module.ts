import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OrdersModule } from '../orders/orders.module';
import { CustomersModule } from '../customers/customers.module';
import { MetaController } from './presentation/webhooks/meta.controller';
import { MessagesController } from './presentation/controller/messages.controller';
import { TemplatesController } from './presentation/controller/templates.controller';
import { QuickRepliesController } from './presentation/controller/quick-replies.controller';
import { SendTemplateUseCase } from './application/usecases/send-template.usecase';
import { SendQuickReplyUseCase } from './application/usecases/send-quick-reply.usecase';
import { ReceiveMessageUseCase } from './application/usecases/receive-message.usecase';
import { CleanExpiredUseCase } from './application/usecases/clean-expired.usecase';
import { BotEngineService } from './infrastructure/adapters/bot-engine.service';
import { MetaWhatsAppAdapter } from './infrastructure/adapters/meta-whatsapp.adapter';
import { PrismaMessageRepository } from './infrastructure/repository/prisma-message.repository';
import { PrismaTemplateRepository } from './infrastructure/repository/prisma-template.repository';
import { PrismaQuickReplyRepository } from './infrastructure/repository/prisma-quick-reply.repository';
import { PrismaOrderRepository } from '../orders/infrastructure/repository/prisma-order.repository';
import { PrismaCustomerRepository } from '../customers/infrastructure/repository/prisma-customer.repository';
import { OrderCreatedListener } from './application/listeners/order-created.listener';

@Module({
    imports:     [SharedModule, OrdersModule, CustomersModule],
    controllers: [MetaController, MessagesController, TemplatesController, QuickRepliesController],
    providers: [
        SendTemplateUseCase,
        SendQuickReplyUseCase,
        ReceiveMessageUseCase,
        CleanExpiredUseCase,
        BotEngineService,
        PrismaTemplateRepository,
        PrismaQuickReplyRepository,
        OrderCreatedListener,
        { provide: 'IWhatsAppAdapter',    useClass: MetaWhatsAppAdapter },
        { provide: 'IMessageRepository',  useClass: PrismaMessageRepository },
        { provide: 'IOrderRepository',    useClass: PrismaOrderRepository },
        { provide: 'ICustomerRepository', useClass: PrismaCustomerRepository },
    ],
    exports: [SendTemplateUseCase, BotEngineService],
})
export class MessagesModule {}