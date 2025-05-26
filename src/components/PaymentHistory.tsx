
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  IndianRupee, 
  Calendar, 
  ArrowDown, 
  ArrowUp, 
  FilterIcon 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RentStatusBadge } from "@/components/RentStatusBadge";
import { formatter } from "@/lib/utils";

const PaymentHistory = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rent");

  // Fetch rent history
  const { data: rentHistory, isLoading: isLoadingRent } = useQuery({
    queryKey: ['fleet_reports', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_reports')
        .select('*')
        .eq('user_id', user?.id)
        .order('rent_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch balance transactions
  const { data: balanceTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['balanceTransactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_balance_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Fetch user data to get the pending balance
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['userData', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('pending_balance')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isLoading = isLoadingRent || isLoadingTransactions || isLoadingUser;

  // Helper function to get transaction label
  const getTransactionLabel = (type) => {
    switch (type) {
      case 'due':
        return 'Amount Due';
      case 'deposit':
        return 'Deposit Added';
      case 'refund':
        return 'Refund Issued';
      case 'penalty':
        return 'Penalty';
      case 'bonus':
        return 'Bonus';
      default:
        return type;
    }
  };

  // Helper to determine if a transaction is positive or negative
  const isPositiveTransaction = (type) => {
    return ['deposit', 'refund', 'bonus'].includes(type);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple" />
      </div>
    );
  }

  const pendingBalance = userData?.pending_balance || 0;
  const isPendingBalancePositive = pendingBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Pending Balance Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Current Balance</CardTitle>
          <div 
            className={`mt-1 text-2xl font-bold ${
              isPendingBalancePositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatter.format(pendingBalance)}
          </div>
          <div className="text-sm text-muted-foreground">
            {pendingBalance < 0 
              ? "Amount due from driver" 
              : pendingBalance > 0 
                ? "Amount available to driver" 
                : "No pending balance"}
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different history types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="rent" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="rent">Rent History</TabsTrigger>
              <TabsTrigger value="transactions">Balance Transactions</TabsTrigger>
            </TabsList>
            
            {/* Rent History Tab */}
            <TabsContent value="rent">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Online Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentHistory?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {format(new Date(record.rent_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{record.shift}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              record.status === 'approved' ? 'success' :
                              record.status === 'leave' ? 'default' :
                              record.status === 'pending_verification' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell
  className={`whitespace-nowrap ${
    record.rent_paid_amount < 0 ? "text-green-500" : "text-red-500"
  }`}
>
  ₹{(record.rent_paid_amount > 0 ? -record.rent_paid_amount : Math.abs(record.rent_paid_amount)).toLocaleString()}
</TableCell>
                      </TableRow>
                    ))}
                    {(!rentHistory || rentHistory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No rent history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Balance Transactions Tab */}
            <TabsContent value="transactions">
              <div className="space-y-4">
                {balanceTransactions?.map(transaction => {
                  const isPositive = isPositiveTransaction(transaction.type);
                  return (
                    <div key={transaction.id} className="flex items-start p-3 border rounded-md">
                      <div className={`p-2 rounded-full mr-3 ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isPositive ? (
                          <ArrowUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="font-medium">
                            {getTransactionLabel(transaction.type)}
                          </div>
                          <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                          </div>
                        </div>
                        
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transaction.description}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(transaction.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!balanceTransactions || balanceTransactions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No balance transactions found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
