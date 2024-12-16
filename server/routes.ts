import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq, desc, and, or, like } from "drizzle-orm";
import {
  accounts,
  transactions,
  patterns,
  historicalMatches,
  settings,
  users,
} from "@db/schema";
import multer from "multer";
import { parse as parseCsv } from "csv-parse/sync";
import { generatePredictions } from "./services/predictions";
import { 
  getMasterAccountHierarchy,
  createMasterAccount,
  getUserAccountHierarchy,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  copyMasterAccountsToUser
} from "./services/accounts";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Set up authentication first
  setupAuth(app);
  // Master Chart of Accounts routes (Admin only)
  app.get("/api/admin/master-accounts", async (_req, res) => {
    try {
      const result = await getMasterAccountHierarchy();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/master-accounts", async (req, res) => {
    try {
      const account = await createMasterAccount(req.body);
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Chart of Accounts routes
  app.get("/api/accounts", async (req, res) => {
    try {
      if (!req.session?.userId) {
        throw new Error("Not authenticated");
      }
      const result = await getUserAccountHierarchy(req.session.userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      if (!req.session?.userId) {
        throw new Error("Not authenticated");
      }
      const account = await createUserAccount({
        ...req.body,
        userId: req.session.userId
      });
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        throw new Error("Not authenticated");
      }
      const account = await updateUserAccount(
        req.session.userId,
        Number(req.params.id),
        req.body
      );
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        throw new Error("Not authenticated");
      }
      await deleteUserAccount(req.session.userId, Number(req.params.id));
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (_req, res) => {
    try {
      const result = await db.query.transactions.findMany({
        orderBy: desc(transactions.date),
        with: {
          account: true,
        },
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/:type", upload.single("file"), async (req, res) => {
    try {
      const { type } = req.params;
      const file = req.file;
      
      if (!file) {
        throw new Error("No file uploaded");
      }

      // Save the buffer to a temporary file
      const tempFilePath = `/tmp/${file.originalname}`;
      await fs.promises.writeFile(tempFilePath, file.buffer);

      let result;
      switch (type) {
        case "chart-of-accounts":
          await importChartOfAccounts(tempFilePath);
          result = await getAccountHierarchy();
          break;
        
        case "bank-statement":
          const bankData = await importBankStatement(tempFilePath);
          const insertedTransactions = await db.insert(transactions)
            .values(bankData.map(record => ({
              date: record.date,
              description: record.description,
              amount: record.amount,
              reference: record.reference,
            })))
            .returning();
          result = insertedTransactions;
          break;
        
        case "trial-balance":
          result = await importTrialBalance(tempFilePath);
          break;

        default:
          throw new Error(`Unknown import type: ${type}`);
      }

      // Clean up temp file
      await fs.promises.unlink(tempFilePath);
      
      res.json(result);
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const [transaction] = await db
        .update(transactions)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, Number(req.params.id)))
        .returning();

      // Update historical matches if explanation is provided
      if (req.body.explanation && transaction.description) {
        await db
          .insert(historicalMatches)
          .values({
            transactionDescription: transaction.description,
            explanation: req.body.explanation,
            accountId: req.body.accountId,
          })
          .onConflictDoUpdate({
            target: [
              historicalMatches.transactionDescription,
              historicalMatches.accountId,
            ],
            set: {
              frequency: db.sql`${historicalMatches.frequency} + 1`,
              lastUsed: new Date(),
            },
          });
      }

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Prediction routes
  app.get("/api/predictions", async (req, res) => {
    try {
      const transactionId = Number(req.query.transactionId);
      const transaction = await db.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const predictions = await generatePredictions(transaction);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const result = await db.query.users.findMany({
        orderBy: desc(users.createdAt),
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const [user] = await db.insert(users)
        .values({
          userId: req.body.userId,
          email: req.body.email,
          password: req.body.password, // Note: Should hash password in production
          role: req.body.role || "user",
        })
        .returning();
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stats routes
  app.get("/api/stats", async (_req, res) => {
    try {
      const totalTransactions = await db.query.transactions.findMany();
      const analyzedTransactions = await db.query.transactions.findMany({
        where: and(
          transactions.accountId.notNull(),
          transactions.explanation.notNull()
        ),
      });

      const correctPredictions = await db.query.transactions.findMany({
        where: and(
          transactions.predictedBy.notNull(),
          transactions.confidence.gte(0.8)
        ),
      });

      const predictionAccuracy =
        totalTransactions.length > 0
          ? (correctPredictions.length / totalTransactions.length) * 100
          : 0;

      // Get monthly transaction volume using raw SQL for date functions
      const monthlyVolume = await db.execute(
        `SELECT 
          date_trunc('month', date)::text as month,
          COUNT(*) as count
        FROM transactions
        GROUP BY date_trunc('month', date)
        ORDER BY date_trunc('month', date)`
      );

      res.json({
        totalTransactions: totalTransactions.length,
        analyzedTransactions: analyzedTransactions.length,
        predictionAccuracy: Math.round(predictionAccuracy),
        monthlyVolume: monthlyVolume.rows,
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
