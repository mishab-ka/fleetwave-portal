
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlusSquare, FolderIcon, FolderPlus } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  type: string;
  created_at?: string;
}

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'income',
  });
  
  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('type')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'income',
    });
  };
  
  const handleAddCategory = async () => {
    try {
      if (!formData.name) {
        toast.error('Please enter a category name');
        return;
      }
      
      const { error } = await supabase
        .from('categories')
        .insert([{
          name: formData.name,
          type: formData.type,
        }]);
        
      if (error) throw error;
      
      toast.success('Category added successfully');
      fetchCategories();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
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
        <h2 className="text-3xl font-bold">Transaction Categories</h2>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new transaction category for income or expenses.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  className="col-span-3" 
                  placeholder="Category name"
                />
              </div>
              
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
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCategory} className="bg-fleet-purple hover:bg-fleet-purple-dark">
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-green-100 text-green-700 p-2 rounded-full mr-2">
                <FolderIcon className="h-5 w-5" />
              </span>
              Income Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <ul className="space-y-2">
                {categories.filter(cat => cat.type === 'income').map((category) => (
                  <li key={category.id} className="p-3 border rounded-md hover:bg-gray-50">
                    {category.name}
                  </li>
                ))}
                
                {categories.filter(cat => cat.type === 'income').length === 0 && (
                  <li className="p-4 text-center text-gray-500">
                    No income categories found
                  </li>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-red-100 text-red-700 p-2 rounded-full mr-2">
                <FolderIcon className="h-5 w-5" />
              </span>
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <ul className="space-y-2">
                {categories.filter(cat => cat.type === 'expense').map((category) => (
                  <li key={category.id} className="p-3 border rounded-md hover:bg-gray-50">
                    {category.name}
                  </li>
                ))}
                
                {categories.filter(cat => cat.type === 'expense').length === 0 && (
                  <li className="p-4 text-center text-gray-500">
                    No expense categories found
                  </li>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CategoriesSection;
