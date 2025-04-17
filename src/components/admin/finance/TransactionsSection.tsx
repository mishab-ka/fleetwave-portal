
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlusSquare, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { formatter } from '@/lib/utils';

// Define interfaces for the transaction-related data
interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  date: string;
  created_at: string;
  account_id: number;
  category_id: number;
  accounts?: Account;
  categories?: Category;
}

interface TransactionWithRelations extends Transaction {
  accounts: Account;
  categories: Category;
}

const TransactionsSection = () => {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'income',
    date: new Date(),
    account_id: '',
    category_id: '',
  });
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts:account_id (id, name, type, balance),
          categories:category_id (id, name, type)
        `)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        // Transform the data to match the Transaction interface
        const formattedTransactions = data.map(item => ({
          ...item,
          accounts: item.accounts as Account,
          categories: item.categories as Category
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
  
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance');
        
      if (error) throw error;
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    }
  };
  
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type');
        
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value,
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date: date,
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
      category_id: '',
    });
  };
  
  const handleAddTransaction = async () => {
    try {
      if (!formData.description || !formData.amount || !formData.date || !formData.account_id || !formData.category_id) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const { error } = await supabase
        .from('transactions')
        .insert([{
          description: formData.description,
          amount: formData.amount,
          type: formData.type,
          date: formData.date.toISOString(),
          account_id: parseInt(formData.account_id),
          category_id: parseInt(formData.category_id),
        }]);
        
      if (error) throw error;
      
      toast.success('Transaction added successfully');
      fetchTransactions();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
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
                <Input 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="Transaction description"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  value={formData.amount} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="0.00"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
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
                <DatePicker
                  date={formData.date}
                  onSelect={handleDateChange}
                  defaultValue={formData.date}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="account_id" className="text-right">Account</Label>
                <Select 
                  value={formData.account_id} 
                  onValueChange={(value) => handleSelectChange('account_id', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_id" className="text-right">Category</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => handleSelectChange('category_id', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
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
      </div>
      
      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions List</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Account</th>
                  <th className="text-left p-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{transaction.description}</td>
                    <td className="p-3 font-medium">
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatter.format(transaction.amount)}
                    </td>
                    <td className="p-3 capitalize">{transaction.type}</td>
                    <td className="p-3">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {transaction.accounts?.name}
                    </td>
                    <td className="p-3">
                      {transaction.categories?.name}
                    </td>
                  </tr>
                ))}
                
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsSection;
