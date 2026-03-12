import { IRetryScheduler }            from '../interface/IRetryScheduler';
import { IBotSessionRepository }      from '../../repositories/interface/IBotSessionRepository';
import { ICustomerHistoryRepository } from '../../repositories/interface/ICustomerHistoryRepository';
import { IWhatsAppService }           from '../interface/IWhatsAppService';
import { IWooCommerceService }        from '../interface/IWooCommerceService';
import { BotOrderSession }            from '../../shared/dtos';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

export class RetryScheduler implements IRetryScheduler {

    constructor(
        private readonly sessionRepo:     IBotSessionRepository,
        private readonly customerRepo:    ICustomerHistoryRepository,
        private readonly whatsAppService: IWhatsAppService,
        private readonly wooService:      IWooCommerceService
    ) {}

    start(): void {
        console.log('[Scheduler] Iniciado — revisión cada 1 hora.');
        void this.runCheck();
        setInterval(() => void this.runCheck(), CHECK_INTERVAL_MS);
    }

    private async runCheck(): Promise<void> {
        console.log(`[Scheduler] ${new Date().toISOString()}`);
        await this.sendRetries();
        await this.expireSessions();
    }

    private async sendRetries(): Promise<void> {
        const sessions: BotOrderSession[] = await this.sessionRepo.findPendingRetries();
        console.log(`[Scheduler] Reintentos: ${sessions.length}`);

        for (const session of sessions) {
            try {
                const order = await this.wooService.getOrder(session.order_id);
                const text  = this.whatsAppService.buildRetryMessage(order.billing.first_name, order);
                await this.whatsAppService.sendText(session.phone, text);
                await this.sessionRepo.markAttemptSent(session.order_id, `retry_${Date.now()}`);
                console.log(`[Scheduler] Reintento → Orden #${session.order_id}`);
            } catch (err) {
                console.error(`[Scheduler] Error reintento #${session.order_id}:`, err);
            }
        }
    }

    private async expireSessions(): Promise<void> {
        const sessions: BotOrderSession[] = await this.sessionRepo.findExpiredSessions();
        console.log(`[Scheduler] A expirar: ${sessions.length}`);

        for (const session of sessions) {
            try {
                await this.wooService.setOrderCancelled(session.order_id);
                await this.wooService.addOrderNote(
                    session.order_id,
                    `Cancelado automáticamente: sin respuesta tras ${session.attempts} intentos.`
                );
                await this.sessionRepo.updateStatus(session.order_id, 'expired');
                await this.customerRepo.recordExpired(session.phone);
                console.log(`[Scheduler] Expirado → Orden #${session.order_id}`);
            } catch (err) {
                console.error(`[Scheduler] Error expirando #${session.order_id}:`, err);
            }
        }
    }
}