import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountSelect } from "@/components/AccountSelect";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Brain, Database, FileText } from "lucide-react";
import type { Transaction } from "@db/schema";

interface PredictionCardProps {
  transaction: Transaction;
  onUpdate: (data: Partial<Transaction>) => void;
}

export function PredictionCard({ transaction, onUpdate }: PredictionCardProps) {
  const { data: predictions, isLoading } = useQuery({
    queryKey: [`/api/predictions?transactionId=${transaction.id}`],
  });

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case "pattern":
        return <FileText className="h-4 w-4" />;
      case "database":
        return <Database className="h-4 w-4" />;
      case "ai":
        return <Brain className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis & Predictions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">Transaction Details</h3>
          <div className="text-sm text-muted-foreground">
            {transaction.description}
          </div>
          <div className="text-sm">
            {new Intl.NumberFormat("en-ZA", {
              style: "currency",
              currency: "ZAR",
            }).format(Number(transaction.amount))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Explanation</h3>
          <Input
            value={transaction.explanation || ""}
            onChange={(e) => onUpdate({ explanation: e.target.value })}
            placeholder="Enter explanation"
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Account</h3>
          <AccountSelect
            value={transaction.accountId}
            onValueChange={(accountId) => onUpdate({ accountId })}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Predictions</h3>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading predictions...
              </div>
            ) : predictions?.length ? (
              predictions.map((prediction, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md border"
                >
                  <div className="flex items-center gap-2">
                    {getPredictionIcon(prediction.type)}
                    <div>
                      <div className="text-sm font-medium">
                        {prediction.explanation}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {prediction.accountName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {(prediction.confidence * 100).toFixed(0)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onUpdate({
                          explanation: prediction.explanation,
                          accountId: prediction.accountId,
                          confidence: prediction.confidence,
                          predictedBy: prediction.type,
                        });
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No predictions available
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            onUpdate({
              explanation: transaction.explanation,
            });
          }}
        >
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
