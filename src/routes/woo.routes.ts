import { Router } from 'express';
import { handleWooWebhook } from '../controllers/WooWebhookController';

export const wooRoutes: Router = Router();
wooRoutes.post('/', handleWooWebhook);