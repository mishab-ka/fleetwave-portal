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
  Search,
  Filter,
  X,
  RotateCcw,
  RefreshCw,
  Download,
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
import { Checkbox } from "@/components/ui/checkbox";

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
  parent_category_id?: number;
  category_level?: number;
  category_path?: string;
  subcategories?: Category[];
}

interface TransactionMode {
  id: string;
  name: string;
  description: string;
  asset_transaction: "asset_in" | "asset_out" | "none";
  cash_transaction: "cash_in" | "cash_out" | "none";
  liability_transaction: "liability_in" | "liability_out" | "none";
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

// Update the Filters interface
interface Filters {
  search: string;
  type: string;
  categoryIds: string[]; // Changed from categoryId to categoryIds array
  startDate: Date | null;
  endDate: Date | null;
}

interface TransactionsSectionProps {
  onTransactionAdded?: () => void;
}

const TransactionsSection = ({
  onTransactionAdded,
}: TransactionsSectionProps) => {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>(
    []
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionModes, setTransactionModes] = useState<TransactionMode[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isAddModeDialogOpen, setIsAddModeDialogOpen] =
    useState<boolean>(false);
  const [isEditModeDialogOpen, setIsEditModeDialogOpen] =
    useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<TransactionMode | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithRelations | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    type: "income",
    date: new Date(),
    account_id: "",
    category_id: "",
    main_category_id: "", // New field for main category selection
    amount_direction: "+", // New field for +/- selector (only for asset/liability)
    // New fields for transaction modes system
    selected_transaction_mode: "", // ID of selected transaction mode
    asset_transaction_type: "none", // "asset_in", "asset_out", or "none"
    cash_transaction_type: "none", // "cash_out", "cash_in", or "none"
    liability_transaction_type: "none", // "liability_in", "liability_out", or "none"
    payment_account_id: "", // Account to use for cash transaction
    transaction_mode: "single", // "single" or "dual"
  });

  const [modeFormData, setModeFormData] = useState({
    name: "",
    description: "",
    asset_transaction: "none" as "asset_in" | "asset_out" | "none",
    cash_transaction: "none" as "cash_in" | "cash_out" | "none",
    liability_transaction: "none" as "liability_in" | "liability_out" | "none",
  });

  // Add new state variables for multiple select and filters
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "all",
    categoryIds: [], // Initialize as empty array
    startDate: null,
    endDate: null,
  });
  const [showFilters, setShowFilters] = useState(false);

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
      // Get all categories (main and sub) for transaction selection
      const { data, error } = await supabase
        .from("categories")
        .select(
          "id, name, type, parent_category_id, category_level, category_path"
        )
        .order("type")
        .order("category_level")
        .order("name");

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const fetchTransactionModes = async () => {
    try {
      const { data, error } = await supabase
        .from("transaction_modes")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      setTransactionModes(data || []);
    } catch (error) {
      console.error("Error fetching transaction modes:", error);
      // Don't show error toast, just log it - the table might not exist yet
      console.log(
        "Transaction modes table not found. Please run the SQL script to create it."
      );
    }
  };

  // const fetchFleetReports = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from("fleet_reports")
  //       .select(
  //         "id, vehicle_number, rent_date, rent_paid_amount, status, driver_name, total_trips, shift"
  //       )
  //       .eq("status", "approved")
  //       .order("rent_date", { ascending: false });

  //     if (error) throw error;

  //     setFleetReports(data || []);
  //   } catch (error) {
  //     console.error("Error fetching fleet reports:", error);
  //     toast.error("Failed to load fleet reports");
  //   }
  // };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
    fetchTransactionModes();
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

    // If the transaction type changes, clear the category selection
    if (name === "type") {
      setFormData((prev) => ({
        ...prev,
        category_id: "none", // Clear category when type changes
        main_category_id: "", // Clear main category when type changes
        amount_direction: "+", // Reset amount direction when type changes
        // Clear transaction mode selection when type changes
        selected_transaction_mode: "",
        asset_transaction_type: "none",
        cash_transaction_type: "none",
        liability_transaction_type: "none",
      }));
      setSelectedCategory(null);
    }

    // If the main category changes, clear the subcategory selection
    if (name === "main_category_id") {
      setFormData((prev) => ({
        ...prev,
        category_id: "none", // Clear subcategory when main category changes
      }));
      setSelectedCategory(null);
    }

    // If the category changes, check if it's a liability
    if (name === "category_id") {
      const category = categories.find((cat) => cat.id.toString() === value);
      setSelectedCategory(category || null);
    }
  };

  const handleTransactionModeChange = (modeId: string) => {
    const selectedMode = transactionModes.find((mode) => mode.id === modeId);
    if (selectedMode) {
      console.log("Selected transaction mode:", selectedMode);
      setFormData((prev) => ({
        ...prev,
        selected_transaction_mode: modeId,
        asset_transaction_type: selectedMode.asset_transaction,
        cash_transaction_type: selectedMode.cash_transaction,
        liability_transaction_type: selectedMode.liability_transaction,
      }));
    }
  };

  const handleModeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setModeFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleModeSelectChange = (name: string, value: string) => {
    setModeFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetModeForm = () => {
    setModeFormData({
      name: "",
      description: "",
      asset_transaction: "none",
      cash_transaction: "none",
      liability_transaction: "none",
    });
  };

  const handleAddTransactionMode = async () => {
    try {
      if (!modeFormData.name || !modeFormData.description) {
        toast.error("Please fill in all required fields");
        return;
      }

      const { data, error } = await supabase
        .from("transaction_modes")
        .insert([modeFormData])
        .select();

      if (error) throw error;

      toast.success("Transaction mode added successfully");
      setIsAddModeDialogOpen(false);
      resetModeForm();
      fetchTransactionModes();
    } catch (error) {
      console.error("Error adding transaction mode:", error);
      toast.error("Failed to add transaction mode");
    }
  };

  const handleEditModeClick = (mode: TransactionMode) => {
    setSelectedMode(mode);
    setModeFormData({
      name: mode.name,
      description: mode.description,
      asset_transaction: mode.asset_transaction,
      cash_transaction: mode.cash_transaction,
      liability_transaction: mode.liability_transaction,
    });
    setIsEditModeDialogOpen(true);
  };

  const handleUpdateTransactionMode = async () => {
    try {
      if (!selectedMode || !modeFormData.name || !modeFormData.description) {
        toast.error("Please fill in all required fields");
        return;
      }

      const { error } = await supabase
        .from("transaction_modes")
        .update(modeFormData)
        .eq("id", selectedMode.id);

      if (error) throw error;

      toast.success("Transaction mode updated successfully");
      setIsEditModeDialogOpen(false);
      setSelectedMode(null);
      resetModeForm();
      fetchTransactionModes();
    } catch (error) {
      console.error("Error updating transaction mode:", error);
      toast.error("Failed to update transaction mode");
    }
  };

  const handleDeleteTransactionMode = async (modeId: string) => {
    try {
      const { error } = await supabase
        .from("transaction_modes")
        .delete()
        .eq("id", modeId);

      if (error) throw error;

      toast.success("Transaction mode deleted successfully");
      fetchTransactionModes();
    } catch (error) {
      console.error("Error deleting transaction mode:", error);
      toast.error("Failed to delete transaction mode");
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
      category_id: "none",
      main_category_id: "",
      amount_direction: "+",
      selected_transaction_mode: "",
      asset_transaction_type: "none",
      cash_transaction_type: "none",
      liability_transaction_type: "none",
      payment_account_id: "",
      transaction_mode: "single",
    });
  };

  const handleAddTransaction = async () => {
    try {
      // Validation for asset/liability transaction modes
      if (formData.type === "asset" || formData.type === "liability") {
        if (
          !formData.description ||
          !formData.amount ||
          !formData.date ||
          !formData.payment_account_id ||
          !formData.main_category_id ||
          !formData.selected_transaction_mode
        ) {
          toast.error(
            "Please fill all required fields including transaction mode"
          );
          return;
        }
      } else {
        // Validation for single transaction mode
        if (
          !formData.description ||
          !formData.amount ||
          !formData.date ||
          !formData.account_id ||
          !formData.main_category_id
        ) {
          toast.error("Please fill all required fields");
          return;
        }
      }

      // Validate amount is not zero
      if (parseFloat(formData.amount.toString()) === 0) {
        toast.error("Amount cannot be zero");
        return;
      }

      const amount = parseFloat(formData.amount.toString());

      if (formData.type === "asset" || formData.type === "liability") {
        // Triple transaction logic - Create up to 3 transactions
        const selectedAccount = accounts.find(
          (acc) => acc.id.toString() === formData.payment_account_id
        );
        if (!selectedAccount) {
          toast.error("Selected payment account not found");
          return;
        }

        const transactions = [];

        // Use subcategory if selected, otherwise use main category
        const categoryId =
          formData.category_id && formData.category_id !== "none"
            ? formData.category_id
            : formData.main_category_id;

        // Create Asset Transaction
        if (formData.asset_transaction_type !== "none") {
          const assetAmount =
            formData.asset_transaction_type === "asset_in"
              ? Math.abs(amount)
              : -Math.abs(amount);

          transactions.push({
            amount: assetAmount,
            type: "asset",
            description: `Asset ${
              formData.asset_transaction_type === "asset_in"
                ? "Purchase"
                : "Sale"
            } - ${formData.description}`,
            date: formData.date.toISOString(),
            account_id: formData.payment_account_id,
            category_id: categoryId,
          });
        }

        // Create Cash Transaction
        if (formData.cash_transaction_type !== "none") {
          const cashAmount =
            formData.cash_transaction_type === "cash_in"
              ? Math.abs(amount)
              : -Math.abs(amount);

          transactions.push({
            amount: cashAmount,
            type: "asset", // Cash is an asset
            description: `Cash ${
              formData.cash_transaction_type === "cash_in"
                ? "Receipt"
                : "Payment"
            } - ${formData.description}`,
            date: formData.date.toISOString(),
            account_id: formData.payment_account_id,
            category_id: null, // Cash transactions typically don't have categories
          });
        }

        // Create Liability Transaction
        if (formData.liability_transaction_type !== "none") {
          const liabilityAmount =
            formData.liability_transaction_type === "liability_in"
              ? Math.abs(amount)
              : -Math.abs(amount);

          transactions.push({
            amount: liabilityAmount,
            type: "liability",
            description: `Liability ${
              formData.liability_transaction_type === "liability_in"
                ? "Incurred"
                : "Payment"
            } - ${formData.description}`,
            date: formData.date.toISOString(),
            account_id: formData.payment_account_id,
            category_id: categoryId,
          });
        }

        // Check if account has sufficient balance for cash out transactions
        const totalCashChange = transactions
          .filter((t) => t.type === "asset")
          .reduce((sum, t) => sum + t.amount, 0);

        if (
          totalCashChange < 0 &&
          selectedAccount.balance < Math.abs(totalCashChange)
        ) {
          toast.error(
            `Insufficient balance in ${
              selectedAccount.name
            }. Available: ${formatter.format(selectedAccount.balance)}`
          );
          return;
        }

        // Insert all transactions
        const { data: transactionData, error: transactionError } =
          await supabase.from("transactions").insert(transactions).select();

        if (transactionError) throw transactionError;

        // Update account balance
        const newBalance = selectedAccount.balance + totalCashChange;
        const { error: accountUpdateError } = await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", formData.payment_account_id);

        if (accountUpdateError) throw accountUpdateError;

        toast.success(
          `Created ${transactions.length} transactions successfully`
        );
      } else {
        // Single transaction logic (existing logic)
        const accountId = formData.account_id;
        // Use subcategory if selected, otherwise use main category
        const categoryId =
          formData.category_id && formData.category_id !== "none"
            ? formData.category_id
            : formData.main_category_id;

        // Fetch selected category
        const { data: selectedCategory, error: categoryError } = await supabase
          .from("categories")
          .select("type")
          .eq("id", categoryId)
          .single();

        if (categoryError || !selectedCategory) {
          throw new Error("Category not found");
        }

        // Calculate transaction amount based on type and direction
        let transactionAmount = 0;
        if (formData.type === "income") {
          transactionAmount = Math.abs(amount); // Income is always positive
        } else if (formData.type === "expense") {
          transactionAmount = -Math.abs(amount); // Expense is always negative
        } else if (formData.type === "asset") {
          // For assets, use the direction selector
          transactionAmount =
            formData.amount_direction === "+"
              ? Math.abs(amount)
              : -Math.abs(amount);
        } else if (formData.type === "liability") {
          // For liabilities, use the direction selector
          // + direction: adds to liability (negative amount)
          // - direction: reduces liability (positive amount)
          transactionAmount =
            formData.amount_direction === "+"
              ? -Math.abs(amount) // Adding to liability (negative)
              : Math.abs(amount); // Reducing liability (positive)
        }

        // Validate final transaction amount is not zero
        if (transactionAmount === 0) {
          toast.error("Calculated transaction amount cannot be zero");
          return;
        }

        // Insert transaction
        const { data: transactionData, error: transactionError } =
          await supabase
            .from("transactions")
            .insert([
              {
                description: formData.description,
                amount: transactionAmount,
                type: formData.type,
                date: formData.date.toISOString(),
                account_id: accountId,
                category_id: categoryId,
              },
            ])
            .select();

        if (transactionError) throw transactionError;

        // Update account balance
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", accountId)
          .single();

        if (accountError) throw accountError;

        const newBalance = accountData.balance + transactionAmount;
        await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", accountId);

        toast.success("Transaction added successfully");
      }

      fetchTransactions();
      fetchAccounts();
      setIsAddDialogOpen(false);
      resetForm();

      // Trigger refresh for Assets & Liabilities section
      onTransactionAdded?.();
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const handleEditClick = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction);

    // Find the category to check if it's a liability
    // Determine if the selected category is a main category or subcategory
    const selectedCategory = categories.find(
      (cat) => cat.id === transaction.category_id
    );
    setSelectedCategory(selectedCategory || null);

    setFormData({
      description: transaction.description || "",
      amount:
        transaction.type === "Liability"
          ? Math.abs(transaction.amount)
          : transaction.amount,
      type: transaction.type === "Liability" ? "income" : transaction.type,
      date: new Date(transaction.date),
      account_id: transaction.account_id.toString(),
      category_id: selectedCategory?.parent_category_id
        ? transaction.category_id.toString()
        : "none",
      main_category_id: selectedCategory?.parent_category_id
        ? selectedCategory.parent_category_id.toString()
        : transaction.category_id.toString(),
      amount_direction:
        transaction.type === "asset"
          ? transaction.amount >= 0
            ? "+"
            : "-"
          : transaction.type === "liability"
          ? transaction.amount < 0
            ? "+"
            : "-"
          : "+",
      selected_transaction_mode: "",
      asset_transaction_type: "asset_in",
      cash_transaction_type: "cash_out",
      liability_transaction_type: "liability_in",
      payment_account_id: "",
      transaction_mode: "single",
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
        !formData.main_category_id
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const accountId = formData.account_id;
      // Use subcategory if selected, otherwise use main category
      const categoryId =
        formData.category_id && formData.category_id !== "none"
          ? formData.category_id
          : formData.main_category_id;

      if (
        !/^[0-9a-fA-F-]{36}$/.test(accountId) ||
        !/^[0-9a-fA-F-]{36}$/.test(categoryId)
      ) {
        toast.error("Invalid account or category selected");
        return;
      }

      // Fetch the original transaction to calculate balance adjustment
      const { data: originalTransaction, error: fetchError } = await supabase
        .from("transactions")
        .select("amount, type, account_id")
        .eq("id", selectedTransaction.id)
        .single();

      if (fetchError || !originalTransaction) {
        throw new Error("Original transaction not found");
      }

      // Calculate the new transaction amount based on type and direction
      let newAmount = 0;
      if (formData.type === "income") {
        newAmount = Math.abs(formData.amount); // Income is always positive
      } else if (formData.type === "expense") {
        newAmount = -Math.abs(formData.amount); // Expense is always negative
      } else if (formData.type === "asset") {
        // For assets, use the direction selector
        newAmount =
          formData.amount_direction === "+"
            ? Math.abs(formData.amount)
            : -Math.abs(formData.amount);
      } else if (formData.type === "liability") {
        // For liabilities, use the direction selector
        // + direction: adds to liability (negative amount)
        // - direction: reduces liability (positive amount)
        newAmount =
          formData.amount_direction === "+"
            ? -Math.abs(formData.amount) // Adding to liability (negative)
            : Math.abs(formData.amount); // Reducing liability (positive)
      }

      // Update the transaction
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          description: formData.description,
          amount: newAmount,
          type: formData.type,
          date: formData.date.toISOString(),
          account_id: accountId,
          category_id: categoryId,
        })
        .eq("id", selectedTransaction.id);

      if (updateError) throw updateError;

      // Calculate balance adjustments
      // First, revert the original transaction's effect
      const originalAdjustment = -originalTransaction.amount; // Reverse the original effect

      // Then apply the new transaction's effect
      const newAdjustment = newAmount;

      // Get current account balance
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single();

      if (accountError) throw accountError;

      // Calculate new balance: current balance + (reverse original) + (apply new)
      const netAdjustment = originalAdjustment + newAdjustment;
      const newBalance = accountData.balance + netAdjustment;

      // Update account balance
      const { error: balanceUpdateError } = await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", accountId);

      if (balanceUpdateError) throw balanceUpdateError;

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

      // Get current account balance
      const { data: accountData, error: fetchError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", transaction.account_id)
        .single();

      if (fetchError) throw fetchError;

      const currentBalance = accountData?.balance || 0;

      // Calculate the adjustment to reverse the transaction's effect
      // Since we're deleting, we need to reverse the original effect
      const adjustment = -transaction.amount; // Reverse the transaction's effect

      const updatedBalance = currentBalance + adjustment;

      // Update the account balance first
      const { error: accountError } = await supabase
        .from("accounts")
        .update({ balance: updatedBalance })
        .eq("id", transaction.account_id);

      if (accountError) throw accountError;

      // Then delete the transaction
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast.success("Transaction deleted successfully");
      fetchTransactions();
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  // Add function to handle bulk delete
  const handleBulkDelete = async () => {
    try {
      if (selectedItems.length === 0) return;

      // First, fetch all selected transactions to get their details
      const { data: selectedTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id, amount, type, account_id")
        .in("id", selectedItems);

      if (fetchError) throw fetchError;

      // Group transactions by account to calculate total adjustments
      const accountAdjustments: { [key: string]: number } = {};

      selectedTransactions?.forEach((transaction) => {
        const accountId = transaction.account_id;
        // Reverse the transaction's effect (negative of the original amount)
        const adjustment = -transaction.amount;

        if (!accountAdjustments[accountId]) {
          accountAdjustments[accountId] = 0;
        }
        accountAdjustments[accountId] += adjustment;
      });

      // Update each affected account's balance
      for (const [accountId, adjustment] of Object.entries(
        accountAdjustments
      )) {
        // Get current account balance
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", accountId)
          .single();

        if (accountError) throw accountError;

        const currentBalance = accountData?.balance || 0;
        const newBalance = currentBalance + adjustment;

        // Update account balance
        const { error: updateError } = await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", accountId);

        if (updateError) throw updateError;
      }

      // Delete the transactions after updating balances
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .in("id", selectedItems);

      if (deleteError) throw deleteError;

      toast.success("Selected transactions deleted successfully");
      setSelectedItems([]);
      fetchTransactions();
      fetchAccounts(); // Refresh accounts to show updated balances
    } catch (error) {
      console.error("Error deleting transactions:", error);
      toast.error("Failed to delete transactions");
    }
  };

  // Add function to handle checkbox selection
  const handleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add function to handle select all
  const handleSelectAll = () => {
    const transactionIds = transactions.map((t) => t.id);

    if (selectedItems.length === transactionIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(transactionIds);
    }
  };

  // Update the resetFilters function to be more comprehensive
  const resetFilters = () => {
    setFilters({
      search: "",
      type: "all",
      categoryIds: [],
      startDate: null,
      endDate: null,
    });
    setActiveTab("all"); // Reset the active tab as well
  };

  // Add a function to get selected categories display text
  const getSelectedCategoriesText = () => {
    if (filters.categoryIds.length === 0) return "All Categories";
    if (filters.categoryIds.length === 1) {
      const category = categories.find(
        (c) => c.id.toString() === filters.categoryIds[0]
      );
      return category ? category.name : "All Categories";
    }
    return `${filters.categoryIds.length} categories selected`;
  };

  // Update the handleFilterChange function with proper type handling
  const handleFilterChange = <K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Update the filter function to work with transactions only
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description
      .toLowerCase()
      .includes(filters.search.toLowerCase());

    const matchesType =
      filters.type === "all" || transaction.type === filters.type;

    const matchesCategory =
      filters.categoryIds.length === 0 || // Show all if no categories selected
      filters.categoryIds.includes(transaction.categories?.name || "");

    const matchesDateRange =
      (!filters.startDate || new Date(transaction.date) >= filters.startDate) &&
      (!filters.endDate || new Date(transaction.date) <= filters.endDate);

    return matchesSearch && matchesType && matchesCategory && matchesDateRange;
  });

  const getTransactionTypeDisplay = (transaction: TransactionWithRelations) => {
    // if (transaction.source === "fleet_report") {
    //   return (
    //     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
    //       Fleet Payment
    //     </span>
    //   );
    // }

    // if (transaction.type === "Liability") {
    //   return (
    //     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
    //       Liability
    //     </span>
    //   );
    // }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          transaction.type === "expense"
            ? "bg-red-100 text-red-800"
            : transaction.type === "income"
            ? "bg-green-100 text-green-800"
            : transaction.type === "asset"
            ? "bg-blue-100 text-blue-800"
            : transaction.type === "liability"
            ? "bg-orange-100 text-orange-800"
            : "bg-gray-100 text-gray-800"
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Transactions</TabsTrigger>

          <TabsTrigger value="journal-modes">Journal Entry Modes</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          {/* Add Transaction Button and Dialog - Always visible */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {selectedItems.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedItems.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete Selected Transactions
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedItems.length}{" "}
                        selected transactions? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Add New Transaction</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new transaction.
                  </DialogDescription>
                </DialogHeader>
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

                {/* Type Selection - Show first so user can select asset/liability */}
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
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Only show transaction mode selector for income/expense types */}
                {formData.type !== "asset" && formData.type !== "liability" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="transaction-mode" className="text-right">
                      Transaction Mode
                    </Label>
                    <Select
                      value={formData.transaction_mode}
                      onValueChange={(value) =>
                        handleSelectChange("transaction_mode", value)
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select transaction mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">
                          📝 Single Transaction
                        </SelectItem>
                        <SelectItem value="dual">
                          🔄 Dual Transaction (Asset + Cash)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Transaction Mode Selection - Show for asset/liability types */}
                {(formData.type === "asset" ||
                  formData.type === "liability") && (
                  <>
                    {/* Transaction Mode Selector */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="transaction-mode" className="text-right">
                        Transaction Mode *
                      </Label>
                      <Select
                        value={formData.selected_transaction_mode}
                        onValueChange={handleTransactionModeChange}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select transaction mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {transactionModes.length > 0 ? (
                            transactionModes.map((mode) => (
                              <SelectItem key={mode.id} value={mode.id}>
                                {mode.name} - {mode.description}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-modes" disabled>
                              ⚠️ No transaction modes available - Run SQL script
                              first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Transaction Flow Indicator */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Transaction Flow</Label>
                      <div className="col-span-3 p-3 bg-gray-50 rounded-md border">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {formData.selected_transaction_mode
                            ? "Selected Transactions:"
                            : "No transaction mode selected"}
                        </div>
                        {formData.selected_transaction_mode ? (
                          <div className="text-sm text-gray-600 space-y-1">
                            {formData.asset_transaction_type !== "none" && (
                              <div className="flex items-center">
                                <span className="font-semibold">
                                  {formData.asset_transaction_type ===
                                  "asset_in"
                                    ? "📈 Asset In"
                                    : "📉 Asset Out"}
                                </span>
                                <span className="ml-2">
                                  {formData.asset_transaction_type ===
                                  "asset_in"
                                    ? "+"
                                    : "-"}
                                  ${formData.amount || 0}
                                </span>
                              </div>
                            )}
                            {formData.cash_transaction_type !== "none" && (
                              <div className="flex items-center">
                                <span className="font-semibold">
                                  {formData.cash_transaction_type === "cash_in"
                                    ? "💰 Cash In"
                                    : "💸 Cash Out"}
                                </span>
                                <span className="ml-2">
                                  {formData.cash_transaction_type === "cash_in"
                                    ? "+"
                                    : "-"}
                                  ${formData.amount || 0}
                                </span>
                              </div>
                            )}
                            {formData.liability_transaction_type !== "none" && (
                              <div className="flex items-center">
                                <span className="font-semibold">
                                  {formData.liability_transaction_type ===
                                  "liability_in"
                                    ? "📈 Liability In"
                                    : "📉 Liability Out"}
                                </span>
                                <span className="ml-2">
                                  {formData.liability_transaction_type ===
                                  "liability_in"
                                    ? "+"
                                    : "-"}
                                  ${formData.amount || 0}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">
                            Please select a transaction mode to see the
                            transaction flow
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cash Account Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="payment-account" className="text-right">
                        Cash Account *
                      </Label>
                      <Select
                        value={formData.payment_account_id}
                        onValueChange={(value) =>
                          handleSelectChange("payment_account_id", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select cash account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem
                              key={account.id}
                              value={account.id.toString()}
                            >
                              {account.name} (
                              {formatter.format(account.balance)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Amount Direction Selector - Only show for Asset and Liability transactions in single mode */}
                {formData.transaction_mode === "single" &&
                  (formData.type === "asset" ||
                    formData.type === "liability") && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="amount_direction" className="text-right">
                        Direction
                      </Label>
                      <Select
                        value={formData.amount_direction}
                        onValueChange={(value) =>
                          handleSelectChange("amount_direction", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+">
                            <div className="flex items-center">
                              <span className="text-green-600 font-bold mr-2">
                                +
                              </span>
                              Add to Account Balance
                            </div>
                          </SelectItem>
                          <SelectItem value="-">
                            <div className="flex items-center">
                              <span className="text-red-600 font-bold mr-2">
                                -
                              </span>
                              Subtract from Account Balance
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                {/* Category Selection - Always show categories for all transaction types */}
                <>
                  {/* Main Category Selection */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="main_category_id" className="text-right">
                      Main Category
                    </Label>
                    <Select
                      value={formData.main_category_id}
                      onValueChange={(value) =>
                        handleSelectChange("main_category_id", value)
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select main category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>
                          Select a main category
                        </SelectItem>

                        {/* Dynamic Main Categories based on transaction type */}
                        {formData.type === "income" && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-green-600">
                              Income Categories
                            </div>
                            {categories
                              .filter(
                                (cat) =>
                                  cat.type === "income" &&
                                  (!cat.parent_category_id ||
                                    cat.parent_category_id === null)
                              )
                              .map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                          </>
                        )}

                        {formData.type === "expense" && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-red-600">
                              Expense Categories
                            </div>
                            {categories
                              .filter(
                                (cat) =>
                                  cat.type === "expense" &&
                                  (!cat.parent_category_id ||
                                    cat.parent_category_id === null)
                              )
                              .map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                          </>
                        )}

                        {formData.type === "asset" && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-blue-600">
                              Asset Categories
                            </div>
                            {categories
                              .filter(
                                (cat) =>
                                  cat.type === "asset" &&
                                  (!cat.parent_category_id ||
                                    cat.parent_category_id === null)
                              )
                              .map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                          </>
                        )}

                        {formData.type === "liability" && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-orange-600">
                              Liability Categories
                            </div>
                            {categories
                              .filter(
                                (cat) =>
                                  cat.type === "liability" &&
                                  (!cat.parent_category_id ||
                                    cat.parent_category_id === null)
                              )
                              .map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                          </>
                        )}

                        {/* Show all categories if no type selected */}
                        {!formData.type && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                              Select transaction type first
                            </div>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Selection - Only show when main category is selected */}
                  {formData.main_category_id && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category_id" className="text-right">
                        Subcategory
                      </Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) =>
                          handleSelectChange("category_id", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select subcategory (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No subcategory</SelectItem>
                          {categories
                            .filter(
                              (cat) =>
                                cat.parent_category_id &&
                                cat.parent_category_id.toString() ===
                                  formData.main_category_id
                            )
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
                  )}

                  {/* Account Selection - Only for single transaction mode */}
                  {formData.transaction_mode === "single" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="account_id" className="text-right">
                        Account
                      </Label>
                      <Select
                        value={formData.account_id}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            account_id: value,
                          }))
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
                  )}
                </>

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
          </div>

          {/* Edit Transaction Dialog */}
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

                {/* Amount Direction Selector - Only show for Asset and Liability transactions */}
                {(formData.type === "asset" ||
                  formData.type === "liability") && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="edit-amount_direction"
                      className="text-right"
                    >
                      Direction
                    </Label>
                    <Select
                      value={formData.amount_direction}
                      onValueChange={(value) =>
                        handleSelectChange("amount_direction", value)
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">
                          <div className="flex items-center">
                            <span className="text-green-600 font-bold mr-2">
                              +
                            </span>
                            Add to Account Balance
                          </div>
                        </SelectItem>
                        <SelectItem value="-">
                          <div className="flex items-center">
                            <span className="text-red-600 font-bold mr-2">
                              -
                            </span>
                            Subtract from Account Balance
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: value,
                      }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-account_id" className="text-right">
                    Account
                  </Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        account_id: value,
                      }))
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

                {/* Main Category Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-main_category_id" className="text-right">
                    Main Category
                  </Label>
                  <Select
                    value={formData.main_category_id}
                    onValueChange={(value) =>
                      handleSelectChange("main_category_id", value)
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Select a main category
                      </SelectItem>

                      {/* Dynamic Main Categories based on transaction type */}
                      {formData.type === "income" && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-green-600">
                            Income Categories
                          </div>
                          {categories
                            .filter(
                              (cat) =>
                                cat.type === "income" &&
                                (!cat.parent_category_id ||
                                  cat.parent_category_id === null)
                            )
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </>
                      )}

                      {formData.type === "expense" && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-red-600">
                            Expense Categories
                          </div>
                          {categories
                            .filter(
                              (cat) =>
                                cat.type === "expense" &&
                                (!cat.parent_category_id ||
                                  cat.parent_category_id === null)
                            )
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </>
                      )}

                      {formData.type === "asset" && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-blue-600">
                            Asset Categories
                          </div>
                          {categories
                            .filter(
                              (cat) =>
                                cat.type === "asset" &&
                                (!cat.parent_category_id ||
                                  cat.parent_category_id === null)
                            )
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </>
                      )}

                      {formData.type === "liability" && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-orange-600">
                            Liability Categories
                          </div>
                          {categories
                            .filter(
                              (cat) =>
                                cat.type === "liability" &&
                                (!cat.parent_category_id ||
                                  cat.parent_category_id === null)
                            )
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </>
                      )}

                      {/* Show all categories if no type selected */}
                      {!formData.type && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                            Select transaction type first
                          </div>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory Selection - Only show when main category is selected */}
                {formData.main_category_id && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-category_id" className="text-right">
                      Subcategory
                    </Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        handleSelectChange("category_id", value)
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select subcategory (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No subcategory</SelectItem>
                        {categories
                          .filter(
                            (cat) =>
                              cat.parent_category_id &&
                              cat.parent_category_id.toString() ===
                                formData.main_category_id
                          )
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
                )}

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

          {/* Filters Section */}
          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={filters.search}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categories</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <div className="flex justify-between items-center">
                        <span className="truncate">
                          {getSelectedCategoriesText()}
                        </span>
                        {filters.categoryIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilters((prev) => ({
                                ...prev,
                                categoryIds: [],
                              }));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                categoryIds: [],
                              }))
                            }
                          >
                            Clear Selection
                          </Button>
                        </div>
                        <div className="max-h-[200px] overflow-auto">
                          <div className="grid grid-cols-1 gap-2">
                            {/* Group categories by type */}
                            {["income", "expense", "liability"].map((type) => (
                              <div key={type} className="space-y-1">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize">
                                  {type} Categories
                                </div>
                                {categories
                                  .filter((cat) => cat.type === type)
                                  .map((category) => (
                                    <div
                                      key={category.id}
                                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer"
                                      onClick={() => {
                                        const categoryId =
                                          category.id.toString();
                                        setFilters((prev) => ({
                                          ...prev,
                                          categoryIds:
                                            prev.categoryIds.includes(
                                              categoryId
                                            )
                                              ? prev.categoryIds.filter(
                                                  (id) => id !== categoryId
                                                )
                                              : [
                                                  ...prev.categoryIds,
                                                  categoryId,
                                                ],
                                        }));
                                      }}
                                    >
                                      <Checkbox
                                        checked={filters.categoryIds.includes(
                                          category.id.toString()
                                        )}
                                        className="pointer-events-none"
                                      />
                                      <span className="text-sm">
                                        {category.name}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <DatePicker
                      date={filters.startDate}
                      onSelect={(date) => handleFilterChange("startDate", date)}
                      className="w-[150px]"
                    />
                    <DatePicker
                      date={filters.endDate}
                      onSelect={(date) => handleFilterChange("endDate", date)}
                      className="w-[150px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All Filters
                </Button>
              </div>
            </Card>
          )}

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle className="border-b border-gray-200 pb-4">
                Transactions List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]">
                        <Checkbox
                          checked={
                            selectedItems.length > 0 &&
                            selectedItems.length === transactions.length &&
                            transactions.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction, index) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(transaction.id)}
                            onCheckedChange={() => handleSelect(transaction.id)}
                          />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
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
                            {formatter.format(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeDisplay(transaction)}
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {transaction.accounts?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {transaction.categories?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
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
                                  <AlertDialogTitle>
                                    Are you sure?
                                  </AlertDialogTitle>
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
                          colSpan={8}
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
        </TabsContent>

        <TabsContent value="journal-modes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction Modes Management</CardTitle>
                  <p className="text-sm text-gray-600">
                    Create and manage predefined transaction modes for automatic
                    journal entries
                  </p>
                </div>
                <Button
                  onClick={() => setIsAddModeDialogOpen(true)}
                  className="bg-fleet-purple hover:bg-fleet-purple-dark"
                >
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Add Transaction Mode
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactionModes.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {transactionModes.map((mode) => (
                      <div key={mode.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {mode.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                              {mode.description}
                            </p>
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Asset:</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    mode.asset_transaction === "asset_in"
                                      ? "bg-green-100 text-green-800"
                                      : mode.asset_transaction === "asset_out"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {mode.asset_transaction === "asset_in"
                                    ? "📈 In"
                                    : mode.asset_transaction === "asset_out"
                                    ? "📉 Out"
                                    : "❌ None"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Cash:</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    mode.cash_transaction === "cash_in"
                                      ? "bg-green-100 text-green-800"
                                      : mode.cash_transaction === "cash_out"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {mode.cash_transaction === "cash_in"
                                    ? "💰 In"
                                    : mode.cash_transaction === "cash_out"
                                    ? "💸 Out"
                                    : "❌ None"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Liability:</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    mode.liability_transaction ===
                                    "liability_in"
                                      ? "bg-green-100 text-green-800"
                                      : mode.liability_transaction ===
                                        "liability_out"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {mode.liability_transaction === "liability_in"
                                    ? "📈 In"
                                    : mode.liability_transaction ===
                                      "liability_out"
                                    ? "📉 Out"
                                    : "❌ None"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditModeClick(mode)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Transaction Mode
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{mode.name}
                                    "? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteTransactionMode(mode.id)
                                    }
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
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    No transaction modes found. Create your first transaction
                    mode to get started.
                  </p>
                  <Button
                    onClick={() => setIsAddModeDialogOpen(true)}
                    className="bg-fleet-purple hover:bg-fleet-purple-dark"
                  >
                    <PlusSquare className="mr-2 h-4 w-4" />
                    Add Transaction Mode
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Mode Dialog */}
      <Dialog open={isAddModeDialogOpen} onOpenChange={setIsAddModeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Transaction Mode</DialogTitle>
            <DialogDescription>
              Create a new predefined transaction mode for automatic journal
              entries.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mode-name" className="text-right">
                Name *
              </Label>
              <Input
                id="mode-name"
                name="name"
                value={modeFormData.name}
                onChange={handleModeInputChange}
                className="col-span-3"
                placeholder="e.g., Equipment Purchase"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mode-description" className="text-right">
                Description *
              </Label>
              <Input
                id="mode-description"
                name="description"
                value={modeFormData.description}
                onChange={handleModeInputChange}
                className="col-span-3"
                placeholder="e.g., Buying equipment - increases asset, decreases cash"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-transaction" className="text-right">
                Asset Transaction
              </Label>
              <Select
                value={modeFormData.asset_transaction}
                onValueChange={(value) =>
                  handleModeSelectChange("asset_transaction", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select asset transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">❌ No Asset Transaction</SelectItem>
                  <SelectItem value="asset_in">
                    📈 Asset In (Purchase/Acquire)
                  </SelectItem>
                  <SelectItem value="asset_out">
                    📉 Asset Out (Sell/Dispose)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cash-transaction" className="text-right">
                Cash Transaction
              </Label>
              <Select
                value={modeFormData.cash_transaction}
                onValueChange={(value) =>
                  handleModeSelectChange("cash_transaction", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select cash transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">❌ No Cash Transaction</SelectItem>
                  <SelectItem value="cash_in">💰 Cash In (Receipt)</SelectItem>
                  <SelectItem value="cash_out">
                    💸 Cash Out (Payment)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="liability-transaction" className="text-right">
                Liability Transaction
              </Label>
              <Select
                value={modeFormData.liability_transaction}
                onValueChange={(value) =>
                  handleModeSelectChange("liability_transaction", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select liability transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    ❌ No Liability Transaction
                  </SelectItem>
                  <SelectItem value="liability_in">
                    📈 Liability In (Incur Debt)
                  </SelectItem>
                  <SelectItem value="liability_out">
                    📉 Liability Out (Pay Debt)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Flow Preview */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Preview</Label>
              <div className="col-span-3 p-3 bg-gray-50 rounded-md border">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Transaction Flow:
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {modeFormData.asset_transaction !== "none" && (
                    <div className="flex items-center">
                      <span className="font-semibold">
                        {modeFormData.asset_transaction === "asset_in"
                          ? "📈 Asset In"
                          : "📉 Asset Out"}
                      </span>
                    </div>
                  )}
                  {modeFormData.cash_transaction !== "none" && (
                    <div className="flex items-center">
                      <span className="font-semibold">
                        {modeFormData.cash_transaction === "cash_in"
                          ? "💰 Cash In"
                          : "💸 Cash Out"}
                      </span>
                    </div>
                  )}
                  {modeFormData.liability_transaction !== "none" && (
                    <div className="flex items-center">
                      <span className="font-semibold">
                        {modeFormData.liability_transaction === "liability_in"
                          ? "📈 Liability In"
                          : "📉 Liability Out"}
                      </span>
                    </div>
                  )}
                  {modeFormData.asset_transaction === "none" &&
                    modeFormData.cash_transaction === "none" &&
                    modeFormData.liability_transaction === "none" && (
                      <div className="text-gray-500 italic">
                        No transactions selected
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModeDialogOpen(false);
                resetModeForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTransactionMode}
              className="bg-fleet-purple hover:bg-fleet-purple-dark"
            >
              Add Transaction Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Mode Dialog */}
      <Dialog
        open={isEditModeDialogOpen}
        onOpenChange={setIsEditModeDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction Mode</DialogTitle>
            <DialogDescription>
              Update the transaction mode details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mode-name" className="text-right">
                Name *
              </Label>
              <Input
                id="edit-mode-name"
                name="name"
                value={modeFormData.name}
                onChange={handleModeInputChange}
                className="col-span-3"
                placeholder="e.g., Equipment Purchase"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mode-description" className="text-right">
                Description *
              </Label>
              <Input
                id="edit-mode-description"
                name="description"
                value={modeFormData.description}
                onChange={handleModeInputChange}
                className="col-span-3"
                placeholder="e.g., Buying equipment - increases asset, decreases cash"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-asset-transaction" className="text-right">
                Asset Transaction
              </Label>
              <Select
                value={modeFormData.asset_transaction}
                onValueChange={(value) =>
                  handleModeSelectChange("asset_transaction", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select asset transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">❌ No Asset Transaction</SelectItem>
                  <SelectItem value="asset_in">
                    📈 Asset In (Purchase/Acquire)
                  </SelectItem>
                  <SelectItem value="asset_out">
                    📉 Asset Out (Sell/Dispose)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cash-transaction" className="text-right">
                Cash Transaction
              </Label>
              <Select
                value={modeFormData.cash_transaction}
                onValueChange={(value) =>
                  handleModeSelectChange("cash_transaction", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select cash transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">❌ No Cash Transaction</SelectItem>
                  <SelectItem value="cash_in">💰 Cash In (Receipt)</SelectItem>
                  <SelectItem value="cash_out">
                    💸 Cash Out (Payment)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-liability-transaction"
                className="text-right"
              >
                Liability Transaction
              </Label>
              <Select
                value={modeFormData.liability_transaction}
                onValueChange={(value) =>
                  handleModeSelectChange("liability_transaction", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select liability transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    ❌ No Liability Transaction
                  </SelectItem>
                  <SelectItem value="liability_in">
                    📈 Liability In (Incur Debt)
                  </SelectItem>
                  <SelectItem value="liability_out">
                    📉 Liability Out (Pay Debt)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Flow Preview */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Preview</Label>
              <div className="col-span-3 p-3 bg-gray-50 rounded-md border">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Transaction Flow:
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {modeFormData.asset_transaction !== "none" && (
                    <div className="flex items-center">
                      <span className="font-semibold">
                        {modeFormData.asset_transaction === "asset_in"
                          ? "📈 Asset In"
                          : "📉 Asset Out"}
                      </span>
                    </div>
                  )}
                  {modeFormData.cash_transaction !== "none" && (
                    <div className="flex items-center">
                      <span className="font-semibold">
                        {modeFormData.cash_transaction === "cash_in"
                          ? "💰 Cash In"
                          : "💸 Cash Out"}
                      </span>
                    </div>
                  )}
                  {modeFormData.liability_transaction !== "none" && (
                    <div className="flex items-center">
                      <span className="font-semibold">
                        {modeFormData.liability_transaction === "liability_in"
                          ? "📈 Liability In"
                          : "📉 Liability Out"}
                      </span>
                    </div>
                  )}
                  {modeFormData.asset_transaction === "none" &&
                    modeFormData.cash_transaction === "none" &&
                    modeFormData.liability_transaction === "none" && (
                      <div className="text-gray-500 italic">
                        No transactions selected
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModeDialogOpen(false);
                setSelectedMode(null);
                resetModeForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTransactionMode}
              className="bg-fleet-purple hover:bg-fleet-purple-dark"
            >
              Update Transaction Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsSection;
