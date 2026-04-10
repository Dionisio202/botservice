import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BlacklistCustomerUseCase } from '../../application/usecases/blacklist-customer.usecase';
import { UnblacklistCustomerUseCase } from '../../application/usecases/unblacklist-customer.usecase';
import { RecordLostUseCase } from '../../application/usecases/record-lost.usecase';
import { BlacklistDto, RecordLostDto } from '../../application/dtos/customer.dto';
import { CustomersPresenter } from '../presenter/customers.presenter';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';
import { IsBoolean, IsOptional } from 'class-validator';

class ReviewOverrideDto {
    @IsBoolean()
    approved!: boolean;

    @IsOptional()
    @IsBoolean()
    trustFully?: boolean;
}

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
    constructor(
        private readonly blacklistUseCase:   BlacklistCustomerUseCase,
        private readonly unblacklistUseCase: UnblacklistCustomerUseCase,
        private readonly recordLostUseCase:  RecordLostUseCase,
        private readonly prisma:             PrismaService,
    ) {}

    @Get()
    @Roles('admin', 'agent')
    async getAll(
        @Query('page')   page    = '1',
        @Query('limit')  limit   = '20',
        @Query('phone')  phone?:  string,
        @Query('name')   name?:   string,
        @Query('tier')   tier?:   string,
        @Query('status') status?: string,
        @Query('from')   from?:   string,
        @Query('to')     to?:     string,
    ) {
        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        const where = {
            ...(phone  && { phone:         { contains: phone } }),
            ...(name   && { customer_name: { contains: name  } }),
            ...(tier   && { customer_tier: tier }),
            ...(status === 'blacklisted'  && { is_blacklisted:     true }),
            ...(status === 'needs_review' && { needs_agent_review: true }),
            ...(status === 'trusted'      && { manually_trusted:   true }),
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
                orderBy: { last_order_at: 'desc' },
                skip,
                take:    limitNum,
            }),
        ]);

        return {
            data:       CustomersPresenter.toList(customers),
            total,
            page:       pageNum,
            limit:      limitNum,
            totalPages: Math.ceil(total / limitNum),
        };
    }

    @Get(':id')
    @Roles('admin', 'agent')
    async getOne(@Param('id') id: string) {
        const customer = await this.prisma.botCustomer.findUnique({
            where:   { id: Number(id) },
            include: { order_sessions: { orderBy: { created_at: 'desc' } } },
        });
        if (!customer) return null;
        return CustomersPresenter.toResponse(customer);
    }

    @Post(':phone/blacklist')
    @Roles('admin')
    blacklist(
        @Param('phone') phone: string,
        @Body() dto: BlacklistDto,
    ) {
        return this.blacklistUseCase.execute({
            phone,
            reason:  dto.reason,
            adminId: dto.adminId,
        });
    }

    @Post(':phone/unblacklist')
    @Roles('admin')
    unblacklist(@Param('phone') phone: string) {
        return this.unblacklistUseCase.execute(phone);
    }

    @Post(':phone/lost')
    @Roles('admin')
    recordLost(
        @Param('phone') phone: string,
        @Body() dto: RecordLostDto,
    ) {
        return this.recordLostUseCase.execute(phone, dto.amount);
    }

    @Patch(':phone/review-override')
    @Roles('admin', 'agent')
    async reviewOverride(
        @Param('phone') phone: string,
        @Body() dto: ReviewOverrideDto,
        @CurrentUser() user: { id: number },
    ) {
        if (!dto.approved) {
            const customer = await this.prisma.botCustomer.findUnique({ where: { phone } });
            if (customer) {
                await this.blacklistUseCase.execute({
                    phone,
                    reason:  'Escalado a blacklist por agente tras revisión manual',
                    adminId: user.id,
                });
            }
            return;
        }

        await this.prisma.botCustomer.update({
            where: { phone },
            data: {
                needs_agent_review:  false,
                agent_review_reason: null,
                risk_score:          0,
                manually_trusted:    dto.trustFully ?? false,
            },
        });
    }
}