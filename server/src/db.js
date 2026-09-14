import pg from 'pg';

const { Pool } = pg;

// Neon requires SSL; local Postgres (dev) does not. Toggle based on the URL.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
