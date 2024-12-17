import { Pool } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@db/schema";
import ws from 'ws';
import { config } from '../server/config';

// Critical: Environment-based configuration with ultra-strict limits
const isDevelopment = process.env.NODE_ENV !== 'production';
const CONNECTION_LIMIT = isDevelopment ? 1 : 2; // Ultra strict: 1 connection in dev
const IDLE_TIMEOUT = isDevelopment ? 50 : 3000; // 50ms timeout in dev
const CONNECTION_TIMEOUT = isDevelopment ? 250 : 2000;
const CLEANUP_INTERVAL = isDevelopment ? 100 : 1000; 
const FORCE_EXIT_TIMEOUT = isDevelopment ? 30000 : 60000;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Ultra-strict connection manager to prevent billing issues
class UltraStrictConnectionManager {
  private static instance: UltraStrictConnectionManager;
  private pool: Pool;
  private activeConnections: number = 0;
  private readonly MAX_CONNECTIONS: number;
  private isShuttingDown: boolean = false;
  private lastQueryTime: number = Date.now();
  private cleanupTimer: NodeJS.Timeout;
  private forceExitTimer: NodeJS.Timeout;

  private constructor() {
    this.MAX_CONNECTIONS = isDevelopment ? DEVELOPMENT_CONNECTION_LIMIT : PRODUCTION_CONNECTION_LIMIT;
    
    // Force cleanup existing connections on startup
    this.forceCleanupExistingConnections().catch(console.error);
    
    // Initialize connection pool with strict limits
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: this.MAX_CONNECTIONS,
      idleTimeoutMillis: IDLE_TIMEOUT,
      connectionTimeoutMillis: CONNECTION_TIMEOUT,
      maxUses: 1, // Force new connection for each query
      allowExitOnIdle: true,
    });

    // Setup cleanup timers
    this.setupCleanupTimers();

    // Register emergency shutdown handlers
    this.registerEmergencyHandlers();

    console.log(`Initialized ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} connection manager`);
    console.log(`Max connections: ${this.MAX_CONNECTIONS}, Idle timeout: ${IDLE_TIMEOUT}ms`);
  }

  private async forceCleanupExistingConnections() {
    console.log('Forcing cleanup of existing connections...');
    try {
      const cleanup = new Pool({ connectionString: process.env.DATABASE_URL });
      await cleanup.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
        AND pid <> pg_backend_pid();
      `);
      await cleanup.end();
      console.log('Successfully terminated existing connections');
    } catch (error) {
      console.error('Failed to cleanup existing connections:', error);
      throw error; // Rethrow to prevent pool creation if cleanup fails
    }
  }

  private setupCleanupTimers() {
    // Aggressive periodic cleanup
    this.cleanupTimer = setInterval(() => {
      if (Date.now() - this.lastQueryTime > IDLE_TIMEOUT) {
        console.log('Connection idle timeout reached, forcing cleanup');
        this.emergencyCleanup().catch(console.error);
      }
    }, CLEANUP_INTERVAL);

    // Force process exit on extended inactivity
    this.forceExitTimer = setInterval(() => {
      if (Date.now() - this.lastQueryTime > FORCE_EXIT_TIMEOUT) {
        console.log('Extended inactivity detected, forcing process termination');
        this.destroy();
        process.exit(0);
      }
    }, FORCE_EXIT_TIMEOUT);
  }

  private registerEmergencyHandlers() {
    ['SIGTERM', 'SIGINT', 'exit', 'uncaughtException', 'unhandledRejection'].forEach(signal => {
      process.on(signal as any, async () => {
        console.log(`Signal ${signal} received, forcing immediate cleanup`);
        await this.emergencyCleanup();
        process.exit(1);
      });
    });
  }

  static getInstance(): UltraStrictConnectionManager {
    if (!this.instance) {
      this.instance = new UltraStrictConnectionManager();
    }
    return this.instance;
  }

  private async emergencyCleanup() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log('EMERGENCY: Forcing immediate connection termination');
    try {
      await this.forceCleanupExistingConnections();
      await this.pool.end();
      this.activeConnections = 0;
      console.log('All connections forcefully terminated');
    } catch (error) {
      console.error('Critical error during cleanup:', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  async query<T>(queryFn: (client: any) => Promise<T>): Promise<T> {
    if (this.activeConnections >= this.MAX_CONNECTIONS) {
      console.log('Connection limit reached, forcing cleanup before new connection');
      await this.emergencyCleanup();
    }

    this.lastQueryTime = Date.now();
    const client = await this.pool.connect();
    this.activeConnections++;
    console.log(`New connection opened (${this.activeConnections}/${this.MAX_CONNECTIONS})`);

    try {
      const result = await queryFn(client);
      return result;
    } finally {
      try {
        await client.release(true);
        this.activeConnections--;
        console.log(`Connection forcefully closed (${this.activeConnections}/${this.MAX_CONNECTIONS})`);
      } catch (error) {
        console.error('Error during connection release:', error);
        await this.emergencyCleanup();
      }
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  destroy() {
    clearInterval(this.cleanupTimer);
    clearInterval(this.forceExitTimer);
    this.emergencyCleanup().catch(console.error);
  }
}

// Initialize with ultra-strict connection management
const connectionManager = UltraStrictConnectionManager.getInstance();
export const db = drizzle(connectionManager.getPool(), { schema });
