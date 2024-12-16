import type { Transaction } from "@db/schema";

interface Prediction {
  explanation: string;
  accountId: number;
  accountName: string;
  confidence: number;
  type: "pattern" | "database" | "ai";
}

export async function getPredictions(
  transaction: Transaction
): Promise<Prediction[]> {
  const res = await fetch(`/api/predictions?transactionId=${transaction.id}`);
  if (!res.ok) throw new Error("Failed to get predictions");
  return res.json();
}
