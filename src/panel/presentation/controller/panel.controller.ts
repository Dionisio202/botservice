import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';

@Controller('panel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PanelController {
    constructor(private readonly prisma: PrismaService) {}

    @Get('dashboard')
    @Roles('admin', 'agent')
    async getDashboard() {
        const [
            totalCustomers,
            blacklisted,
            pendingOrders,
            confirmedOrders,
            cancelledOrders,
            totalLost,
        ] = await Promise.all([
            this.prisma.botCustomer.count(),
            this.prisma.botCustomer.count({ where: { is_blacklisted: true } }),
            this.prisma.botOrderSession.count({ where: { status: 'pending' } }),
            this.prisma.botOrderSession.count({ where: { status: 'confirmed' } }),
            this.prisma.botOrderSession.count({ where: { status: 'cancelled' } }),
            this.prisma.botCustomer.aggregate({ _sum: { total_lost_amount: true } }),
        ]);

        return {
            customers: {
                total:       totalCustomers,
                blacklisted,
            },
            orders: {
                pending:   pendingOrders,
                confirmed: confirmedOrders,
                cancelled: cancelledOrders,
            },
            total_lost_amount: Number(totalLost._sum.total_lost_amount ?? 0),
        };
    }

    @Get('conversations')
    @Roles('admin', 'agent')
    getConversations() {
        return this.prisma.botOrderSession.findMany({
            where:   { status: 'pending' },
            include: { customer: true, messages: true },
            orderBy: { updated_at: 'desc' },
        });
    }
}