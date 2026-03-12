import { Request, Response, NextFunction } from 'express';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
    const key = req.headers['x-admin-key'];
    const validKey = process.env.ADMIN_API_KEY;

    if (!validKey) {
        res.status(500).json({ error: 'ADMIN_API_KEY no configurada.' });
        return;
    }

    if (!key || key !== validKey) {
        res.status(401).json({ error: 'No autorizado.' });
        return;
    }

    next();
}