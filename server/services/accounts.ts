import { db } from "@db";
import { eq } from "drizzle-orm";
import { accounts, type Account, type InsertAccount } from "@db/schema";

// Helper function to build account hierarchy
function buildHierarchy(accounts: Account[]): Account[] {
  const accountMap = new Map<number, Account & { children: Account[] }>();
  const roots: (Account & { children: Account[] })[] = [];

  // First pass: create map of all accounts with empty children arrays
  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [] });
  });

  // Second pass: build hierarchy
  accounts.forEach(account => {
    const node = accountMap.get(account.id)!;
    if (account.parentId && accountMap.has(account.parentId)) {
      accountMap.get(account.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function getAccountHierarchy(): Promise<Account[]> {
  const allAccounts = await db.query.accounts.findMany({
    orderBy: [accounts.code],
    where: accounts.active.equals(true),
  });

  return buildHierarchy(allAccounts);
}

export async function createAccount(data: InsertAccount): Promise<Account> {
  // Validate parent account if specified
  if (data.parentId) {
    const parent = await db.query.accounts.findFirst({
      where: eq(accounts.id, data.parentId),
    });
    if (!parent) {
      throw new Error("Parent account not found");
    }
  }

  // Validate unique code
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.code, data.code),
  });
  if (existing) {
    throw new Error("Account code already exists");
  }

  const [account] = await db.insert(accounts).values(data).returning();
  return account;
}

export async function updateAccount(
  id: number,
  data: Partial<InsertAccount>
): Promise<Account> {
  // Check if account exists
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (!existing) {
    throw new Error("Account not found");
  }

  // Validate code uniqueness if being updated
  if (data.code && data.code !== existing.code) {
    const codeExists = await db.query.accounts.findFirst({
      where: eq(accounts.code, data.code),
    });
    if (codeExists) {
      throw new Error("Account code already exists");
    }
  }

  const [account] = await db
    .update(accounts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id))
    .returning();

  return account;
}

export async function deleteAccount(id: number): Promise<void> {
  // Check for child accounts
  const children = await db.query.accounts.findMany({
    where: eq(accounts.parentId, id),
  });
  if (children.length > 0) {
    throw new Error("Cannot delete account with child accounts");
  }

  // Check for linked transactions
  const linkedTransactions = await db.query.transactions.findFirst({
    where: eq(accounts.id, id),
  });
  if (linkedTransactions) {
    throw new Error("Cannot delete account with linked transactions");
  }

  // Soft delete by setting active = false
  await db
    .update(accounts)
    .set({
      active: false,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));
}
