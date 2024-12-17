import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Plus, Edit2, Trash2, Upload, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import type { MasterAccount, UserAccount } from "@db/schema";

type Account = MasterAccount | UserAccount;
type AccountFormData = {
  code: string;
  name: string;
  type: string;
  parentId?: string;
  description?: string;
};

export function ChartOfAccounts() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: [isAdmin ? "/api/admin/master-accounts" : "/api/accounts"],
  });

  const form = useForm<AccountFormData>({
    defaultValues: {
      code: "",
      name: "",
      type: "",
      parentId: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const res = await fetch(isAdmin ? "/api/admin/master-accounts" : "/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isAdmin ? "/api/admin/master-accounts" : "/api/accounts"] });
      setIsOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/${isAdmin ? 'admin/master-accounts' : 'accounts'}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isAdmin ? "/api/admin/master-accounts" : "/api/accounts"] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const accountTypes = [
    "asset",
    "liability",
    "equity",
    "income",
    "expense",
  ];

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/import/chart-of-accounts', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Handle structured error responses
        if (data.code && data.message) {
          throw {
            code: data.code,
            message: data.message,
            details: data.details
          };
        }
        throw new Error('Failed to import chart of accounts');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/master-accounts'] });
      setUploadDialogOpen(false);
      toast({
        title: "Success",
        description: "Chart of accounts imported successfully",
      });
    },
    onError: (error: any) => {
      // Handle structured error responses
      if (error.code) {
        let description = error.message;
        
        // Add details if available
        if (error.details) {
          if (error.details.row) {
            description += `\nRow: ${error.details.row}`;
          }
          if (error.details.column) {
            description += `\nColumn: ${error.details.column}`;
          }
          if (error.details.value) {
            description += `\nInvalid value: ${error.details.value}`;
          }
          if (error.details.expected) {
            description += `\nExpected: ${error.details.expected}`;
          }
        }

        toast({
          variant: "destructive",
          title: getFriendlyErrorTitle(error.code),
          description: description,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Import Error",
          description: error.message || 'An error occurred while importing',
        });
      }
    },
  });

  // Helper function to convert error codes to user-friendly titles
  const getFriendlyErrorTitle = (code: string) => {
    const titles: Record<string, string> = {
      'INVALID_FILE_TYPE': 'Invalid File Type',
      'EMPTY_WORKBOOK': 'Empty Spreadsheet',
      'MISSING_REQUIRED_COLUMNS': 'Missing Required Columns',
      'INVALID_DATA_FORMAT': 'Invalid Data Format',
      'DUPLICATE_ACCOUNT_CODE': 'Duplicate Account Code'
    };
    return titles[code] || 'Import Error';
  };

  const onSubmit = async (data: AccountFormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Chart of Accounts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Please upload an Excel file (.xlsx, .xls) containing your chart of accounts.
                    The file must include the following columns:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Links</li>
                      <li>Category</li>
                      <li>Sub Category</li>
                      <li>Accounts</li>
                      <li>Account Name</li>
                    </ul>
                  </div>
                  
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={uploadMutation.isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadMutation.mutateAsync(file);
                        }
                      }}
                    />
                    {uploadMutation.isPending && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading and validating file...
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit Account" : "Create Account"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {editingAccount ? "Update" : "Create"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Links</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Sub Category</TableHead>
            <TableHead>Accounts</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts?.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => window.open(`/accounts/${account.id}`, '_blank')}
                >
                  View
                </Button>
              </TableCell>
              <TableCell>{account.type}</TableCell>
              <TableCell>{account.parentId ? 'Sub' : 'Main'}</TableCell>
              <TableCell>{account.code}</TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
