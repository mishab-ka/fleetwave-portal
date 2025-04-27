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
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PlusSquare,
  ArrowUp,
  ArrowDown,
  Calendar,
  Edit,
  Trash,
  TrendingDown,
} from "lucide-react";
import { formatter } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}

interface TransactionWithRelations extends Transaction {
  accounts: Account;
  categories: Category;
}

const TransactionsSection = () => {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>(
    []
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithRelations | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    type: "income",
    date: new Date(),
    account_id: "",
    category_id: "",
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          accounts!transactions_account_id_fkey(id, name, type, balance),
          categories!transactions_category_id_fkey(id, name, type)
        `
        )
        .order("date", { ascending: false });

      if (error) throw error;

      if (data) {
        setTransactions(data as TransactionWithRelations[]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type, balance");

      if (error) throw error;

      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load accounts");
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type");

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If the category changes, check if it's a liability
    if (name === "category_id") {
      const category = categories.find((cat) => cat.id.toString() === value);
      setSelectedCategory(category || null);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        date: date,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: 0,
      type: "income",
      date: new Date(),
      account_id: "",
      category_id: "",
    });
  };

  const handleAddTransaction = async () => {
  try {
    if (
      !formData.description ||
      !formData.amount ||
      !formData.date ||
      !formData.account_id ||
      !formData.category_id
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const accountId = formData.account_id;
    const categoryId = formData.category_id;

    // Fetch selected category
    const { data: selectedCategory, error: categoryError } = await supabase
      .from("categories")
      .select("type")
      .eq("id", categoryId)
      .single();

    if (categoryError || !selectedCategory) {
      throw new Error("Category not found");
    }

    // Determine transaction type and amount
    const isLiability = selectedCategory.type === "liability";
    const transactionType = isLiability ? "Liability" : formData.type;
    const transactionAmount = isLiability
      ? formData.amount
      : formData.type === "income"
      ? formData.amount
      : -formData.amount;

    // Insert transaction
    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert([
        {
          description: formData.description,
          amount: transactionAmount,
          type: transactionType,
          date: formData.date.toISOString(),
          account_id: accountId,
          category_id: categoryId,
        },
      ])
      .select();

    if (transactionError) throw transactionError;

    // Handle account balance and liabilities
    if (isLiability) {
      // Update account balance
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single();

      if (accountError) throw accountError;

      const newBalance = accountData.balance + formData.amount;
      await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", accountId);

      // Insert into liabilities table
      const { error: liabilityError } = await supabase
        .from("liabilities")
        .insert([
          {
            name: formData.description,
            value: formData.amount,
            created_at: formData.date.toISOString(),
          },
        ]);

      if (liabilityError) throw liabilityError;
    } else {
      // Handle normal transactions
      const adjustment =
        formData.type === "income" ? formData.amount : -formData.amount;

      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single();

      if (!accountError) {
        const newBalance = accountData.balance + adjustment;
        await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", accountId);
      }
    }

    toast.success("Transaction added successfully");
    fetchTransactions();
    fetchAccounts();
    setIsAddDialogOpen(false);
    resetForm();
  } catch (error) {
    console.error("Error adding transaction:", error);
    toast.error("Failed to add transaction");
  }
};

  const handleEditClick = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction);
    
    // Find the category to check if it's a liability
    const category = categories.find((cat) => cat.id === transaction.category_id);
    setSelectedCategory(category || null);
    
    setFormData({
      description: transaction.description || "",
      amount: transaction.type === "Liability" ? Math.abs(transaction.amount) : transaction.amount,
      type: transaction.type === "Liability" ? "income" : transaction.type,
      date: new Date(transaction.date),
      account_id: transaction.account_id.toString(),
      category_id: transaction.category_id.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTransaction = async () => {
    try {
      if (!selectedTransaction) return;

      if (
        !formData.description ||
        !formData.amount ||
        !formData.date ||
        !formData.account_id ||
        !formData.category_id
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const accountId = formData.account_id;
      const categoryId = formData.category_id;

      if (
        !/^[0-9a-fA-F-]{36}$/.test(accountId) ||
        !/^[0-9a-fA-F-]{36}$/.test(categoryId)
      ) {
        toast.error("Invalid account or category selected");
        return;
      }

      // Fetch the selected category to determine if it's a liability
      const { data: selectedCategory, error: categoryError } = await supabase
        .from("categories")
        .select("type")
        .eq("id", categoryId)
        .single();

      if (categoryError || !selectedCategory) {
        throw new Error("Category not found");
      }

      // Fetch the original transaction to calculate balance adjustment
      const { data: originalTransaction, error: fetchError } = await supabase
        .from("transactions")
        .select("amount, type, account_id, category_id")
        .eq("id", selectedTransaction.id)
        .single();

      if (fetchError || !originalTransaction) {
        throw new Error("Original transaction not found");
      }

      // Get original category type
      const { data: originalCategory, error: origCategoryError } = await supabase
        .from("categories")
        .select("type")
        .eq("id", originalTransaction.category_id)
        .single();

      if (origCategoryError) throw origCategoryError;

      // Determine the transaction type based on category
      const transactionType = selectedCategory.type === "Liability" 
        ? "Liability"  // Use "Liability" instead of "liability" to match AssetsLiabilitiesSection
        : formData.type;

      // Update the transaction
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          description: formData.description,
          amount: selectedCategory.type === "Liability" 
            ? -Math.abs(formData.amount) // Always negative for liabilities
            : formData.amount,
          type: transactionType,
          date: formData.date.toISOString(),
          account_id: accountId,
          category_id: categoryId,
        })
        .eq("id", selectedTransaction.id);

      if (updateError) throw updateError;

      // Calculate balance adjustments
      if (
        originalTransaction.account_id !== accountId ||
        originalTransaction.amount !== formData.amount ||
        originalTransaction.type !== transactionType ||
        (originalCategory?.type !== selectedCategory.type)
      ) {
        // First, revert the original transaction's effect on the original account
        let originalAdjustment = 0;
        
        if (originalCategory?.type === "Liability" && originalTransaction.type === "Liability") {
          if (originalTransaction.type === "income") {
            originalAdjustment = -originalTransaction.amount;
          }
        } else {
          originalAdjustment = originalTransaction.type === "income" 
            ? -originalTransaction.amount 
            : originalTransaction.amount;
        }
        
        // Then apply the new transaction's effect on the new account
        let newAdjustment = 0;
        
        if (selectedCategory.type === "Liability" && formData.type === "income") {
          // For liability categories, add the amount to the account if it's income
          newAdjustment = formData.amount;
        } else if (selectedCategory.type !== "Liability") {
          // For non-liability categories, apply normal income/expense rules
          newAdjustment = formData.type === "income" 
            ? formData.amount 
            : -formData.amount;
        }

        // Update original account if different from new account
        if (originalTransaction.account_id !== accountId) {
          const { data: origAccountData, error: origAccountError } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", originalTransaction.account_id)
            .single();

          if (!origAccountError && origAccountData) {
            const origNewBalance = origAccountData.balance + originalAdjustment;
            
            const { error: origUpdateError } = await supabase
              .from("accounts")
              .update({ balance: origNewBalance })
              .eq("id", originalTransaction.account_id);

            if (origUpdateError) throw origUpdateError;
          }

          // Update new account
          const { data: newAccountData, error: newAccountError } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", accountId)
            .single();

          if (!newAccountError && newAccountData) {
            const newBalance = newAccountData.balance + newAdjustment;
            
            const { error: newUpdateError } = await supabase
              .from("accounts")
              .update({ balance: newBalance })
              .eq("id", accountId);

            if (newUpdateError) throw newUpdateError;
          }
        } else {
          // Same account, just apply the net adjustment
          const { data: accountData, error: accountFetchError } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", accountId)
            .single();

          if (!accountFetchError && accountData) {
            const netAdjustment = originalAdjustment + newAdjustment;
            const newBalance = accountData.balance + netAdjustment;
            
            const { error: accountUpdateError } = await supabase
              .from("accounts")
              .update({ balance: newBalance })
              .eq("id", accountId);

            if (accountUpdateError) throw accountUpdateError;
          }
        }
      }

      toast.success("Transaction updated successfully");
      fetchTransactions();
      fetchAccounts();
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      resetForm();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      // Fetch the transaction to get its details before deletion
      const { data: transaction, error: transactionfetchError } = await supabase
        .from("transactions")
        .select("amount, type, account_id")
        .eq("id", id)
        .single();

      if (transactionfetchError || !transaction) {
        throw new Error("Transaction not found");
      }

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Step 1: Get the current balance from the account
      const { data: accountData, error: fetchError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", transaction.account_id)
        .single();

      if (fetchError) throw fetchError;

      const currentBalance = accountData?.balance || 0;

      // Step 2: Calculate the adjustment
      const adjustment =
        transaction.type === "income"
          ? -transaction.amount
          : transaction.amount;

      const updatedBalance = currentBalance + adjustment;

      // Step 3: Update the account balance
      const { error: accountError } = await supabase
        .from("accounts")
        .update({ balance: updatedBalance })
        .eq("id", transaction.account_id);

      if (accountError) throw accountError;

      toast.success("Transaction deleted successfully");
      fetchTransactions();
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : transactions.filter((t) => t.type.toLowerCase() === activeTab.toLowerCase());

  const getTransactionTypeDisplay = (transaction) => {
    if (transaction.type === "Liability") {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        >
          Liability
        </span>
      );
    }
    
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          transaction.type === "expense"
            ? "bg-red-100 text-red-800"
            : "bg-green-100 text-green-800"
        }`}
      >
        {transaction.type}
      </span>
    );
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
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
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
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
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
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
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
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <DatePicker
                  date={formData.date}
                  onSelect={handleDateChange}
                  defaultValue={formData.date}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="account_id" className="text-right">
                  Account
                </Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, account_id: value }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id.toString()}
                      >
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_id" className="text-right">
                  Category
                </Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    handleSelectChange("category_id", value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>
                      Select a category
                    </SelectItem>
                    
                    {/* Income Categories */}
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                      Income Categories
                    </div>
                    {categories
                      .filter((cat) => cat.type === "income")
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                      
                    {/* Expense Categories */}
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                      Expense Categories
                    </div>
                    {categories
                      .filter((cat) => cat.type === "expense")
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                      
                    {/* Liability Categories */}
                    <div className="px-2 py-1.5 text-xs font-medium text-blue-500">
                      Liability Categories
                    </div>
                    {categories
                      .filter((cat) => cat.type === "liability")
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {category.name} <span className="ml-1 text-xs text-blue-500">(Liability)</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show notification when liability category is selected */}
              {selectedCategory?.type === "liability" && (
                <div className="col-span-4 ml-[25%] mr-0 mt-1">
                  <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded-md">
                    <strong>Note:</strong> This is a liability category. {formData.type === "income" ? 
                      "The amount will be added to the selected account balance." : 
                      "This transaction will be recorded as a liability."}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTransaction}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
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
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Transaction description"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
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
                <Label htmlFor="edit-date" className="text-right">
                  Date
                </Label>
                <DatePicker
                  date={formData.date}
                  onSelect={handleDateChange}
                  defaultValue={formData.date}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-account_id" className="text-right">
                  Account
                </Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, account_id: value }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id.toString()}
                      >
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category_id" className="text-right">
                  Category
                </Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    handleSelectChange("category_id", value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>
                      Select a category
                    </SelectItem>
                    
                    {/* Income Categories */}
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                      Income Categories
                    </div>
                    {categories
                      .filter((cat) => cat.type === "income")
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                      
                    {/* Expense Categories */}
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                      Expense Categories
                    </div>
                    {categories
                      .filter((cat) => cat.type === "expense")
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                      
                    {/* Liability Categories */}
                    <div className="px-2 py-1.5 text-xs font-medium text-blue-500">
                      Liability Categories
                    </div>
                    {categories
                      .filter((cat) => cat.type === "liability")
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {category.name} <span className="ml-1 text-xs text-blue-500">(Liability)</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show notification when liability category is selected */}
              {selectedCategory?.type === "liability" && (
                <div className="col-span-4 ml-[25%] mr-0 mt-1">
                  <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded-md">
                    <strong>Note:</strong> This is a liability category. {formData.type === "income" ? 
                      "The amount will be added to the selected account balance." : 
                      "This transaction will be recorded as a liability."}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTransaction}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                Update Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions List</CardTitle>
          <Tabs
            defaultValue="all"
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList className="grid grid-cols-4 w-80">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="Liability">Liability</TabsTrigger>
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
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <span
                        className={`flex items-center font-medium ${
                          transaction.type === "expense"
                            ? "text-red-500"
                            : transaction.type === "Liability" 
                              ? "text-blue-500"
                              : "text-green-500"
                        }`}
                      >
                        {transaction.type === "expense" ? (
                          <ArrowDown className="mr-1 h-4 w-4" />
                        ) : transaction.type === "Liability" ? (
                          <TrendingDown className="mr-1 h-4 w-4" />
                        ) : (
                          <ArrowUp className="mr-1 h-4 w-4" />
                        )}
                        {/* Always display amount as positive for Liability */}
                        {transaction.type === "Liability" 
                          ? formatter.format(Math.abs(transaction.amount))
                          : formatter.format(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeDisplay(transaction)}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transaction.accounts?.name}</TableCell>
                    <TableCell>{transaction.categories?.name}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(transaction)}
                          className="text-gray-600 hover:text-gray-900"
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
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the transaction.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteTransaction(transaction.id)
                                }
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
                ))}

                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
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
