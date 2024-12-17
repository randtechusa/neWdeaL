import { Pool } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@db/schema";
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Development pool with extreme restrictions to prevent billing issues
const devPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Absolute maximum of 1 connection
  idleTimeoutMillis: 1000, // Close after 1 second of idle
  connectionTimeoutMillis: 1000, // Fail fast
  maxUses: 1, // Create new connection after each use
  allowExitOnIdle: true,
  wsConstructor: ws, // Required for neon serverless
});

// Production pool with separate controlled environment
const prodPool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
  max: 2,
  idleTimeoutMillis: 2000,
  connectionTimeoutMillis: 2000,
  maxUses: 5,
  allowExitOnIdle: true,
  wsConstructor: ws,
});

// Use different pools for dev/prod
const pool = isDevelopment ? devPool : prodPool;

// Connection tracking
let activeConnections = 0;
const MAX_CONNECTIONS = isDevelopment ? 1 : 2;

// Force close connections on app shutdown
async function closeConnections() {
  console.log(`Closing all database connections (${activeConnections} active)...`);
  try {
    await pool.end();
    console.log('All connections closed successfully');
  } catch (error) {
    console.error('Error closing connections:', error);
  }
}

process.on('SIGTERM', closeConnections);
process.on('SIGINT', closeConnections);
process.on('exit', closeConnections);

// Create a single database instance with environment-specific settings
export const db = drizzle(pool, { 
  schema,
  logger: isDevelopment
});

// Strict query execution with connection tracking
export async function executeQuery(query: string) {
  if (activeConnections >= MAX_CONNECTIONS) {
    throw new Error(`Connection limit reached (${activeConnections}/${MAX_CONNECTIONS})`);
  }

  const client = await pool.connect();
  activeConnections++;
  
  try {
    console.log(`Active connections: ${activeConnections}/${MAX_CONNECTIONS}`);
    return await client.query(query);
  } finally {
    client.release(true); // Force close the connection
    activeConnections--;
    console.log(`Released connection. Active: ${activeConnections}/${MAX_CONNECTIONS}`);
  }
}
