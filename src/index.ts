import 'dotenv/config';
import app from './App';
import { retryScheduler } from './container';

const PORT: number = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
    console.log(`[Server] Puerto ${PORT} | ${process.env.NODE_ENV ?? 'development'}`);
    retryScheduler.start();
});