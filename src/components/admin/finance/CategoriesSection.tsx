import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatter } from "@/lib/utils";
import {
  PlusSquare,
  FolderIcon,
  FolderPlus,
  Pencil,
  Trash,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Category {
  id: number;
  name: string;
  type: string;
  parent_category_id?: number;
  category_level?: number;
  category_path?: string;
  subcategories?: Category[];
}

interface CategoryTotal {
  [categoryId: number]: number;
}

const categoryTypes = [
  "income",
  "expense",
  "asset",
  "liability",
  "subcategory",
];

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: "",
    type: "income",
    parent_category_id: "none",
    subcategory_type: "income", // For subcategory type selection
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);

      // First, try to get all categories with subcategory support
      const { data: allCategories, error: allError } = await supabase
        .from("categories")
        .select("*")
        .order("type")
        .order("name");

      if (allError) {
        // If the query fails (e.g., parent_category_id column doesn't exist),
        // fall back to simple category fetching
        console.warn(
          "Subcategory columns not found, using simple category fetch"
        );

        const { data: simpleCategories, error: simpleError } = await supabase
          .from("categories")
          .select("id, name, type")
          .order("type")
          .order("name");

        if (simpleError) throw simpleError;

        // Convert to the expected format without subcategories
        const categoriesWithSubs = (simpleCategories || []).map((category) => ({
          ...category,
          parent_category_id: null,
          category_level: 0,
          category_path: category.name,
          subcategories: [],
        }));

        setCategories(categoriesWithSubs);
        return;
      }

      // If we have subcategory support, organize the data
      if (allCategories) {
        // Separate main categories and subcategories
        const mainCategories = allCategories.filter(
          (cat) => !cat.parent_category_id
        );
        const subcategories = allCategories.filter(
          (cat) => cat.parent_category_id
        );

        // Group subcategories by parent
        const subcategoriesByParent = subcategories.reduce((acc, sub) => {
          if (!acc[sub.parent_category_id]) {
            acc[sub.parent_category_id] = [];
          }
          acc[sub.parent_category_id].push(sub);
          return acc;
        }, {} as Record<string, any[]>);

        // Combine main categories with their subcategories
        const categoriesWithSubs = mainCategories.map((category) => ({
          ...category,
          subcategories: subcategoriesByParent[category.id] || [],
        }));

        setCategories(categoriesWithSubs);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryTotals = async () => {
    try {
      // Fetch all transactions with their category_id
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("category_id, amount");

      if (error) throw error;

      // Calculate totals for each category
      const totals: CategoryTotal = {};
      transactions?.forEach((transaction) => {
        if (transaction.category_id) {
          if (!totals[transaction.category_id]) {
            totals[transaction.category_id] = 0;
          }
          totals[transaction.category_id] += transaction.amount;
        }
      });

      setCategoryTotals(totals);
    } catch (error) {
      console.error("Error fetching category totals:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCategoryTotals();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "income",
      parent_category_id: "none",
      subcategory_type: "income",
    });
    setSelectedCategory(null);
  };

  const handleAddCategory = async () => {
    try {
      if (!formData.name) {
        toast.error("Please enter a category name");
        return;
      }

      const insertData: any = {
        name: formData.name,
        type:
          formData.type === "subcategory"
            ? formData.subcategory_type
            : formData.type,
      };

      // If parent_category_id is provided, set it
      if (
        formData.parent_category_id &&
        formData.parent_category_id !== "none"
      ) {
        // Find the parent category to get its ID
        const parentCategory = categories.find(
          (cat) => cat.id.toString() === formData.parent_category_id
        );
        if (parentCategory) {
          insertData.parent_category_id = parentCategory.id;
        }
      }

      const { error } = await supabase.from("categories").insert([insertData]);

      if (error) throw error;

      toast.success("Category added successfully");
      fetchCategories();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      parent_category_id: category.parent_category_id?.toString() || "none",
      subcategory_type: category.type, // Set subcategory_type to the actual type for editing
    });
    setIsEditDialogOpen(true);
  };

  const handleEditCategory = async () => {
    try {
      if (!selectedCategory || !formData.name) {
        toast.error("Please enter a category name");
        return;
      }

      const updateData: any = {
        name: formData.name,
        type:
          formData.type === "subcategory"
            ? formData.subcategory_type
            : formData.type,
      };

      // If parent_category_id is provided, set it
      if (
        formData.parent_category_id &&
        formData.parent_category_id !== "none"
      ) {
        // Find the parent category to get its ID
        const parentCategory = categories.find(
          (cat) => cat.id.toString() === formData.parent_category_id
        );
        if (parentCategory) {
          updateData.parent_category_id = parentCategory.id;
        }
      } else {
        updateData.parent_category_id = null;
      }

      const { error } = await supabase
        .from("categories")
        .update(updateData)
        .eq("id", selectedCategory.id);

      if (error) throw error;

      toast.success("Category updated successfully");
      fetchCategories();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
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

        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
          </Dialog>

          <Button
            variant="outline"
            className="border-fleet-purple text-fleet-purple hover:bg-fleet-purple hover:text-white"
            onClick={() => {
              setFormData({
                name: "",
                type: "income",
                parent_category_id: "none",
                subcategory_type: "income",
              });
              setIsAddDialogOpen(true);
            }}
          >
            <FolderIcon className="mr-2 h-4 w-4" />
            Add Parent Category
          </Button>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new transaction category for income or expenses.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
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
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory Type Selection - Only show when subcategory is selected */}
              {formData.type === "subcategory" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subcategory_type" className="text-right">
                    Subcategory Type
                  </Label>
                  <Select
                    value={formData.subcategory_type}
                    onValueChange={(value) =>
                      handleSelectChange("subcategory_type", value)
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select subcategory type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["income", "expense", "asset", "liability"].map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parent" className="text-right">
                  Parent
                </Label>
                <Select
                  value={formData.parent_category_id}
                  onValueChange={(value) =>
                    handleSelectChange("parent_category_id", value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No parent (Main category)
                    </SelectItem>
                    {categories
                      .filter((cat) => {
                        // For subcategories, show all main categories (no parent)
                        if (formData.type === "subcategory") {
                          return (
                            !cat.parent_category_id ||
                            cat.parent_category_id === null
                          );
                        }
                        // For regular categories, show categories of the same type with no parent
                        return (
                          cat.type === formData.type &&
                          (!cat.parent_category_id ||
                            cat.parent_category_id === null)
                        );
                      })
                      .map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCategory}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Modify the existing category details.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Category name"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory Type Selection - Only show when subcategory is selected */}
              {formData.type === "subcategory" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-subcategory_type" className="text-right">
                    Subcategory Type
                  </Label>
                  <Select
                    value={formData.subcategory_type}
                    onValueChange={(value) =>
                      handleSelectChange("subcategory_type", value)
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select subcategory type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["income", "expense", "asset", "liability"].map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-parent" className="text-right">
                  Parent
                </Label>
                <Select
                  value={formData.parent_category_id}
                  onValueChange={(value) =>
                    handleSelectChange("parent_category_id", value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No parent (Main category)
                    </SelectItem>
                    {categories
                      .filter((cat) => {
                        // For subcategories, show all main categories (no parent)
                        if (formData.type === "subcategory") {
                          return (
                            (!cat.parent_category_id ||
                              cat.parent_category_id === null) &&
                            cat.id !== selectedCategory?.id
                          );
                        }
                        // For regular categories, show categories of the same type with no parent
                        return (
                          cat.type === formData.type &&
                          (!cat.parent_category_id ||
                            cat.parent_category_id === null) &&
                          cat.id !== selectedCategory?.id
                        );
                      })
                      .map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditCategory}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                Save Changes
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
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {categories
                  .filter((cat) => cat.type === "income")
                  .map((category) => (
                    <div key={category.id}>
                      {/* Main Category */}
                      <li className="p-3 border rounded-md hover:bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-sm font-semibold text-green-600">
                            {formatter.format(categoryTotals[category.id] || 0)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Category
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {category.name}
                                  "? This action cannot be undone and may affect
                                  existing transactions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>

                      {/* Subcategories */}
                      {category.subcategories &&
                        category.subcategories.length > 0 && (
                          <div className="ml-4 mt-2 space-y-1">
                            {category.subcategories.map((subcategory) => (
                              <li
                                key={subcategory.id}
                                className="p-2 border rounded-md hover:bg-gray-50 flex justify-between items-center bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">
                                    └─ {subcategory.name}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {formatter.format(
                                      categoryTotals[subcategory.id] || 0
                                    )}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(subcategory)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Subcategory
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "
                                          {subcategory.name}"? This action
                                          cannot be undone and may affect
                                          existing transactions.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteCategory(subcategory.id)
                                          }
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </li>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}

                {categories.filter((cat) => cat.type === "income").length ===
                  0 && (
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
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {categories
                  .filter((cat) => cat.type === "expense")
                  .map((category) => (
                    <div key={category.id}>
                      {/* Main Category */}
                      <li className="p-3 border rounded-md hover:bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatter.format(categoryTotals[category.id] || 0)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Category
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {category.name}
                                  "? This action cannot be undone and may affect
                                  existing transactions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>

                      {/* Subcategories */}
                      {category.subcategories &&
                        category.subcategories.length > 0 && (
                          <div className="ml-4 mt-2 space-y-1">
                            {category.subcategories.map((subcategory) => (
                              <li
                                key={subcategory.id}
                                className="p-2 border rounded-md hover:bg-gray-50 flex justify-between items-center bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">
                                    └─ {subcategory.name}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {formatter.format(
                                      categoryTotals[subcategory.id] || 0
                                    )}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(subcategory)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Subcategory
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "
                                          {subcategory.name}"? This action
                                          cannot be undone and may affect
                                          existing transactions.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteCategory(subcategory.id)
                                          }
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </li>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}

                {categories.filter((cat) => cat.type === "expense").length ===
                  0 && (
                  <li className="p-4 text-center text-gray-500">
                    No expense categories found
                  </li>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-green-100 text-green-700 p-2 rounded-full mr-2">
                <FolderIcon className="h-5 w-5" />
              </span>
              Asset Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {categories
                  .filter((cat) => cat.type === "asset")
                  .map((category) => (
                    <div key={category.id}>
                      {/* Main Category */}
                      <li className="p-3 border rounded-md hover:bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-sm font-semibold text-blue-600">
                            {formatter.format(categoryTotals[category.id] || 0)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Category
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {category.name}
                                  "? This action cannot be undone and may affect
                                  existing transactions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>

                      {/* Subcategories */}
                      {category.subcategories &&
                        category.subcategories.length > 0 && (
                          <div className="ml-4 mt-2 space-y-1">
                            {category.subcategories.map((subcategory) => (
                              <li
                                key={subcategory.id}
                                className="p-2 border rounded-md hover:bg-gray-50 flex justify-between items-center bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">
                                    └─ {subcategory.name}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {formatter.format(
                                      categoryTotals[subcategory.id] || 0
                                    )}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(subcategory)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Subcategory
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "
                                          {subcategory.name}"? This action
                                          cannot be undone and may affect
                                          existing transactions.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteCategory(subcategory.id)
                                          }
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </li>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}

                {categories.filter((cat) => cat.type === "asset").length ===
                  0 && (
                  <li className="p-4 text-center text-gray-500">
                    No asset categories found
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
              Liability Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {categories
                  .filter((cat) => cat.type === "liability")
                  .map((category) => (
                    <div key={category.id}>
                      {/* Main Category */}
                      <li className="p-3 border rounded-md hover:bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-sm font-semibold text-orange-600">
                            {formatter.format(categoryTotals[category.id] || 0)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Category
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {category.name}
                                  "? This action cannot be undone and may affect
                                  existing transactions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>

                      {/* Subcategories */}
                      {category.subcategories &&
                        category.subcategories.length > 0 && (
                          <div className="ml-4 mt-2 space-y-1">
                            {category.subcategories.map((subcategory) => (
                              <li
                                key={subcategory.id}
                                className="p-2 border rounded-md hover:bg-gray-50 flex justify-between items-center bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">
                                    └─ {subcategory.name}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {formatter.format(
                                      categoryTotals[subcategory.id] || 0
                                    )}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(subcategory)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Subcategory
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "
                                          {subcategory.name}"? This action
                                          cannot be undone and may affect
                                          existing transactions.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteCategory(subcategory.id)
                                          }
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </li>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}

                {categories.filter((cat) => cat.type === "liability").length ===
                  0 && (
                  <li className="p-4 text-center text-gray-500">
                    No liability categories found
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
