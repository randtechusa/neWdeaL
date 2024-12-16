import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { format } from "date-fns";
import type { Transaction } from "@db/schema";

interface TransactionTableProps {
  transactions: Transaction[];
  onSelect: (transaction: Transaction) => void;
  onUpdate: (data: Partial<Transaction>) => void;
}

export function TransactionTable({ 
  transactions, 
  onSelect, 
  onUpdate 
}: TransactionTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Explanation</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Confidence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions?.map((transaction) => (
          <TableRow 
            key={transaction.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelect(transaction)}
          >
            <TableCell>
              {format(new Date(transaction.date), "yyyy-MM-dd")}
            </TableCell>
            <TableCell>{transaction.description}</TableCell>
            <TableCell className="text-right">
              {new Intl.NumberFormat("en-ZA", {
                style: "currency",
                currency: "ZAR",
              }).format(Number(transaction.amount))}
            </TableCell>
            <TableCell>{transaction.explanation}</TableCell>
            <TableCell>{transaction.accountId}</TableCell>
            <TableCell>
              {transaction.confidence 
                ? `${(Number(transaction.confidence) * 100).toFixed(0)}%`
                : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
