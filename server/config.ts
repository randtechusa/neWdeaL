import { type SessionOptions } from "express-session";

interface Config {
  session: SessionOptions;
  database: {
    url: string;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  };
  security: {
    rateLimiting: {
      enabled: boolean;
      maxQueries: number;
      windowMs: number;
    };
  };
}

const isProduction = process.env.NODE_ENV === "production";

// Development configuration with strict limits
const developmentConfig: Config = {
  session: {
    secret: process.env.REPL_ID || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    }
  },
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: 2,
    idleTimeout: 3000,
    connectionTimeout: 2000
  },
  security: {
    rateLimiting: {
      enabled: true,
      maxQueries: 20,
      windowMs: 60000
    }
  }
};

// Production configuration with stricter limits
const productionConfig: Config = {
  session: {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    name: 'analee.sid',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    }
  },
  database: {
    url: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL!,
    maxConnections: 3,
    idleTimeout: 3000,
    connectionTimeout: 2000
  },
  security: {
    rateLimiting: {
      enabled: true,
      maxQueries: 50,
      windowMs: 60000
    }
  }
};

export const config = isProduction ? productionConfig : developmentConfig;