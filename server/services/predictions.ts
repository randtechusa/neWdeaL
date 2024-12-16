import { db } from "@db";
import { eq, like, desc, and } from "drizzle-orm";
import { 
  transactions, 
  patterns, 
  historicalMatches, 
  accounts,
  type Transaction
} from "@db/schema";

interface Prediction {
  explanation: string;
  accountId: number;
  accountName: string;
  confidence: number;
  type: "pattern" | "database" | "ai";
}

// Utility function to calculate text similarity
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Levenshtein distance for fuzzy matching
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s1.length][s2.length];
  return 1 - distance / maxLength;
}

// Get predictions based on pattern matching
async function getPatternPredictions(
  transaction: Transaction
): Promise<Prediction[]> {
  const allPatterns = await db.query.patterns.findMany({
    where: eq(patterns.enabled, true),
    with: {
      account: {
        columns: {
          id: true,
          name: true
        }
      }
    },
  });

  const predictions = allPatterns
    .map((pattern): Prediction | null => {
      let confidence = 0;
      
      switch (pattern.type) {
        case "exact":
          confidence = pattern.pattern === transaction.description ? 1 : 0;
          break;
        case "fuzzy":
          confidence = calculateSimilarity(pattern.pattern, transaction.description);
          break;
        case "keyword":
          confidence = transaction.description.toLowerCase().includes(
            pattern.pattern.toLowerCase()
          )
            ? 0.9
            : 0;
          break;
      }

      if (confidence < 0.5 || !pattern.account) return null;

      return {
        explanation: pattern.explanation ?? "",
        accountId: pattern.accountId,
        accountName: pattern.account.name,
        confidence: Number(pattern.confidence) * confidence,
        type: "pattern",
      };
    })
    .filter((p): p is Prediction => p !== null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return predictions;
}

// Get predictions based on historical data
async function getDatabasePredictions(
  transaction: Transaction
): Promise<Prediction[]> {
  const matches = await db.query.historicalMatches.findMany({
    where: like(
      historicalMatches.transactionDescription,
      `%${transaction.description}%`
    ),
    orderBy: [desc(historicalMatches.frequency), desc(historicalMatches.lastUsed)],
    limit: 3,
    with: {
      account: {
        columns: {
          id: true,
          name: true
        }
      }
    },
  });

  return matches
    .filter((match): match is typeof match & { account: { name: string } } => 
      match.account !== null
    )
    .map((match) => ({
      explanation: match.explanation,
      accountId: match.accountId,
      accountName: match.account.name,
      confidence: Math.min(0.9, 0.5 + (match.frequency / 10)),
      type: "database" as const,
    }));
}

// Get predictions based on simple AI heuristics
async function getAIPredictions(
  transaction: Transaction
): Promise<Prediction[]> {
  const keywords = transaction.description.toLowerCase().split(" ");
  
  const commonPatterns: Record<string, { type: string; confidence: number }> = {
    salary: { type: "income", confidence: 0.9 },
    rent: { type: "expense", confidence: 0.85 },
    interest: { type: "income", confidence: 0.8 },
    payment: { type: "expense", confidence: 0.7 },
    transfer: { type: "asset", confidence: 0.6 },
  };

  const matches = keywords
    .map((word) => commonPatterns[word])
    .filter((match): match is { type: string; confidence: number } => !!match);

  if (matches.length === 0) return [];

  const bestMatch = matches.reduce(
    (prev, current) =>
      current.confidence > prev.confidence ? current : prev,
    matches[0]
  );

  const matchingAccounts = await db.query.accounts.findMany({
    where: eq(accounts.type, bestMatch.type),
    limit: 1,
  });

  if (matchingAccounts.length === 0) return [];

  return [{
    explanation: `AI suggested ${bestMatch.type} based on description`,
    accountId: matchingAccounts[0].id,
    accountName: matchingAccounts[0].name,
    confidence: bestMatch.confidence,
    type: "ai",
  }];
}

export async function generatePredictions(
  transaction: Transaction
): Promise<Prediction[]> {
  const [patternPredictions, databasePredictions, aiPredictions] =
    await Promise.all([
      getPatternPredictions(transaction),
      getDatabasePredictions(transaction),
      getAIPredictions(transaction),
    ]);

  return [...patternPredictions, ...databasePredictions, ...aiPredictions]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
