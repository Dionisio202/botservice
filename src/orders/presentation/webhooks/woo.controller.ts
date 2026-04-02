import { Controller, Post, Headers, Body, HttpCode, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProcessOrderUseCase } from '../../application/usecases/process-order.usecase';
import type { WooOrderDto } from '../../application/dtos/order.dto';
@Controller('webhooks/woocommerce')
export class WooController {
    constructor(private readonly processOrderUseCase: ProcessOrderUseCase) {}

    @Post()
    @HttpCode(200)
    async handle(
        @Body() body: WooOrderDto,
        @Headers('x-wc-webhook-signature') signature: string,
    ): Promise<void> {
        this.verifySignature(JSON.stringify(body), signature);
        await this.processOrderUseCase.execute(body);
    }

    private verifySignature(payload: string, signature: string): void {
        const secret   = process.env.WC_WEBHOOK_SECRET ?? '';
        const expected = createHmac('sha256', secret)
            .update(payload)
            .digest('base64');

        const a = Buffer.from(signature ?? '', 'base64');
        const b = Buffer.from(expected, 'base64');

        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw new UnauthorizedException('Firma HMAC inválida');
        }
    }
}