import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcryptjs from "bcryptjs";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

// extend express user object with our schema
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: string;
      active: boolean;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings = {
    secret: process.env.REPL_ID || "secure-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          if (!email || !password) {
            console.log("Login attempt failed: Missing email or password");
            return done(null, false, { message: "Email and password are required" });
          }

          console.log("Attempting login for email:", email);
          const user = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

          if (!user || user.length === 0) {
            console.log("Login failed: User not found");
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user[0].active) {
            console.log("Login failed: Account is deactivated");
            return done(null, false, { message: "Account is deactivated" });
          }

          const isValidPassword = await bcryptjs.compare(password, user[0].password);
          console.log("Password validation result:", isValidPassword);

          if (!isValidPassword) {
            console.log("Login failed: Invalid password");
            return done(null, false, { message: "Invalid email or password" });
          }

          const userToReturn = {
            id: user[0].id,
            email: user[0].email,
            role: user[0].role,
            active: user[0].active,
          };
          console.log("Login successful for user:", userToReturn.email);
          return done(null, userToReturn);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user || !user.active) {
        return done(null, false);
      }

      done(null, {
        id: user.id,
        email: user.email,
        role: user.role,
        active: user.active,
      });
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({
          message: "An error occurred during login",
          ok: false,
        });
      }

      if (!user) {
        return res.status(401).json({
          message: info?.message || "Invalid credentials",
          ok: false,
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({
            message: "Failed to establish session",
            ok: false,
          });
        }

        return res.json({
          message: "Login successful",
          user: {
            email: user.email,
            role: user.role,
          },
          ok: true,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          message: "Logout failed",
          ok: false
        });
      }
      res.json({ 
        message: "Logout successful",
        ok: true
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "Not authenticated",
        ok: false
      });
    }
    res.json({
      user: req.user,
      ok: true
    });
  });
}