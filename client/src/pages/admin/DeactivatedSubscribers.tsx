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

export function DeactivatedSubscribers() {
  const { data: subscribers } = useQuery<{
    id: number;
    userId: string;
    email: string;
    deactivationDate: string;
    reason: string;
  }[]>({
    queryKey: ["/api/admin/deactivated-subscribers"],
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Deactivated Subscribers</h1>
        <Button>Export List</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Deactivated Subscriber Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Search deactivated subscribers..." 
                className="max-w-sm"
              />
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Deactivation Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers?.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>{subscriber.userId}</TableCell>
                      <TableCell>{subscriber.email}</TableCell>
                      <TableCell>
                        {new Date(subscriber.deactivationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{subscriber.reason}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Reactivate
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
