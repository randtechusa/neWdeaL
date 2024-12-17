import { type SessionOptions } from "express-session";

interface Config {
  session: SessionOptions;
  database: {
    url: string;
  };
  server: {
    port: number;
    host: string;
  };
}

const isProduction = process.env.NODE_ENV === "production";

const commonConfig: Partial<Config> = {
  server: {
    port: 5000,
    host: "0.0.0.0"
  },
  database: {
    url: process.env.DATABASE_URL!
  }
};

const developmentConfig: Config = {
  ...commonConfig,
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
  } as SessionOptions
};

const productionConfig: Config = {
  ...commonConfig,
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
  } as SessionOptions
};

export const config: Config = isProduction ? productionConfig : developmentConfig;
