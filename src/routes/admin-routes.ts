import { Router } from 'express';
import { adminAuth }            from '../shared/middleware/adminAuth';
import {
    getStats,
    getSessions,
    getBlacklist,
    removeFromBlacklist,
    cancelSession,
} from '../controllers/AdminController';

export const adminRoutes: Router = Router();

adminRoutes.use(adminAuth); // ← protege TODAS las rutas de admin

adminRoutes.get('/stats',                          getStats);
adminRoutes.get('/sessions',                       getSessions);
adminRoutes.get('/blacklist',                      getBlacklist);
adminRoutes.delete('/blacklist/:phone',            removeFromBlacklist);
adminRoutes.post('/sessions/:orderId/cancel',      cancelSession);