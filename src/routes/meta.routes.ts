import { Router } from 'express';
import { verifyMetaWebhook, handleMetaWebhook } from '../controllers/MetaWebhookController';

export const metaRoutes: Router = Router();
metaRoutes.get('/',  verifyMetaWebhook);
metaRoutes.post('/', handleMetaWebhook);