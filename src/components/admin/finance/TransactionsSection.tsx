
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { TransactionForm } from './TransactionForm';
import { Badge } from '@/components/ui/badge';
import { formatter } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialStore } from '@/stores/financialStore';

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  account: string;
  account_id: number;
  created_at: string;
}

const TransactionsSection = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { fetchJournalEntries } = useFinancialStore();
  
  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts:account_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        const formattedTransactions = data.map(tx => ({
          ...tx,
          account: tx.accounts?.name || 'Unknown Account'
        }));
        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionFormOpen(true);
  };
  
  const handleDelete = async (id: number) => {
    try {
      // First create a debit/credit journal entry to reverse the transaction
      const transactionToDelete = transactions.find(t => t.id === id);
      
      if (!transactionToDelete) {
        throw new Error('Transaction not found');
      }
      
      // Step 1: Create a journal entry
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: new Date().toISOString().split('T')[0],
          description: `Reversal of transaction: ${transactionToDelete.description}`,
          reference_number: `REV-${id}`,
          posted: true
        })
        .select()
        .single();
      
      if (journalError) {
        throw journalError;
      }
      
      // Get the appropriate account based on transaction type
      const { data: accountData, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id, type')
        .eq('id', transactionToDelete.account_id)
        .single();
      
      if (accountError) {
        throw accountError;
      }
      
      // Find the revenue or expense account based on the transaction type
      const { data: counterpartAccount, error: counterpartError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('type', transactionToDelete.type === 'income' ? 'revenue' : 'expense')
        .limit(1)
        .single();
      
      if (counterpartError) {
        throw counterpartError;
      }
      
      // For income: Credit Asset (decrease), Debit Revenue (decrease)
      // For expense: Debit Asset (increase), Credit Expense (decrease)
      const journalLines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: transactionToDelete.account_id,
          debit_amount: transactionToDelete.type === 'income' ? 0 : parseFloat(transactionToDelete.amount.toString()),
          credit_amount: transactionToDelete.type === 'income' ? parseFloat(transactionToDelete.amount.toString()) : 0,
          description: `Reversal: ${transactionToDelete.type === 'income' ? 'Decrease' : 'Increase'} in account`
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: counterpartAccount.id,
          debit_amount: transactionToDelete.type === 'income' ? parseFloat(transactionToDelete.amount.toString()) : 0,
          credit_amount: transactionToDelete.type === 'income' ? 0 : parseFloat(transactionToDelete.amount.toString()),
          description: `Reversal: ${transactionToDelete.type === 'income' ? 'Decrease' : 'Decrease'} in ${transactionToDelete.type}`
        }
      ];
      
      // Insert journal lines
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);
      
      if (linesError) {
        throw linesError;
      }
      
      // Finally delete the transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      toast.success('Transaction deleted successfully');
      fetchTransactions();
      fetchJournalEntries();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };
  
  const onTransactionComplete = () => {
    setIsTransactionFormOpen(false);
    setEditingTransaction(null);
    fetchTransactions();
    fetchJournalEntries();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <Button
          onClick={() => {
            setEditingTransaction(null);
            setIsTransactionFormOpen(true);
          }}
        >
          Add Transaction
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A record of all financial transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array(5).fill(0).map((_, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found. Create your first transaction to get started.
            </div>
          ) : (
            <Table>
              <TableCaption>Transaction history for the current period</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>{transaction.account}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'income' ? 'success' : 'destructive'}>
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatter.format(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Sheet 
        open={isTransactionFormOpen} 
        onOpenChange={setIsTransactionFormOpen}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</SheetTitle>
            <SheetDescription>
              {editingTransaction 
                ? 'Update the details of your transaction' 
                : 'Enter the details of your new transaction'}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <TransactionForm 
              onComplete={onTransactionComplete}
              existingTransaction={editingTransaction}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TransactionsSection;
