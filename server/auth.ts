import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcryptjs from "bcryptjs";
import { users, type User } from "@db/schema";
import { db } from "@db";
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
  const sessionSettings = {
    secret: process.env.REPL_ID || "analee-secret",
    resave: false,
    saveUninitialized: false,
    name: 'analee.sid',
    rolling: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Set to false to work in development
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: false,
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    }),
  } satisfies session.SessionOptions;

  // Create admin user if it doesn't exist
  createAdminUser().catch(console.error);

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
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          console.log('Attempting login for email:', email);
          
          // Check rate limiting
          if (isRateLimited(email)) {
            console.log('Rate limit exceeded for:', email);
            return done(null, false, {
              message: "Too many login attempts. Please try again later.",
              code: 'RATE_LIMIT_EXCEEDED'
            });
          }
          
          // Validate input format
          if (!email || !password) {
            const missingFields = [];
            if (!email) missingFields.push('email');
            if (!password) missingFields.push('password');
            console.log('Missing credentials:', missingFields.join(', '));
            return done(null, false, { 
              message: `Please provide ${missingFields.join(' and ')}.`,
              code: 'MISSING_CREDENTIALS'
            });
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return done(null, false, { 
              message: "Please enter a valid email address.",
              code: 'INVALID_EMAIL_FORMAT'
            });
          }

          const normalizedEmail = email.toLowerCase().trim();
          
          // Find user with a direct query including all fields
          const user = await db.query.users.findFirst({
            where: eq(users.email, normalizedEmail),
          });

          if (!user) {
            console.log('User not found:', normalizedEmail);
            return done(null, false, { message: "Invalid email or password." });
          }
          
          if (!user.active) {
            console.log('User account deactivated:', normalizedEmail);
            return done(null, false, { message: "Account is deactivated." });
          }

          // Enhanced password verification with detailed logging
          let isMatch = false;
          try {
            console.log('Starting password comparison for user:', normalizedEmail);
            isMatch = await bcryptjs.compare(password, user.password);
            console.log('Password comparison completed. Result:', isMatch);
          } catch (bcryptError) {
            console.error('Password verification failed:', bcryptError);
            return done(null, false, { message: "Authentication error occurred." });
          }
            
          if (!isMatch) {
            console.log('Password mismatch for user:', normalizedEmail);
            return done(null, false, { message: "Invalid email or password." });
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

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }

      if (!user.active) {
        console.log('Inactive user during deserialization:', id);
        return done(null, false);
      }

      done(null, {
        id: user.id,
        userId: user.userId,
        email: user.email,
        role: user.role,
        active: user.active
      });
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

app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: { id: user.id, email: user.email, role: user.role }
        });
      });
    })(req, res, next);
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
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'festusa@cnbs.co.za'))
      .limit(1);

    if (!existingAdmin) {
      const hashedPassword = await bcryptjs.hash('admin@123', 10);
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

      // Copy master accounts for admin user
      await copyMasterAccountsToUser(newUser.id);
      console.log('Admin user created successfully:', newUser.email);
    } else {
      console.log('Admin user already exists:', existingAdmin.email);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    console.error('Error details:', error);
  }
}