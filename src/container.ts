/**
 * Container de dependencias
 * Equivalente a builder.Services.AddScoped<IService, ServiceImpl>() en .NET
 *
 * Como Node no tiene DI nativo, instanciamos una vez (singleton)
 * y exportamos las instancias listas para usar en controllers.
 */

import { BotSessionRepository }      from './repositories/implementation/BotSessionRepository';
import { CustomerHistoryRepository }  from './repositories/implementation/CustomerHistoryRepository';
import { WhatsAppService }            from './services/implementation/WhatsAppService';
import { WooCommerceService }         from './services/implementation/WooCommerceService';
import { BotEngine }                  from './services/implementation/BotEngine';
import { RetryScheduler }             from './services/implementation/RetryScheduler';

import { IBotSessionRepository }      from './repositories/interface/IBotSessionRepository';
import { ICustomerHistoryRepository } from './repositories/interface/ICustomerHistoryRepository';
import { IWhatsAppService }           from './services/interface/IWhatsAppService';
import { IWooCommerceService }        from './services/interface/IWooCommerceService';
import { IBotEngine }                 from './services/interface/IBotEngine';
import { IRetryScheduler }            from './services/interface/IRetryScheduler';

// ── Repositorios ──────────────────────────────────────────────────────────────
const sessionRepo:     IBotSessionRepository      = new BotSessionRepository();
const customerRepo:    ICustomerHistoryRepository = new CustomerHistoryRepository();

// ── Servicios ─────────────────────────────────────────────────────────────────
const whatsAppService: IWhatsAppService  = new WhatsAppService();
const wooService:      IWooCommerceService = new WooCommerceService();

// ── BotEngine (inyecta repos + servicios) ─────────────────────────────────────
const botEngine: IBotEngine = new BotEngine(
    sessionRepo,
    customerRepo,
    whatsAppService,
    wooService
);

// ── RetryScheduler (inyecta repos + servicios) ────────────────────────────────
const retryScheduler: IRetryScheduler = new RetryScheduler(
    sessionRepo,
    customerRepo,
    whatsAppService,
    wooService
);

export {
    sessionRepo,
    customerRepo,
    whatsAppService,
    wooService,
    botEngine,
    retryScheduler,
};