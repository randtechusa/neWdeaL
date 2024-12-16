import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { Account } from "@db/schema";

interface AccountSelectProps {
  value?: number;
  onValueChange: (value: number) => void;
}

export function AccountSelect({ value, onValueChange }: AccountSelectProps) {
  const { data: accounts } = useQuery({
    queryKey: ["/api/accounts"],
  });

  return (
    <Select
      value={value?.toString()}
      onValueChange={(val) => onValueChange(Number(val))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {accounts?.map((account: Account) => (
          <SelectItem key={account.id} value={account.id.toString()}>
            {account.code} - {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
