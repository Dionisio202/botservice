import mysql, { Pool } from 'mysql2/promise';

const pool: Pool = mysql.createPool({
    host:               process.env.DB_HOST     ?? 'localhost',
    port:               parseInt(process.env.DB_PORT ?? '3306', 10),
    database:           process.env.DB_NAME,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    charset:            'utf8mb4',
    timezone:           'Z',
});

export default pool;