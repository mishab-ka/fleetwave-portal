import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlusSquare, ArrowUp, ArrowDown, Calendar, Edit, Trash } from 'lucide-react';
import { formatter } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Account, Category, Transaction } from '@/types/accounting';

interface TransactionWithRelations extends Transaction {
  account?: Account;
  category?: Category;
}

const TransactionsSection = () => {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'income',
    date: new Date(),
    account_id: '',
    category_id: ''
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionError) throw transactionError;
      
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*');
      
      if (accountsError) throw accountsError;
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      
      if (categoriesError) throw categoriesError;
      
      const accountsMap = new Map(accountsData?.map(acc => [acc.id, acc]) || []);
      const categoriesMap = new Map(categoriesData?.map(cat => [cat.id, cat]) || []);
      
      const joinedTransactions = transactionData?.map(transaction => ({
        ...transaction,
        account: accountsMap.get(transaction.account_id || 0),
        category: categoriesMap.get(transaction.category_id || 0),
      })) || [];
      
      setTransactions(joinedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date: date
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: 0,
      type: 'income',
      date: new Date(),
      account_id: '',
      category_id: ''
    });
  };

  const handleAddTransaction = async () => {
    try {
      if (!formData.description || !formData.amount || !formData.date || !formData.account_id || !formData.category_id) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          description: formData.description,
          amount: formData.amount,
          type: formData.type,
          date: formData.date.toISOString(),
          account_id: parseInt(formData.account_id),
          category_id: parseInt(formData.category_id)
        }])
        .select()
        .single();
      
      if (transactionError) throw transactionError;
      
      const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.account_id));
      if (!selectedAccount) throw new Error('Account not found');
      
      let newBalance = selectedAccount.balance;
      if (formData.type === 'income') {
        newBalance += formData.amount;
      } else if (formData.type === 'expense') {
        newBalance -= formData.amount;
      }
      
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', formData.account_id);
      
      if (updateError) throw updateError;
      
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .insert([{
          entry_date: formData.date.toISOString(),
          description: formData.description,
          is_posted: true,
          reference_number: `TRANS-${transactionData.id}`
        }])
        .select()
        .single();
      
      if (journalError) throw journalError;
      
      let journalLines = [];
      
      if (formData.type === 'income') {
        journalLines = [
          {
            journal_entry_id: journalData.id,
            account_id: parseInt(formData.account_id),
            debit_amount: formData.amount,
            credit_amount: 0,
            description: 'Asset increase'
          },
          {
            journal_entry_id: journalData.id,
            account_id: parseInt(formData.category_id),
            debit_amount: 0,
            credit_amount: formData.amount,
            description: 'Revenue recorded'
          }
        ];
      } else if (formData.type === 'expense') {
        journalLines = [
          {
            journal_entry_id: journalData.id,
            account_id: parseInt(formData.category_id),
            debit_amount: formData.amount,
            credit_amount: 0,
            description: 'Expense recorded'
          },
          {
            journal_entry_id: journalData.id,
            account_id: parseInt(formData.account_id),
            debit_amount: 0,
            credit_amount: formData.amount,
            description: 'Asset decrease'
          }
        ];
      }
      
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);
      
      if (linesError) throw linesError;
      
      toast.success('Transaction added successfully');
      fetchTransactions();
      fetchAccounts();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };

  const handleEditClick = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setFormData({
      description: transaction.description || '',
      amount: transaction.amount,
      type: transaction.type,
      date: new Date(transaction.date),
      account_id: transaction.account_id.toString(),
      category_id: transaction.category_id.toString()
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTransaction = async () => {
    try {
      if (!selectedTransaction) return;
      if (!formData.description || !formData.amount || !formData.date || !formData.account_id || !formData.category_id) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const oldAmount = selectedTransaction.amount;
      const newAmount = formData.amount;
      const amountDifference = newAmount - oldAmount;
      
      const isAccountChanging = parseInt(formData.account_id) !== selectedTransaction.account_id;
      const isTypeChanging = formData.type !== selectedTransaction.type;
      
      if (isAccountChanging) {
        const oldAccount = accounts.find(acc => acc.id === selectedTransaction.account_id);
        if (oldAccount) {
          let oldAccountNewBalance = oldAccount.balance;
          if (selectedTransaction.type === 'income') {
            oldAccountNewBalance -= oldAmount;
          } else if (selectedTransaction.type === 'expense') {
            oldAccountNewBalance += oldAmount;
          }
          
          await supabase
            .from('accounts')
            .update({ balance: oldAccountNewBalance })
            .eq('id', oldAccount.id);
        }
        
        const newAccount = accounts.find(acc => acc.id === parseInt(formData.account_id));
        if (newAccount) {
          let newAccountNewBalance = newAccount.balance;
          if (formData.type === 'income') {
            newAccountNewBalance += newAmount;
          } else if (formData.type === 'expense') {
            newAccountNewBalance -= newAmount;
          }
          
          await supabase
            .from('accounts')
            .update({ balance: newAccountNewBalance })
            .eq('id', newAccount.id);
        }
      } 
      else if (amountDifference !== 0 || isTypeChanging) {
        const account = accounts.find(acc => acc.id === parseInt(formData.account_id));
        if (account) {
          let newBalance = account.balance;
          
          if (isTypeChanging) {
            if (selectedTransaction.type === 'income') {
              newBalance -= oldAmount;
            } else if (selectedTransaction.type === 'expense') {
              newBalance += oldAmount;
            }
            
            if (formData.type === 'income') {
              newBalance += newAmount;
            } else if (formData.type === 'expense') {
              newBalance -= newAmount;
            }
          } 
          else {
            if (formData.type === 'income') {
              newBalance += amountDifference;
            } else if (formData.type === 'expense') {
              newBalance -= amountDifference;
            }
          }
          
          await supabase
            .from('accounts')
            .update({ balance: newBalance })
            .eq('id', account.id);
        }
      }
      
      const { error } = await supabase
        .from('transactions')
        .update({
          description: formData.description,
          amount: formData.amount,
          type: formData.type,
          date: formData.date.toISOString(),
          account_id: parseInt(formData.account_id),
          category_id: parseInt(formData.category_id)
        })
        .eq('id', selectedTransaction.id);
      
      if (error) throw error;
      
      toast.success('Transaction updated successfully');
      fetchTransactions();
      fetchAccounts();
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      resetForm();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) throw new Error('Transaction not found');
      
      const account = accounts.find(acc => acc.id === transaction.account_id);
      if (account) {
        let newBalance = account.balance;
        if (transaction.type === 'income') {
          newBalance -= transaction.amount;
        } else if (transaction.type === 'expense') {
          newBalance += transaction.amount;
        }
        
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', account.id);
      }
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Transaction deleted successfully');
      fetchTransactions();
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const filteredTransactions = activeTab === "all" ? transactions : transactions.filter(t => t.type === activeTab);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Transactions</h2>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
              <PlusSquare className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Enter the details of the new transaction.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input id="description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3" placeholder="Transaction description" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input id="amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} className="col-span-3" placeholder="0.00" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select value={formData.type} onValueChange={value => setFormData(prev => ({
                ...prev,
                type: value
              }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Date</Label>
                <DatePicker date={formData.date} onSelect={handleDateChange} defaultValue={formData.date} className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="account_id" className="text-right">Account</Label>
                <Select value={formData.account_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                account_id: value
              }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_id" className="text-right">Category</Label>
                <Select value={formData.category_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                category_id: value
              }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddTransaction} className="bg-fleet-purple hover:bg-fleet-purple-dark">
                Add Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update the transaction details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Input id="edit-description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3" placeholder="Transaction description" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-amount" className="text-right">Amount</Label>
                <Input id="edit-amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} className="col-span-3" placeholder="0.00" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">Type</Label>
                <Select value={formData.type} onValueChange={value => setFormData(prev => ({
                ...prev,
                type: value
              }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">Date</Label>
                <DatePicker date={formData.date} onSelect={handleDateChange} defaultValue={formData.date} className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-account_id" className="text-right">Account</Label>
                <Select value={formData.account_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                account_id: value
              }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category_id" className="text-right">Category</Label>
                <Select value={formData.category_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                category_id: value
              }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateTransaction} className="bg-fleet-purple hover:bg-fleet-purple-dark">
                Update Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-64">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <span className={`flex items-center font-medium ${transaction.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                        {transaction.type === 'expense' ? <ArrowDown className="mr-1 h-4 w-4" /> : <ArrowUp className="mr-1 h-4 w-4" />}
                        {formatter.format(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transaction.type === 'expense' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {transaction.type}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>{transaction.account?.name || 'N/A'}</TableCell>
                    <TableCell>{transaction.category?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(transaction)} className="text-gray-600 hover:text-gray-900">
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the transaction.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)} className="bg-red-500 hover:bg-red-600">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsSection;
