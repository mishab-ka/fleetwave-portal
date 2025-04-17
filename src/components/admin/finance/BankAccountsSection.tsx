
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, ExternalLink, Ban } from 'lucide-react';
import { formatter } from '@/lib/utils';

const BankAccountsSection = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    account_number: '',
    type: 'Savings',
    balance: 0,
  });
  
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'balance' ? parseFloat(value) || 0 : value,
    }));
  };
  
  const handleTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      type: value,
    }));
  };
  
  const handleAddAccount = async () => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .insert([formData]);
        
      if (error) throw error;
      
      toast.success('Bank account added successfully');
      fetchAccounts();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast.error('Failed to add bank account');
    }
  };
  
  const handleEditAccount = async () => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update(formData)
        .eq('id', selectedAccount.id);
        
      if (error) throw error;
      
      toast.success('Bank account updated successfully');
      fetchAccounts();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast.error('Failed to update bank account');
    }
  };
  
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success(`Bank account ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchAccounts();
    } catch (error) {
      console.error('Error toggling bank account status:', error);
      toast.error('Failed to update bank account status');
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      account_number: '',
      type: 'Savings',
      balance: 0,
    });
    setSelectedAccount(null);
  };
  
  const openEditDialog = (account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      account_number: account.account_number,
      type: account.type,
      balance: account.balance,
    });
    setIsEditDialogOpen(true);
  };
  
  if (loading && accounts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Bank Accounts</h2>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Bank Account</DialogTitle>
              <DialogDescription>
                Enter the details of the new bank account.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Bank Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="HDFC Bank"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="account_number" className="text-right">Account Number</Label>
                <Input 
                  id="account_number" 
                  name="account_number" 
                  value={formData.account_number} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="XXXX XXXX XXXX 1234"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Account Type</Label>
                <Select 
                  name="type" 
                  value={formData.type} 
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="Wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="balance" className="text-right">Opening Balance</Label>
                <Input 
                  id="balance" 
                  name="balance" 
                  type="number" 
                  value={formData.balance} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddAccount} className="bg-fleet-purple hover:bg-fleet-purple-dark">Add Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className={`${!account.active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{account.name}</CardTitle>
                  <CardDescription>
                    {account.type} | {account.account_number}
                  </CardDescription>
                </div>
                <div>
                  {account.active ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Active</span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Inactive</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold">{formatter.format(account.balance)}</div>
              <p className="text-xs text-muted-foreground">Current Balance</p>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openEditDialog(account)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant={account.active ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleToggleStatus(account.id, account.active)}
                >
                  {account.active ? (
                    <>
                      <Ban className="h-4 w-4 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update the details of the bank account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Bank Name</Label>
              <Input 
                id="edit-name" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-account_number" className="text-right">Account Number</Label>
              <Input 
                id="edit-account_number" 
                name="account_number" 
                value={formData.account_number} 
                onChange={handleInputChange} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-type" className="text-right">Account Type</Label>
              <Select 
                name="type" 
                value={formData.type} 
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-balance" className="text-right">Current Balance</Label>
              <Input 
                id="edit-balance" 
                name="balance" 
                type="number" 
                value={formData.balance} 
                onChange={handleInputChange} 
                className="col-span-3" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditAccount} className="bg-fleet-purple hover:bg-fleet-purple-dark">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {accounts.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <p className="text-lg text-gray-500 mb-4">No bank accounts found</p>
          <Button 
            className="bg-fleet-purple hover:bg-fleet-purple-dark mx-auto"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Account
          </Button>
        </Card>
      )}
    </div>
  );
};

export default BankAccountsSection;
