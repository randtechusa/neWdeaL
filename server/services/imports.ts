import { read as readXLSX, utils as xlsxUtils } from "xlsx";
import type { WorkBook, WorkSheet } from "xlsx";
import { db } from "@db";
import { masterAccounts, type InsertMasterAccount, type MasterAccount } from "@db/schema";
import { eq } from "drizzle-orm";

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

// Helper to standardize and clean text values
function cleanTextValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// Helper to parse numeric values
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Utility function to split array into chunks
function chunks<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function analyzeExcelSheet(filePath: string, sheetName?: string): SheetAnalysis {
  try {
    const workbook: WorkBook = readXLSX(filePath);
    const sheet: WorkSheet = sheetName 
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with header mapping
    const jsonData = xlsxUtils.sheet_to_json(sheet) as Record<string, any>[];
    
    // Analyze structure
    const analysis: SheetAnalysis = {
      headers: [],
      sample: [],
      structure: {}
    };

    if (jsonData.length > 0) {
      const firstRow = jsonData[0];
      analysis.headers = Object.keys(firstRow);
      analysis.sample = jsonData.slice(0, 5);
      
      // Analyze structure
      for (const [key, value] of Object.entries(firstRow)) {
        analysis.structure[key] = {
          type: typeof value,
          sample: value
        };
      }

      // Log analysis for debugging
      console.log('Sheet Analysis:', {
        name: sheetName || workbook.SheetNames[0],
        headers: analysis.headers,
        sampleCount: analysis.sample.length,
        structure: Object.keys(analysis.structure).map(key => ({
          field: key,
          type: analysis.structure[key].type
        }))
      });
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing Excel sheet:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze Excel sheet');
  }
}

export async function importChartOfAccounts(filePath: string): Promise<void> {
  try {
    // First analyze the file structure
    const analysis = analyzeExcelSheet(filePath);
    console.log('Analyzing Chart of Accounts structure:', analysis);

    const workbook = readXLSX(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsxUtils.sheet_to_json(sheet) as Record<string, any>[];

    // Detect column mappings based on common variations
    const columnMap = {
      code: analysis.headers.find(h => 
        /^(code|account.*code|acc.*no|account.*number)/i.test(h)
      ),
      name: analysis.headers.find(h => 
        /^(name|account.*name|description)/i.test(h)
      ),
      type: analysis.headers.find(h => 
        /^(type|account.*type|category)/i.test(h)
      ),
      parent: analysis.headers.find(h => 
        /^(parent|parent.*id|parent.*code)/i.test(h)
      ),
    };

    console.log('Detected column mappings:', columnMap);

    // Map Excel columns to our schema with flexible mapping
    const accountsToInsert = data.map((row): InsertMasterAccount | null => {
      const code = cleanTextValue(row[columnMap.code ?? ''] || row.Code || row.AccountCode);
      const name = cleanTextValue(row[columnMap.name ?? ''] || row.Name || row.AccountName);
      const type = cleanTextValue(row[columnMap.type ?? ''] || row.Type || row.AccountType);

      // Validate required fields
      if (!code || !name || !type) {
        console.warn('Skipping invalid row:', row);
        return null;
      }

      return {
        code,
        name,
        type: type.toLowerCase(),
        description: name, // Using name as description for now
        parentId: null, // We'll update this in a second pass
        active: true
      };
    }).filter((account): account is InsertMasterAccount => account !== null);

    // Insert accounts in batches to handle parent-child relationships
    for (const batch of chunks(accountsToInsert, 50)) {
      await db.insert(masterAccounts).values(batch);
    }

    // Update parent relationships in a second pass
    const allAccounts = await db.query.masterAccounts.findMany();
    const accountMap = new Map(allAccounts.map(acc => [acc.code, acc.id]));

    for (const row of data) {
      const code = cleanTextValue(row[columnMap.code ?? ''] || row.Code || row.AccountCode);
      const parentCode = cleanTextValue(row[columnMap.parent ?? ''] || row.ParentId || row.ParentCode);
      
      if (code && parentCode && accountMap.has(code) && accountMap.has(parentCode)) {
        await db
          .update(masterAccounts)
          .set({ parentId: accountMap.get(parentCode) })
          .where(eq(masterAccounts.code, code));
      }
    }
  } catch (error) {
    console.error('Error importing chart of accounts:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to import chart of accounts');
  }
}

export async function importBankStatement(filePath: string): Promise<any[]> {
  try {
    // First analyze the file structure
    const analysis = analyzeExcelSheet(filePath);
    console.log('Analyzing Bank Statement structure:', analysis);

    const workbook = readXLSX(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsxUtils.sheet_to_json(sheet);

    // Detect column mappings based on common variations
    const columnMap = {
      date: analysis.headers.find(h => 
        /^(date|trans.*date|post.*date|value.*date)/i.test(h)
      ),
      description: analysis.headers.find(h => 
        /^(description|narrative|details|particulars)/i.test(h)
      ),
      amount: analysis.headers.find(h => 
        /^(amount|value|debit|credit)/i.test(h)
      ),
      reference: analysis.headers.find(h => 
        /^(reference|ref|cheque.*no)/i.test(h)
      ),
      balance: analysis.headers.find(h => 
        /^(balance|running.*bal)/i.test(h)
      ),
    };

    console.log('Detected column mappings:', columnMap);

    // Map bank statement format with flexible mapping
    return data.map((row: any) => {
      // Handle date
      let transactionDate = row[columnMap.date] || row.Date || row.TransactionDate;
      if (typeof transactionDate === 'number') {
        // Handle Excel serial dates
        transactionDate = new Date(Math.round((transactionDate - 25569) * 86400 * 1000));
      } else {
        transactionDate = new Date(transactionDate);
      }

      // Handle amounts
      const amountStr = row[columnMap.amount] || row.Amount || row.Value || row.Debit || row.Credit;
      const balanceStr = row[columnMap.balance] || row.Balance || row.RunningBalance;

      // Convert amounts, handling different formats
      const amount = parseNumericValue(amountStr) || 0;
      const balance = parseNumericValue(balanceStr) || 0;

      return {
        date: transactionDate,
        description: cleanTextValue(row[columnMap.description] || row.Description || row.Narrative),
        amount: amount,
        reference: cleanTextValue(row[columnMap.reference] || row.Reference),
        balance: balance,
        // Store original row data for debugging
        _raw: { ...row }
      };
    });
  } catch (error) {
    console.error('Error importing bank statement:', error);
    throw new Error(`Failed to import bank statement: ${error.message}`);
  }
}

export async function importTrialBalance(filePath: string): Promise<any[]> {
  try {
    // First analyze the file structure
    const analysis = analyzeExcelSheet(filePath);
    console.log('Analyzing Trial Balance structure:', analysis);

    const workbook = readXLSX(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsxUtils.sheet_to_json(sheet);

    // Detect column mappings based on common variations
    const columnMap = {
      code: analysis.headers.find(h => 
        /^(code|account.*code|acc.*no)/i.test(h)
      ),
      name: analysis.headers.find(h => 
        /^(name|account.*name|description)/i.test(h)
      ),
      debit: analysis.headers.find(h => 
        /^(debit|dr|debit.*amount)/i.test(h)
      ),
      credit: analysis.headers.find(h => 
        /^(credit|cr|credit.*amount)/i.test(h)
      ),
      balance: analysis.headers.find(h => 
        /^(balance|net|total)/i.test(h)
      ),
    };

    console.log('Detected column mappings:', columnMap);

    // Map trial balance format with flexible mapping
    return data.map((row: any) => {
      // Get values using detected columns or fallbacks
      const code = cleanTextValue(row[columnMap.code] || row.Code || row.AccountCode);
      const name = cleanTextValue(row[columnMap.name] || row.Name || row.AccountName);
      
      // Handle amounts
      const debit = parseNumericValue(row[columnMap.debit] || row.Debit || row.DR) || 0;
      const credit = parseNumericValue(row[columnMap.credit] || row.Credit || row.CR) || 0;
      const balance = parseNumericValue(row[columnMap.balance] || row.Balance || row.Total) || 
                     (debit - credit); // Calculate balance if not provided

      // Skip rows without account code or name
      if (!code || !name) {
        console.warn('Skipping invalid row:', row);
        return null;
      }

      return {
        accountCode: code,
        accountName: name,
        debit: debit,
        credit: credit,
        balance: balance,
        // Store original row data for debugging
        _raw: { ...row }
      };
    }).filter(entry => entry !== null);
  } catch (error) {
    console.error('Error importing trial balance:', error);
    throw new Error(`Failed to import trial balance: ${error.message}`);
  }
}