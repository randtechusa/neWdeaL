import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

// Ensure environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const isProduction = process.env.NODE_ENV === 'production';

// Single database connection to prevent multiple instances
export const db = drizzle({
  connection: process.env.DATABASE_URL,
  schema,
  ws: ws,
});

// Protect production data from development changes
export const executeQuery = async (query: any, params?: any) => {
  if (isProduction) {
    // Log all production database operations
    console.log(`Production database operation requested: ${query}`);
    
    // Prevent destructive operations in production
    const queryString = query.toString().toLowerCase();
    if (queryString.includes('drop') || queryString.includes('truncate')) {
      throw new Error('Destructive database operations are not allowed in production');
    }
    
    // Prevent modifications to master accounts in production
    if (queryString.includes('master_accounts') && 
        (queryString.includes('update') || queryString.includes('delete'))) {
      throw new Error('Modifications to master accounts are not allowed in production');
    }
  }
  
  return db.execute(query, params);
};
