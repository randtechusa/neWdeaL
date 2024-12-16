import * as XLSX from "xlsx";
import type { WorkBook, WorkSheet } from "xlsx";
import { db } from "@db";
import { accounts, type InsertAccount } from "@db/schema";

interface SheetAnalysis {
  headers: string[];
  sample: Record<string, any>[];
  structure: {
    [key: string]: {
      type: string;
      sample: any;
    };
  };
}

export function analyzeExcelSheet(filePath: string, sheetName?: string): SheetAnalysis {
  try {
    const workbook: WorkBook = XLSX.readFile(filePath);
    const sheet: WorkSheet = sheetName 
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with header mapping
    const jsonData = workbook.SheetNames.map(name => {
      const worksheet = workbook.Sheets[name];
      return {
        name,
        data: XLSX.utils.sheet_to_json(worksheet)
      };
    });

  // Analyze first sheet
  const firstSheet = jsonData[0].data;
  const headers = Object.keys(firstSheet[0] || {});
  const sample = firstSheet.slice(0, 5);
  
  // Analyze structure
  const structure: SheetAnalysis['structure'] = {};
  if (sample.length > 0) {
    const firstRow = sample[0];
    for (const [key, value] of Object.entries(firstRow)) {
      structure[key] = {
        type: typeof value,
        sample: value
      };
    }
  }

  return {
    headers,
    sample,
    structure
  };
}

export async function importChartOfAccounts(filePath: string): Promise<void> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Map Excel columns to our schema
    const accountsToInsert: InsertAccount[] = data.map((row: any) => ({
      code: row.Code?.toString() || row.AccountCode?.toString(),
      name: row.Name || row.AccountName,
      type: row.Type || row.AccountType,
      description: row.Description,
      parentId: row.ParentId || null,
      active: true
    }));

    // Insert accounts in batches to handle parent-child relationships
    for (const batch of chunks(accountsToInsert, 50)) {
      await db.insert(accounts).values(batch);
    }
  } catch (error) {
    console.error('Error importing chart of accounts:', error);
    throw new Error(`Failed to import chart of accounts: ${error.message}`);
  }
}

export async function importBankStatement(filePath: string): Promise<any[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Map bank statement format
    return data.map((row: any) => ({
      date: new Date(row.Date || row.TransactionDate),
      description: row.Description || row.Narrative,
      amount: parseFloat(row.Amount || row.Value || 0),
      reference: row.Reference,
      balance: parseFloat(row.Balance || 0)
    }));
  } catch (error) {
    console.error('Error importing bank statement:', error);
    throw new Error(`Failed to import bank statement: ${error.message}`);
  }
}

export async function importTrialBalance(filePath: string): Promise<any[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Map trial balance format
    return data.map((row: any) => ({
      accountCode: row.Code?.toString() || row.AccountCode?.toString(),
      accountName: row.Name || row.AccountName,
      debit: parseFloat(row.Debit || 0),
      credit: parseFloat(row.Credit || 0),
      balance: parseFloat(row.Balance || 0)
    }));
  } catch (error) {
    console.error('Error importing trial balance:', error);
    throw new Error(`Failed to import trial balance: ${error.message}`);
  }
}

// Utility function to split array into chunks
function chunks<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
