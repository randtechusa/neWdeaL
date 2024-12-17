import { type SessionOptions } from "express-session";

interface Config {
  session: SessionOptions;
  database: {
    url: string;
    readOnly: boolean;
    protectMasterAccounts: boolean;
  };
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production';
  };
  security: {
    enableHelmet: boolean;
    enableRateLimit: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

const isProduction = process.env.NODE_ENV === "production";

// Environment-specific configurations
const developmentConfig: Config = {
  server: {
    port: 5000,
    host: "0.0.0.0",
    environment: 'development'
  },
  database: {
    url: process.env.DATABASE_URL!,
    readOnly: false,
    protectMasterAccounts: true
  },
  session: {
    secret: process.env.REPL_ID || "analee-dev-secret",
    resave: false,
    saveUninitialized: false,
    name: 'analee.dev.sid',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    }
  } as SessionOptions,
  security: {
    enableHelmet: false,
    enableRateLimit: true,
    maxLoginAttempts: 10,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  }
};

const productionConfig: Config = {
  server: {
    port: 5000,
    host: "0.0.0.0",
    environment: 'production'
  },
  database: {
    url: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL!,
    readOnly: true, // Production database is read-only by default
    protectMasterAccounts: true
  },
  session: {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "analee-prod-secret",
    resave: false,
    saveUninitialized: false,
    name: 'analee.sid',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    }
  } as SessionOptions,
  security: {
    enableHelmet: true,
    enableRateLimit: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000 // 30 minutes
  }
};

// Validate configuration based on environment
const validateConfig = (config: Config) => {
  if (config.server.environment === 'production') {
    // Ensure production safeguards are in place
    if (!config.database.protectMasterAccounts) {
      throw new Error('Master accounts must be protected in production');
    }
    if (!config.security.enableHelmet) {
      throw new Error('Helmet must be enabled in production');
    }
    if (!config.session.cookie?.secure) {
      throw new Error('Secure cookies must be enabled in production');
    }
  }
  return config;
};

export const config: Config = validateConfig(
  isProduction ? productionConfig : developmentConfig
);
