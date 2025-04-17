
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IndianRupee, Plus, Minus, CreditCard, ArrowUpRight, ArrowDownRight, Award, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BalanceTransactionsProps {
  driverId: string;
  currentBalance: number;
  onBalanceUpdate: () => void;
}

export const BalanceTransactions = ({ driverId, currentBalance, onBalanceUpdate }: BalanceTransactionsProps) => {
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [type, setType] = React.useState<string>('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    fetchTransactions();
  }, [driverId]);

  const fetchTransactions = async () => {
    try {
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const numericAmount = parseFloat(amount);
      const { error: transactionError } = await supabase
        .from('driver_balance_transactions')
        .insert({
          user_id: driverId,
          amount: numericAmount,
          type,
          description,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (transactionError) throw transactionError;

      // Update user's pending balance
      const balanceChange = type === 'due' || type === 'penalty' ? numericAmount : -numericAmount;
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          pending_balance: currentBalance + balanceChange 
        })
        .eq('id', driverId);

      if (updateError) throw updateError;

      toast.success('Transaction recorded successfully');
      fetchTransactions();
      onBalanceUpdate();
      setAmount('');
      setType('');
      setDescription('');
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast.error('Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'due':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'deposit':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'refund':
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
      case 'penalty':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'bonus':
        return <Award className="h-4 w-4 text-green-500" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Balance Transactions</span>
          <div className="flex items-center text-lg">
            <IndianRupee className="h-4 w-4" />
            <span className={currentBalance > 0 ? 'text-red-500' : 'text-green-500'}>
              {Math.abs(currentBalance)}
            </span>
          </div>
        </CardTitle>
        <CardDescription>
          Manage driver's balance and view transaction history
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Add Transaction</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due">Due Amount</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="penalty">Penalty</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : 'Record Transaction'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium capitalize">{transaction.type}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(transaction.created_at), 'PPpp')}
                        </p>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {transaction.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center font-medium ${
                      ['due', 'penalty'].includes(transaction.type) 
                        ? 'text-red-500' 
                        : 'text-green-500'
                    }`}>
                      <IndianRupee className="h-3 w-3 mr-0.5" />
                      {transaction.amount}
                    </div>
                  </div>
                ))}

                {transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
