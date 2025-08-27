import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.DB_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  // Connection pool configuration
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  // Retry configuration
  retry: {
    max: 3,
    delay: 1000
  }
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// Enhanced query function with error handling and retries
export const query = async (text, params) => {
  const start = Date.now();
  let client;

  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms - ${text.substring(0, 100)}...`);
    }

    return result;
  } catch (err) {
    console.error('Database query error:', {
      error: err.message,
      query: text.substring(0, 100),
      params: params ? params.slice(0, 5) : null // Only log first 5 params for security
    });
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});
