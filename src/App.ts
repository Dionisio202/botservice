import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import { wooRoutes }   from './routes/woo.routes';
import { metaRoutes }  from './routes/meta.routes';
import { adminRoutes } from './routes/admin-routes';

const app: Application = express();

app.use(
    express.json({
        verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
            req.rawBody = buf;
        },
    })
);

// ── Panel admin (HTML estático protegido) ─────────────────────────────────────
app.get('/admin', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'wordpress ok', time: new Date().toISOString() });
});

app.use('/webhook-woocommerce', wooRoutes);
app.use('/webhook-meta',        metaRoutes);
app.use('/admin',               adminRoutes);

// ── 404 / Error ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[App] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

export default app;