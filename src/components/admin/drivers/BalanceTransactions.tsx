
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';

interface BalanceTransactionsProps {
  driverId: string;
  currentBalance: number;
  onBalanceUpdate?: () => void;
}

type TransactionType = 'due' | 'deposit' | 'refund' | 'penalty' | 'bonus';

interface BalanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description?: string;
  created_at: string;
  created_by: string;
}

export const BalanceTransactions = ({ 
  driverId, 
  currentBalance, 
  onBalanceUpdate 
}: BalanceTransactionsProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('due');
  const [isAdding, setIsAdding] = useState(false);
  
  useEffect(() => {
    if (driverId) {
      fetchTransactions();
    }
  }, [driverId]);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_balance_transactions')
        .select('*')
        .eq('user_id', driverId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0 || !transactionType) {
      toast.error('Please enter a valid amount and select a transaction type');
      return;
    }
    
    try {
      setIsAdding(true);
      
      // Determine if this transaction will add or subtract from balance
      const isPositive = ['deposit', 'refund', 'bonus'].includes(transactionType);
      const numericAmount = parseFloat(amount);
      const balanceChange = isPositive ? numericAmount : -numericAmount;
      
      // Insert transaction record
      const { error: txError } = await supabase
        .from('driver_balance_transactions')
        .insert({
          user_id: driverId,
          amount: numericAmount,
          type: transactionType,
          description: description || undefined,
          created_by: user?.id
        });
      
      if (txError) throw txError;
      
      // Update user's pending balance
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          pending_balance: currentBalance + balanceChange 
        })
        .eq('id', driverId);
      
      if (userError) throw userError;
      
      toast.success('Transaction added successfully');
      
      // Reset form
      setAmount('');
      setDescription('');
      
      // Refresh data
      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    } finally {
      setIsAdding(false);
    }
  };

  const getTransactionLabel = (type: TransactionType) => {
    switch (type) {
      case 'due': return 'Amount Due';
      case 'deposit': return 'Deposit Added';
      case 'refund': return 'Refund Issued';
      case 'penalty': return 'Penalty';
      case 'bonus': return 'Bonus';
      default: return type;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Current Balance</CardTitle>
          <div className="mt-1 text-2xl font-bold">
            ₹{currentBalance.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentBalance < 0 
              ? "Amount due from driver" 
              : currentBalance > 0 
                ? "Amount available to driver" 
                : "No pending balance"}
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
          
          {isAdding && (
            <div className="mt-4 p-4 border rounded-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select
                  value={transactionType}
                  onValueChange={(value) => setTransactionType(value as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due">Due (Driver owes)</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="penalty">Penalty</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTransaction}
                  disabled={isAdding}
                >
                  Add Transaction
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p>No transactions found</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {transactions.map((transaction) => {
                  const isPositiveTransaction = ['deposit', 'refund', 'bonus'].includes(transaction.type);
                  
                  return (
                    <div key={transaction.id} className="flex items-start p-3 border rounded-md">
                      <div className={`p-2 rounded-full mr-3 ${
                        isPositiveTransaction ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isPositiveTransaction ? (
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
                          <div className={`font-bold ${
                            isPositiveTransaction ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPositiveTransaction ? '+' : '-'}₹{transaction.amount.toLocaleString()}
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
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
