import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { eq, desc, and, or, like } from "drizzle-orm";
import {
  accounts,
  transactions,
  patterns,
  historicalMatches,
  settings,
} from "@db/schema";
import multer from "multer";
import { parse as parseCsv } from "csv-parse/sync";
import { generatePredictions } from "./services/predictions";
import { 
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountHierarchy
} from "./services/accounts";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Chart of Accounts routes
  app.get("/api/accounts", async (_req, res) => {
    try {
      const result = await getAccountHierarchy();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const account = await createAccount(req.body);
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      const account = await updateAccount(Number(req.params.id), req.body);
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      await deleteAccount(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
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

  app.post("/api/transactions/upload", upload.single("file"), async (req, res) => {
    try {
      const fileContent = req.file?.buffer.toString();
      if (!fileContent) {
        throw new Error("No file uploaded");
      }

      const records = parseCsv(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });

      const insertedTransactions = await db.insert(transactions).values(
        records.map((record: any) => ({
          date: new Date(record.date),
          description: record.description,
          amount: parseFloat(record.amount),
        }))
      ).returning();

      res.json(insertedTransactions);
    } catch (error) {
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

  // Stats routes
  app.get("/api/stats", async (_req, res) => {
    try {
      const [totalTransactions] = await db
        .select({ count: db.fn.count() })
        .from(transactions);

      const [analyzedTransactions] = await db
        .select({ count: db.fn.count() })
        .from(transactions)
        .where(
          and(
            transactions.accountId.isNotNull(),
            transactions.explanation.isNotNull()
          )
        );

      // Calculate prediction accuracy
      const [correctPredictions] = await db
        .select({ count: db.fn.count() })
        .from(transactions)
        .where(
          and(
            transactions.predictedBy.isNotNull(),
            transactions.confidence.gte(0.8)
          )
        );

      const predictionAccuracy =
        totalTransactions.count > 0
          ? (Number(correctPredictions.count) / Number(totalTransactions.count)) *
            100
          : 0;

      // Get monthly transaction volume
      const monthlyVolume = await db
        .select({
          month: db.sql`date_trunc('month', ${transactions.date})::text`,
          count: db.fn.count(),
        })
        .from(transactions)
        .groupBy(db.sql`date_trunc('month', ${transactions.date})`)
        .orderBy(db.sql`date_trunc('month', ${transactions.date})`);

      res.json({
        totalTransactions: Number(totalTransactions.count),
        analyzedTransactions: Number(analyzedTransactions.count),
        predictionAccuracy: Math.round(predictionAccuracy),
        monthlyVolume,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
