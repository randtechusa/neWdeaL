import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcryptjs from "bcryptjs";
import { users, type User } from "@db/schema";
import { db } from "@db";
import { config } from "./config";
import { eq } from "drizzle-orm";
import { copyMasterAccountsToUser } from './services/accounts';


// extend express user object with our schema
declare global {
  namespace Express {
    interface User {
      id: number;
      userId: string;
      email: string;
      role: string;
      active: boolean;
    }
  }
}

// Rate limiting implementation
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(email: string): boolean {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  
  const now = Date.now();
  const userAttempts = loginAttempts.get(email);
  
  if (!userAttempts) {
    loginAttempts.set(email, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  
  if (now > userAttempts.resetTime) {
    loginAttempts.set(email, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  
  if (userAttempts.count >= MAX_ATTEMPTS) {
    return true;
  }
  
  userAttempts.count++;
  return false;
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const { session: sessionConfig } = config;
  const sessionSettings = {
    ...sessionConfig,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: false,
      ttl: sessionConfig.cookie?.maxAge || 24 * 60 * 60 * 1000
    }),
    rolling: true
  } satisfies session.SessionOptions;

  // Additional security in production
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Create admin user if it doesn't exist
  createAdminUser().catch(console.error);

  if (app.get("env") === "production") {
    app.set("trust proxy", "1");
    sessionSettings.cookie.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          if (!email || !password) {
            return done(null, false, { message: "Email and password are required" });
          }

          const normalizedEmail = email.toLowerCase().trim();
          console.log('Attempting login for email:', normalizedEmail);
          
          const user = await db.query.users.findFirst({
            where: eq(users.email, normalizedEmail),
          });

          if (!user) {
            console.log('User not found:', normalizedEmail);
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.active) {
            console.log('Account deactivated:', normalizedEmail);
            return done(null, false, { message: "Account is deactivated" });
          }

          try {
            console.log('Starting password comparison for user:', normalizedEmail);
            const isValidPassword = await bcryptjs.compare(password, user.password);
            console.log('Password comparison completed. Result:', isValidPassword);

            if (!isValidPassword) {
              console.log('Invalid password for user:', normalizedEmail);
              return done(null, false, { message: "Invalid email or password" });
            }

            // If we get here, authentication was successful
            console.log('Authentication successful for user:', normalizedEmail);
            return done(null, {
              id: user.id,
              userId: user.userId,
              email: user.email,
              role: user.role,
              active: user.active
            });
          } catch (bcryptError) {
            console.error('Password verification failed:', bcryptError);
            return done(null, false, { message: "Authentication error occurred" });
          }

          console.log(`Login successful for ${user.role} user:`, normalizedEmail);
          
          // Return sanitized user data
          const sanitizedUser = {
            id: user.id,
            userId: user.userId,
            email: user.email,
            role: user.role,
            active: user.active
          };

          return done(null, sanitizedUser);
        } catch (err) {
          console.error('Login error:', err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Optimize user session handling to reduce database queries
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Cache check to prevent unnecessary database queries
      const cachedUser = userCache.get(id);
      if (cachedUser) {
        return done(null, cachedUser);
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      
      if (!user || !user.active) {
        return done(null, false);
      }

      const sanitizedUser = {
        id: user.id,
        userId: user.userId,
        email: user.email,
        role: user.role,
        active: user.active
      };

      // Cache the user data
      userCache.set(id, sanitizedUser);
      done(null, sanitizedUser);
    } catch (err) {
      console.error('Deserialize error:', err);
      done(err);
    }
  });

  // Auth routes
  // Registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, userId } = req.body;

    // Validate required fields
    if (!email || !password || !userId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        userId,
        role: 'user',
        active: true
      })
      .returning();

    try {
      // Copy master accounts for the new user
      console.log('Copying master accounts for new user:', newUser.id);
      await copyMasterAccountsToUser(newUser.id);
      console.log('Successfully copied master accounts for user:', newUser.id);
    } catch (error) {
      console.error('Error copying master accounts:', error);
      return res.status(500).json({ message: "Failed to set up user accounts" });
    }

    // Auto-login after registration
    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error during login after registration" });
      }
      res.json({
        message: "Registration successful",
        user: { id: newUser.id, email: newUser.email, role: newUser.role }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/login", async (req, res, next) => {
    try {
      passport.authenticate("local", async (err: any, user: Express.User, info: IVerifyOptions) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ 
            message: "An error occurred during login",
            ok: false,
            code: 'SYSTEM_ERROR'
          });
        }

        if (!user) {
          return res.status(401).json({ 
            message: info.message || "Invalid credentials",
            ok: false,
            code: 'INVALID_CREDENTIALS'
          });
        }

        await new Promise<void>((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) {
              console.error('Login session error:', err);
              reject(err);
              return;
            }
            resolve();
          });
        });

        const sanitizedUser = {
          id: user.id,
          email: user.email,
          role: user.role,
          userId: user.userId
        };

        return res.json({
          message: "Login successful",
          user: sanitizedUser,
          ok: true
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login process error:', error);
      return res.status(500).json({ 
        message: "An unexpected error occurred",
        ok: false,
        code: 'SYSTEM_ERROR'
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });
}

async function createAdminUser() {
  try {
    // Check for existing admin
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, 'festusa@cnbs.co.za'),
    });

    if (!existingAdmin) {
      console.log('Creating admin user...');
      const hashedPassword = await bcryptjs.hash('admin@123', 10);
      
      // Create admin user
      const [newUser] = await db
        .insert(users)
        .values({
          userId: 'Admin',
          email: 'festusa@cnbs.co.za',
          password: hashedPassword,
          role: 'admin',
          active: true
        })
        .returning();

      if (!newUser) {
        throw new Error('Failed to create admin user');
      }

      console.log('Admin user created successfully:', newUser.email);
      
      // Copy master accounts for admin user
      try {
        await copyMasterAccountsToUser(newUser.id);
        console.log('Master accounts copied for admin user');
      } catch (copyError) {
        console.error('Error copying master accounts:', copyError);
        // Don't throw here, as the user is already created
      }
    } else {
      console.log('Admin user already exists:', existingAdmin.email);
      
      // Ensure admin user has the correct password
      const hashedPassword = await bcryptjs.hash('admin@123', 10);
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          active: true 
        })
        .where(eq(users.id, existingAdmin.id));
      
      console.log('Admin user credentials updated');
    }
  } catch (error) {
    console.error('Error in admin user setup:', error);
    throw error; // Propagate the error to handle it in the setup
  }
}