import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OrdersPresenter } from '../presenter/orders.presenter';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @Roles('admin', 'agent')
    async getAll() {
        const orders = await this.prisma.botOrderSession.findMany({
            include: { customer: true },
            orderBy: { created_at: 'desc' },
        });
        return OrdersPresenter.toList(orders);
    }

    @Get(':id')
    @Roles('admin', 'agent')
    async getOne(@Param('id') id: string) {
        const order = await this.prisma.botOrderSession.findUnique({
            where:   { id: Number(id) },
            include: { customer: true, messages: true },
        });
        if (!order) return null;
        return OrdersPresenter.toResponse(order);
    }

    @Patch(':id/status')
    @Roles('admin')
    updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string },
    ) {
        return this.prisma.botOrderSession.update({
            where: { id: Number(id) },
            data:  { status: body.status as any },
        });
    }
}