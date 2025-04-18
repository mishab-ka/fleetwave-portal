
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowDown, ArrowUp, Plus, Edit, Trash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { formatter } from "@/lib/utils";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BalanceTransaction | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

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
      setIsSubmitting(true);

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
      setIsAdding(false);

      // Refresh data
      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('driver_balance_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
      
      toast.success('Transaction deleted successfully');
      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleEditTransaction = async (transaction: BalanceTransaction) => {
    setAmount(transaction.amount.toString());
    setDescription(transaction.description || '');
    setTransactionType(transaction.type);
    setSelectedTransaction(transaction);
    setIsAdding(false);
    setIsEditing(true);
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction || !amount || parseFloat(amount) <= 0 || !transactionType) {
      toast.error('Please enter a valid amount and select a transaction type');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Determine if this transaction will add or subtract from balance
      const isPositive = ['deposit', 'refund', 'bonus'].includes(transactionType);
      const numericAmount = parseFloat(amount);
      
      // Update transaction record
      const { error: txError } = await supabase
        .from('driver_balance_transactions')
        .update({
          amount: numericAmount,
          type: transactionType,
          description: description || undefined
        })
        .eq('id', selectedTransaction.id);

      if (txError) throw txError;
      
      toast.success('Transaction updated successfully');

      // Reset form
      setAmount('');
      setDescription('');
      setIsEditing(false);
      setSelectedTransaction(null);

      // Refresh data
      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionLabel = (type: TransactionType) => {
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

  const isPositiveTransaction = (type: TransactionType) => {
    return ['deposit', 'refund', 'bonus'].includes(type);
  };

  const filteredTransactions = transactions;

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
          <Button variant="outline" onClick={() => setIsAdding(!isAdding)} className="w-full text-base">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
          
          {/* Add Transaction Form - Made responsive */}
          {isAdding && (
            <div className="mt-4 p-4 border rounded-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="Enter amount" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select 
                    value={transactionType} 
                    onValueChange={value => setTransactionType(value as TransactionType)}
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
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input 
                    id="description" 
                    placeholder="Enter description" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddTransaction} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Transaction'}
                </Button>
              </div>
            </div>
          )}

          {/* Edit Transaction Form - Made responsive */}
          {isEditing && selectedTransaction && (
            <div className="mt-4 p-4 border rounded-md space-y-4">
              <h3 className="text-lg font-semibold">Edit Transaction</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={value => setTransactionType(value as TransactionType)}
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input
                    id="edit-description"
                    placeholder="Enter description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {setIsEditing(false); setSelectedTransaction(null);}}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateTransaction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Transaction'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Transaction History Card - Made responsive */}
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
            <div className="hidden md:block">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => {
                      const isPositiveTransaction = ['deposit', 'refund', 'bonus'].includes(transaction.type);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <span className={`flex items-center font-medium ${
                              isPositiveTransaction ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {isPositiveTransaction ? (
                                <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                              )}
                              {formatter.format(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isPositiveTransaction 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getTransactionLabel(transaction.type)}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransaction(transaction)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the transaction.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteTransaction(transaction.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Mobile view for transactions */}
          <div className="md:hidden">
            <ScrollArea className="h-[300px]">
              {filteredTransactions.map((transaction) => {
                const isPositiveTransaction = ['deposit', 'refund', 'bonus'].includes(transaction.type);
                return (
                  <div
                    key={transaction.id}
                    className="border-b border-gray-200 py-4 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`flex items-center font-medium ${
                        isPositiveTransaction ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {isPositiveTransaction ? (
                          <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                        )}
                        {formatter.format(transaction.amount)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isPositiveTransaction 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {getTransactionLabel(transaction.type)}
                      </span>
                    </div>
                    
                    {transaction.description && (
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the transaction.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions found
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
