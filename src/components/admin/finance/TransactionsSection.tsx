
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, CalendarIcon, ArrowUpRight, ArrowDownLeft, ChevronsUpDown, Search } from 'lucide-react';
import { formatter } from '@/lib/utils';

const TransactionsSection = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  
  const [filters, setFilters] = useState({
    type: '',
    account_id: '',
    category_id: '',
    date_from: '',
    date_to: '',
    search: '',
  });
  
  const [formData, setFormData] = useState({
    amount: '',
    type: 'Expense',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    note: '',
    created_by: 'Admin',
  });
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions
      let query = supabase
        .from('transactions')
        .select(`
          *,
          categories(name, type),
          accounts(name)
        `)
        .order('date', { ascending: false });
        
      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.account_id) {
        query = query.eq('account_id', filters.account_id);
      }
      
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      
      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }
      
      if (filters.search) {
        query = query.ilike('note', `%${filters.search}%`);
      }
      
      const { data: transactionsData, error: transactionsError } = await query;
      
      if (transactionsError) throw transactionsError;
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      
      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('balance', true)
        .order('name');
        
      if (accountsError) throw accountsError;
      
      setTransactions(transactionsData || []);
      setCategories(categoriesData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [filters]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };
  
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setFormData(prev => ({
      ...prev,
      date: format(selectedDate, 'yyyy-MM-dd'),
    }));
  };
  
  const handleAddTransaction = async () => {
    try {
      if (!formData.amount || !formData.category_id || !formData.account_id) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', formData.account_id)
        .single();
        
      if (accountError) throw accountError;
      
      // For expenses, ensure account has enough balance
      if (formData.type === 'Expense' && account.balance < formData.amount) {
        toast.error('Insufficient balance in selected account');
        return;
      }
      
      // Add transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([formData]);
        
      if (transactionError) throw transactionError;
      
      // Update account balance
      const balanceChange = formData.type === 'Income' ? formData.amount : -formData.amount;
      
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: account.balance + balanceChange })
        .eq('id', formData.account_id);
        
      if (updateError) throw updateError;
      
      toast.success('Transaction added successfully');
      fetchData();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };
  
  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'Expense',
      category_id: '',
      date: new Date().toISOString().split('T')[0],
      account_id: '',
      note: '',
      created_by: 'Admin',
    });
  };
  
  const resetFilters = () => {
    setFilters({
      type: '',
      account_id: '',
      category_id: '',
      date_from: '',
      date_to: '',
      search: '',
    });
  };
  
  if (loading && transactions.length === 0 && categories.length === 0 && accounts.length === 0) {
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
              <Plus className="mr-2 h-4 w-4" />
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
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => handleSelectChange('category_id', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => 
                        formData.type === 'Transfer' || 
                        cat.type.toLowerCase() === formData.type.toLowerCase()
                      )
                      .map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="account" className="text-right">Account</Label>
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
                        {account.name} ({formatter.format(account.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Date</Label>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="note" className="text-right">Note</Label>
                <Textarea 
                  id="note" 
                  name="note" 
                  value={formData.note} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="Transaction details"
                />
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
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-type">Transaction Type</Label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All Types</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-account">Account</Label>
              <Select 
                value={filters.account_id} 
                onValueChange={(value) => handleFilterChange('account_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-accounts">All Accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-category">Category</Label>
              <Select 
                value={filters.category_id} 
                onValueChange={(value) => handleFilterChange('category_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="filter-search">Search</Label>
              <div className="relative">
                <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="filter-search" 
                  value={filters.search} 
                  onChange={(e) => handleFilterChange('search', e.target.value)} 
                  className="pl-10 mt-1" 
                  placeholder="Search in transaction notes..."
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Account</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Note</th>
                  <th className="text-right p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        {transaction.type === 'Income' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                        ) : transaction.type === 'Expense' ? (
                          <ArrowDownLeft className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-blue-500 mr-1" />
                        )}
                        {transaction.type}
                      </div>
                    </td>
                    <td className="p-3">{transaction.accounts?.name || 'N/A'}</td>
                    <td className="p-3">{transaction.categories?.name || 'N/A'}</td>
                    <td className="p-3">{transaction.note || '-'}</td>
                    <td className={`p-3 text-right font-medium ${
                      transaction.type === 'Income' 
                        ? 'text-green-600' 
                        : transaction.type === 'Expense' 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                    }`}>
                      {transaction.type === 'Income' ? '+' : transaction.type === 'Expense' ? '-' : ''}
                      {formatter.format(transaction.amount)}
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
