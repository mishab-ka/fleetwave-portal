
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, CalendarIcon } from 'lucide-react';
import { formatter } from '@/lib/utils';

const AssetsLiabilitiesSection = () => {
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assets');
  const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false);
  const [isAddLiabilityDialogOpen, setIsAddLiabilityDialogOpen] = useState(false);
  const [assetDate, setAssetDate] = useState(new Date());
  const [liabilityDate, setLiabilityDate] = useState(new Date());
  
  const [assetFormData, setAssetFormData] = useState({
    type: '',
    value: '',
    description: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  
  const [liabilityFormData, setLiabilityFormData] = useState({
    type: 'Loan',
    due_date: new Date().toISOString().split('T')[0],
    amount_due: '',
    status: 'Pending',
    description: '',
  });
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (assetsError) throw assetsError;
      
      // Fetch liabilities
      const { data: liabilitiesData, error: liabilitiesError } = await supabase
        .from('liabilities')
        .select('*')
        .order('due_date', { ascending: true });
        
      if (liabilitiesError) throw liabilitiesError;
      
      setAssets(assetsData || []);
      setLiabilities(liabilitiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load assets and liabilities data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleAssetInputChange = (e) => {
    const { name, value } = e.target;
    setAssetFormData(prev => ({
      ...prev,
      [name]: name === 'value' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };
  
  const handleLiabilityInputChange = (e) => {
    const { name, value } = e.target;
    setLiabilityFormData(prev => ({
      ...prev,
      [name]: name === 'amount_due' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };
  
  const handleAssetDateSelect = (selectedDate) => {
    setAssetDate(selectedDate);
    setAssetFormData(prev => ({
      ...prev,
      purchase_date: format(selectedDate, 'yyyy-MM-dd'),
    }));
  };
  
  const handleLiabilityDateSelect = (selectedDate) => {
    setLiabilityDate(selectedDate);
    setLiabilityFormData(prev => ({
      ...prev,
      due_date: format(selectedDate, 'yyyy-MM-dd'),
    }));
  };
  
  const handleSelectChange = (name, value, formType) => {
    if (formType === 'asset') {
      setAssetFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setLiabilityFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  
  const handleAddAsset = async () => {
    try {
      if (!assetFormData.type || !assetFormData.value) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const { error } = await supabase
        .from('assets')
        .insert([assetFormData]);
        
      if (error) throw error;
      
      toast.success('Asset added successfully');
      fetchData();
      setIsAddAssetDialogOpen(false);
      resetAssetForm();
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error('Failed to add asset');
    }
  };
  
  const handleAddLiability = async () => {
    try {
      if (!liabilityFormData.type || !liabilityFormData.amount_due) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const { error } = await supabase
        .from('liabilities')
        .insert([liabilityFormData]);
        
      if (error) throw error;
      
      toast.success('Liability added successfully');
      fetchData();
      setIsAddLiabilityDialogOpen(false);
      resetLiabilityForm();
    } catch (error) {
      console.error('Error adding liability:', error);
      toast.error('Failed to add liability');
    }
  };
  
  const handleDeleteAsset = async (id) => {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Asset deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };
  
  const handleDeleteLiability = async (id) => {
    try {
      const { error } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Liability deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting liability:', error);
      toast.error('Failed to delete liability');
    }
  };
  
  const handleUpdateLiabilityStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('liabilities')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success(`Liability marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error('Error updating liability status:', error);
      toast.error('Failed to update liability status');
    }
  };
  
  const resetAssetForm = () => {
    setAssetFormData({
      type: '',
      value: '',
      description: '',
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setAssetDate(new Date());
  };
  
  const resetLiabilityForm = () => {
    setLiabilityFormData({
      type: 'Loan',
      due_date: new Date().toISOString().split('T')[0],
      amount_due: '',
      status: 'Pending',
      description: '',
    });
    setLiabilityDate(new Date());
  };
  
  const calculateTotals = () => {
    const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + parseFloat(liability.amount_due || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    return {
      totalAssets,
      totalLiabilities,
      netWorth,
    };
  };
  
  const { totalAssets, totalLiabilities, netWorth } = calculateTotals();
  
  if (loading && assets.length === 0 && liabilities.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Assets & Liabilities</h2>
      
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalAssets)}</div>
            <p className="text-xs text-muted-foreground">Current valuation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Liabilities</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalLiabilities)}</div>
            <p className="text-xs text-muted-foreground">Outstanding dues</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Net Worth</CardTitle>
            <div className={netWorth >= 0 ? "text-green-500" : "text-red-500"}>
              {netWorth >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatter.format(netWorth)}
            </div>
            <p className="text-xs text-muted-foreground">Assets - Liabilities</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Assets and Liabilities Tabs */}
      <Tabs defaultValue="assets" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          </TabsList>
          
          {activeTab === 'assets' ? (
            <Dialog open={isAddAssetDialogOpen} onOpenChange={setIsAddAssetDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new asset.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-type" className="text-right">Asset Type</Label>
                    <Input 
                      id="asset-type" 
                      name="type" 
                      value={assetFormData.type} 
                      onChange={handleAssetInputChange} 
                      className="col-span-3" 
                      placeholder="Vehicle, Property, Equipment, etc."
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-value" className="text-right">Value</Label>
                    <Input 
                      id="asset-value" 
                      name="value" 
                      type="number" 
                      value={assetFormData.value} 
                      onChange={handleAssetInputChange} 
                      className="col-span-3" 
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-purchase-date" className="text-right">Purchase Date</Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {assetDate ? format(assetDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={assetDate}
                            onSelect={handleAssetDateSelect}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-description" className="text-right">Description</Label>
                    <Textarea 
                      id="asset-description" 
                      name="description" 
                      value={assetFormData.description} 
                      onChange={handleAssetInputChange} 
                      className="col-span-3" 
                      placeholder="Details about the asset"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddAssetDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddAsset} className="bg-fleet-purple hover:bg-fleet-purple-dark">
                    Add Asset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isAddLiabilityDialogOpen} onOpenChange={setIsAddLiabilityDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Liability
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Liability</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new liability.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="liability-type" className="text-right">Type</Label>
                    <Select 
                      value={liabilityFormData.type} 
                      onValueChange={(value) => handleSelectChange('type', value, 'liability')}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Loan">Loan</SelectItem>
                        <SelectItem value="EMI">EMI</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="liability-amount" className="text-right">Amount Due</Label>
                    <Input 
                      id="liability-amount" 
                      name="amount_due" 
                      type="number" 
                      value={liabilityFormData.amount_due} 
                      onChange={handleLiabilityInputChange} 
                      className="col-span-3" 
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="liability-due-date" className="text-right">Due Date</Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {liabilityDate ? format(liabilityDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={liabilityDate}
                            onSelect={handleLiabilityDateSelect}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="liability-status" className="text-right">Status</Label>
                    <Select 
                      value={liabilityFormData.status} 
                      onValueChange={(value) => handleSelectChange('status', value, 'liability')}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="liability-description" className="text-right">Description</Label>
                    <Textarea 
                      id="liability-description" 
                      name="description" 
                      value={liabilityFormData.description} 
                      onChange={handleLiabilityInputChange} 
                      className="col-span-3" 
                      placeholder="Details about the liability"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddLiabilityDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddLiability} className="bg-fleet-purple hover:bg-fleet-purple-dark">
                    Add Liability
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>All company assets and their current valuations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Asset Type</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-left p-3">Purchase Date</th>
                      <th className="text-right p-3">Value</th>
                      <th className="text-center p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{asset.type}</td>
                        <td className="p-3">{asset.description || '-'}</td>
                        <td className="p-3">
                          {asset.purchase_date ? format(new Date(asset.purchase_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatter.format(asset.value)}
                        </td>
                        <td className="p-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    
                    {assets.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          No assets found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="liabilities">
          <Card>
            <CardHeader>
              <CardTitle>Liabilities</CardTitle>
              <CardDescription>All outstanding loans, EMIs and financial obligations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-left p-3">Due Date</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Amount Due</th>
                      <th className="text-center p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilities.map((liability) => (
                      <tr key={liability.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{liability.type}</td>
                        <td className="p-3">{liability.description || '-'}</td>
                        <td className="p-3">
                          {format(new Date(liability.due_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            liability.status === 'Paid' 
                              ? 'bg-green-100 text-green-800' 
                              : liability.status === 'Overdue' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {liability.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatter.format(liability.amount_due)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center space-x-1">
                            {liability.status !== 'Paid' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleUpdateLiabilityStatus(liability.id, 'Paid')}
                                className="text-green-500 hover:text-green-700 hover:bg-green-50"
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteLiability(liability.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {liabilities.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500">
                          No liabilities found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetsLiabilitiesSection;
