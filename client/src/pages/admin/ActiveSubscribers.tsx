import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Mail, Calendar } from "lucide-react";

export function ActiveSubscribers() {
  const { data: subscribers } = useQuery<{
    id: number;
    userId: string;
    email: string;
    status: string;
    subscriptionDate: string;
  }[]>({
    queryKey: ["/api/admin/active-subscribers"],
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Active Subscribers</h1>
        <Button>Export List</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Subscriber Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Search subscribers..." 
                className="max-w-sm"
              />
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers?.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>{subscriber.userId}</TableCell>
                      <TableCell>{subscriber.email}</TableCell>
                      <TableCell>{subscriber.status}</TableCell>
                      <TableCell>
                        {new Date(subscriber.subscriptionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Deactivate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
