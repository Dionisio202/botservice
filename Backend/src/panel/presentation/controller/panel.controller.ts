import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OrderStatus } from '@prisma/client';

@Controller('panel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PanelController {
    constructor(private readonly prisma: PrismaService) {}

    @Get('dashboard')
    @Roles('admin', 'agent')
    async getDashboard(
        @Query('from') from?: string,
        @Query('to')   to?:   string,
    ) {
        const dateFilter = (from || to) ? {
            created_at: {
                ...(from && { gte: new Date(from) }),
                ...(to   && { lte: new Date(to + 'T23:59:59Z') }),
            },
        } : {};

        const [
            totalCustomers,
            blacklisted,
            needsAgentReview,
            pendingOrders,
            confirmedOrders,
            cancelledOrders,
            totalLost,
            reviewList,
        ] = await Promise.all([
            this.prisma.botCustomer.count(),
            this.prisma.botCustomer.count({ where: { is_blacklisted: true } }),
            this.prisma.botCustomer.count({ where: { needs_agent_review: true } }),
            this.prisma.botOrderSession.count({ where: { status: 'pending',   ...dateFilter } }),
            this.prisma.botOrderSession.count({ where: { status: 'confirmed', ...dateFilter } }),
            this.prisma.botOrderSession.count({ where: { status: 'cancelled', ...dateFilter } }),
            this.prisma.botCustomer.aggregate({ _sum: { total_lost_amount: true } }),
            this.prisma.botCustomer.findMany({
                where:   { needs_agent_review: true },
                select: {
                    id:                  true,
                    phone:               true,
                    customer_name:       true,
                    agent_review_reason: true,
                    risk_score:          true,
                    customer_tier:       true,
                    order_sessions: {
                        select:  { order_id: true, order_items: true, created_at: true },
                        orderBy: { created_at: 'desc' },
                        take:    1,
                    },
                },
                orderBy: { last_order_at: 'desc' },
                take:    10,
            }),
        ]);

        return {
            customers: {
                total:              totalCustomers,
                blacklisted,
                needs_agent_review: needsAgentReview,
            },
            orders: {
                pending:   pendingOrders,
                confirmed: confirmedOrders,
                cancelled: cancelledOrders,
            },
            total_lost_amount: Number(totalLost._sum.total_lost_amount ?? 0),
            review_list:       reviewList,
        };
    }

    @Get('review')
    @Roles('admin', 'agent')
    async getReviewList(
        @Query('page')  page  = '1',
        @Query('limit') limit = '20',
        @Query('phone') phone?: string,
        @Query('name')  name?:  string,
        @Query('from')  from?:  string,
        @Query('to')    to?:    string,
    ) {
        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        const where = {
            needs_agent_review: true,
            ...(phone && { phone: { contains: phone } }),
            ...(name  && { customer_name: { contains: name } }),
            ...(from || to ? {
                last_order_at: {
                    ...(from && { gte: new Date(from) }),
                    ...(to   && { lte: new Date(to + 'T23:59:59Z') }),
                },
            } : {}),
        };

        const [total, customers] = await Promise.all([
            this.prisma.botCustomer.count({ where }),
            this.prisma.botCustomer.findMany({
                where,
                select: {
                    id:                  true,
                    phone:               true,
                    customer_name:       true,
                    agent_review_reason: true,
                    risk_score:          true,
                    customer_tier:       true,
                    cancelled_orders:    true,
                    lost_orders:         true,
                    last_order_at:       true,
                    order_sessions: {
                        select: {
                            order_id:    true,
                            order_items: true,
                            order_total: true,
                            status:      true,
                            created_at:  true,
                        },
                        orderBy: { created_at: 'desc' },
                        take:    1,
                    },
                },
                orderBy: { last_order_at: 'desc' },
                skip,
                take:    limitNum,
            }),
        ]);

        return {
            data:       customers,
            total,
            page:       pageNum,
            limit:      limitNum,
            totalPages: Math.ceil(total / limitNum),
        };
    }

    @Get('conversations')
    @Roles('admin', 'agent')
    async getConversations(
        @Query('page')   page   = '1',
        @Query('limit')  limit  = '20',
        @Query('status') status?: string,
        @Query('phone')  phone?:  string,
        @Query('search') search?: string,
    ) {
        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        const where = {
            ...(status ? { status: status as OrderStatus } : {}),
            ...(phone || search ? {
                customer: {
                    is: {
                        ...(phone  && { phone:         { contains: phone  } }),
                        ...(search && { customer_name: { contains: search } }),
                    },
                },
            } : {}),
        };

        const [total, sessions] = await Promise.all([
            this.prisma.botOrderSession.count({ where }),
            this.prisma.botOrderSession.findMany({
                where,
                select: {
                    id:                 true,
                    order_id:           true,
                    customer_name:      true,
                    order_total:        true,
                    order_items:        true,
                    status:             true,
                    conv_step:          true,
                    attempts:           true,
                    created_at:         true,
                    updated_at:         true,
                    pending_changes:    true,
                    unrecognized_count: true,
                    customer: {
                        select: {
                            id:                 true,
                            phone:              true,
                            customer_name:      true,
                            customer_tier:      true,
                            risk_score:         true,
                            needs_agent_review: true,
                            is_blacklisted:     true,
                        },
                    },
                    messages: {
                        select: {
                            id:         true,
                            direction:  true,
                            content:    true,
                            msg_type:   true,
                            created_at: true,
                            media_url:  true,
                            media_type: true,
                        },
                        orderBy: { created_at: 'desc' },
                        take:    1,
                    },
                },
                orderBy: { updated_at: 'desc' },
                skip,
                take:    limitNum,
            }),
        ]);

        return {
            data:       sessions,
            total,
            page:       pageNum,
            limit:      limitNum,
            totalPages: Math.ceil(total / limitNum),
        };
    }
}