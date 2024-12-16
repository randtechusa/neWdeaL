import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      session: {
        userId?: number;
      } & Express.Session;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

// Middleware to protect chart of accounts modifications
export function protectChartOfAccounts(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only admins can modify master accounts
  if (req.path.includes('/admin/master-accounts') && req.method !== 'GET' && req.user?.role !== 'admin') {
    return res.status(403).json({ 
      message: "Only administrators can modify the master chart of accounts"
    });
  }

  // Regular users can only modify their own accounts
  if (req.path.includes('/accounts') && req.user && req.user.id) {
    req.session.userId = req.user.id;
  }

  next();
}