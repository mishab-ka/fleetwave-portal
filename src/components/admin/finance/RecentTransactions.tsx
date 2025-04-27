import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatter } from "@/lib/utils";

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  date: string;
  accounts: { name: string };
  categories: { name: string };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {transaction.description}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>
                      {transaction.accounts?.name || "Unknown Account"}
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      {transaction.categories?.name || "Unknown Category"}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex items-center font-medium ${
                    transaction.type === "expense"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                >
                  {transaction.type === "expense" ? (
                    <ArrowDown className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowUp className="mr-1 h-4 w-4" />
                  )}
                  {formatter.format(transaction.amount)}
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No recent transactions
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;
