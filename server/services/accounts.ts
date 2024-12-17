import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { 
  masterAccounts, 
  userAccounts, 
  type MasterAccount,
  type UserAccount,
  type InsertMasterAccount,
  type InsertUserAccount 
} from "@db/schema";

export { 
  type MasterAccount,
  type UserAccount,
  type InsertMasterAccount,
  type InsertUserAccount 
};

// Helper function to build account hierarchy
function buildHierarchy(accounts: (MasterAccount | UserAccount)[]): (MasterAccount | UserAccount)[] {
  const accountMap = new Map<number, (MasterAccount | UserAccount) & { children: (MasterAccount | UserAccount)[] }>();
  const roots: ((MasterAccount | UserAccount) & { children: (MasterAccount | UserAccount)[] })[] = [];

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

// Master Account Operations
export async function getMasterAccountHierarchy(): Promise<MasterAccount[]> {
  const allAccounts = await db.query.masterAccounts.findMany({
    where: eq(masterAccounts.active, true),
    orderBy: [masterAccounts.code],
  });

  return buildHierarchy(allAccounts) as MasterAccount[];
}

export async function createMasterAccount(data: InsertMasterAccount): Promise<MasterAccount> {
  // Validate parent account if specified
  if (data.parentId) {
    const parent = await db.query.masterAccounts.findFirst({
      where: eq(masterAccounts.id, data.parentId),
    });
    if (!parent) {
      throw new Error("Parent account not found");
    }
  }

  // Validate unique code
  const existing = await db.query.masterAccounts.findFirst({
    where: eq(masterAccounts.code, data.code),
  });
  if (existing) {
    throw new Error("Account code already exists");
  }

  const [account] = await db.insert(masterAccounts).values(data).returning();
  return account;
}

// User Account Operations
export async function getUserAccountHierarchy(userId: number): Promise<UserAccount[]> {
  const allAccounts = await db.query.userAccounts.findMany({
    orderBy: [userAccounts.code],
    where: and(
      eq(userAccounts.active, true),
      eq(userAccounts.userId, userId)
    ),
  });

  return buildHierarchy(allAccounts) as UserAccount[];
}

export async function createUserAccount(data: InsertUserAccount): Promise<UserAccount> {
  // Validate parent account if specified
  if (data.parentId) {
    const parent = await db.query.userAccounts.findFirst({
      where: eq(userAccounts.id, data.parentId),
    });
    if (!parent) {
      throw new Error("Parent account not found");
    }
  }

  // Validate unique code for this user
  const existing = await db.query.userAccounts.findFirst({
    where: eq(userAccounts.code, data.code) && eq(userAccounts.userId, data.userId),
  });
  if (existing) {
    throw new Error("Account code already exists for this user");
  }

  const [account] = await db.insert(userAccounts).values(data).returning();
  return account;
}

// Function to copy master accounts to user accounts when a new user registers
export async function copyMasterAccountsToUser(userId: number): Promise<void> {
  const masterAccountsList = await getMasterAccountHierarchy();
  
  // Create a map to store old ID to new ID mappings for updating parent relationships
  const idMap = new Map<number, number>();
  
  // First pass: Create all accounts without parent relationships
  for (const masterAccount of masterAccountsList) {
    const [userAccount] = await db.insert(userAccounts)
      .values({
        userId,
        masterAccountId: masterAccount.id,
        code: masterAccount.code,
        name: masterAccount.name,
        type: masterAccount.type,
        description: masterAccount.description,
        active: true,
      })
      .returning();
      
    idMap.set(masterAccount.id, userAccount.id);
  }
  
  // Second pass: Update parent relationships
  for (const masterAccount of masterAccountsList) {
    if (masterAccount.parentId) {
      const newParentId = idMap.get(masterAccount.parentId);
      const newAccountId = idMap.get(masterAccount.id);
      
      if (newParentId && newAccountId) {
        await db.update(userAccounts)
          .set({ parentId: newParentId })
          .where(eq(userAccounts.id, newAccountId));
      }
    }
  }
}

export async function updateUserAccount(
  userId: number,
  accountId: number,
  data: Partial<InsertUserAccount>
): Promise<UserAccount> {
  // Check if account exists and belongs to user
  const existing = await db.query.userAccounts.findFirst({
    where: eq(userAccounts.id, accountId) && eq(userAccounts.userId, userId),
  });
  if (!existing) {
    throw new Error("Account not found or access denied");
  }

  // Validate code uniqueness if being updated
  if (data.code && data.code !== existing.code) {
    const codeExists = await db.query.userAccounts.findFirst({
      where: eq(userAccounts.code, data.code) && eq(userAccounts.userId, userId),
    });
    if (codeExists) {
      throw new Error("Account code already exists for this user");
    }
  }

  const [account] = await db
    .update(userAccounts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(userAccounts.id, accountId))
    .returning();

  return account;
}

export async function deleteUserAccount(userId: number, accountId: number): Promise<void> {
  // Check if account exists and belongs to user
  const existing = await db.query.userAccounts.findFirst({
    where: eq(userAccounts.id, accountId) && eq(userAccounts.userId, userId),
  });
  if (!existing) {
    throw new Error("Account not found or access denied");
  }

  // Check for child accounts
  const children = await db.query.userAccounts.findMany({
    where: eq(userAccounts.parentId, accountId),
  });
  if (children.length > 0) {
    throw new Error("Cannot delete account with child accounts");
  }

  // Soft delete
  await db
    .update(userAccounts)
    .set({
      active: false,
      updatedAt: new Date(),
    })
    .where(eq(userAccounts.id, accountId));
}
