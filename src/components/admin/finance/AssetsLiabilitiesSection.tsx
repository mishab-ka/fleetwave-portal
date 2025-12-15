import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  CalendarIcon,
} from "lucide-react";
import { formatter } from "@/lib/utils";

interface Asset {
  id: string;
  type: string;
  value: number;
  description?: string;
  purchase_date: string;
  created_at?: string;
}

interface Account {
  id: string;
  account_code: string;
  name: string;
  type: string;
  balance: number;
  normal_balance: string;
}

interface Liability {
  id: string;
  type: string;
  due_date: string;
  amount_due: number;
  status: string;
  description?: string;
  created_at?: string;
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
  accounts: {
    name: string;
  };
  categories: {
    name: string;
  };
}

interface AssetsLiabilitiesSectionProps {
  refreshTrigger?: number;
}

const AssetsLiabilitiesSection = ({
  refreshTrigger,
}: AssetsLiabilitiesSectionProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assets");
  const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false);
  const [isAddLiabilityDialogOpen, setIsAddLiabilityDialogOpen] =
    useState(false);
  const [assetDate, setAssetDate] = useState(new Date());
  const [liabilityDate, setLiabilityDate] = useState(new Date());

  const [assetFormData, setAssetFormData] = useState({
    type: "",
    value: "",
    description: "",
    purchase_date: new Date().toISOString().split("T")[0],
    asset_transaction_type: "asset_in", // "asset_in" or "asset_out"
    cash_transaction_type: "cash_out", // "cash_out" or "cash_in"
    payment_account_id: "", // Account to use for cash transaction
  });

  const [liabilityFormData, setLiabilityFormData] = useState({
    type: "Loan",
    due_date: new Date().toISOString().split("T")[0],
    amount_due: "",
    status: "Pending",
    description: "",
    amount_type: "positive", // "positive" or "negative"
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch old Asset and Liability transactions (capitalized)
      const { data: oldAssetsData, error: oldAssetsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "Asset")
        .order("created_at", { ascending: false });

      if (oldAssetsError) throw oldAssetsError;

      const { data: oldLiabilitiesData, error: oldLiabilitiesError } =
        await supabase
          .from("transactions")
          .select("*")
          .eq("type", "Liability")
          .order("date", { ascending: true });

      if (oldLiabilitiesError) throw oldLiabilitiesError;

      // Fetch new asset and liability transactions (lowercase)
      const { data: newTransactionsData, error: newTransactionsError } =
        await supabase
          .from("transactions")
          .select(
            `
          id,
          description,
          amount,
          type,
          date,
          created_at,
          account_id,
          category_id,
          accounts:account_id (name),
          categories:category_id (name)
        `
          )
          .in("type", ["asset", "liability"])
          .order("created_at", { ascending: false });

      if (newTransactionsError) throw newTransactionsError;

      // Fetch accounts for payment selection
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (accountsError) throw accountsError;

      // Transform old assets (capitalized)
      const transformedOldAssets = (oldAssetsData || []).map((item) => ({
        id: item.id.toString(),
        type: item.description || "Unknown Asset",
        value: item.amount || 0,
        description: item.description,
        purchase_date: item.date,
        created_at: item.created_at,
      }));

      // Transform old liabilities (capitalized)
      const transformedOldLiabilities = (oldLiabilitiesData || []).map(
        (item) => ({
          id: item.id.toString(),
          type: item.description || "Loan",
          due_date: item.date,
          amount_due: Math.abs(item.amount) || 0,
          status: item.description?.includes("Paid")
            ? "Paid"
            : item.description?.includes("Overdue")
            ? "Overdue"
            : "Pending",
          description: item.description,
          created_at: item.created_at,
        })
      );

      // Transform new asset transactions (lowercase)
      const transformedNewAssets = (newTransactionsData || [])
        .filter((item) => item.type === "asset")
        .map((item) => ({
          id: item.id.toString(),
          type: (item.categories as any)?.name || item.description || "Asset",
          value: item.amount || 0, // Keep actual amount (positive or negative)
          description: item.description,
          purchase_date: item.date,
          created_at: item.created_at,
        }));

      // Transform new liability transactions (lowercase)
      const transformedNewLiabilities = (newTransactionsData || [])
        .filter((item) => item.type === "liability")
        .map((item) => ({
          id: item.id.toString(),
          type:
            (item.categories as any)?.name || item.description || "Liability",
          due_date: item.date,
          amount_due: item.amount || 0, // Keep actual amount (positive or negative)
          status: "Pending", // Default status for new liability transactions
          description: item.description,
          created_at: item.created_at,
        }));

      // Combine old and new assets
      const allAssets = [...transformedOldAssets, ...transformedNewAssets];

      // Combine old and new liabilities
      const allLiabilities = [
        ...transformedOldLiabilities,
        ...transformedNewLiabilities,
      ];

      setAssets(allAssets);
      setLiabilities(allLiabilities);
      setAccounts(accountsData || []);
      setTransactions((newTransactionsData as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load assets and liabilities data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchData();
    }
  }, [refreshTrigger]);

  const handleAssetInputChange = (e) => {
    const { name, value } = e.target;
    setAssetFormData((prev) => ({
      ...prev,
      [name]:
        name === "value" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  const handleLiabilityInputChange = (e) => {
    const { name, value } = e.target;
    setLiabilityFormData((prev) => ({
      ...prev,
      [name]:
        name === "amount_due" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  const handleAssetDateSelect = (selectedDate) => {
    setAssetDate(selectedDate);
    setAssetFormData((prev) => ({
      ...prev,
      purchase_date: format(selectedDate, "yyyy-MM-dd"),
    }));
  };

  const handleLiabilityDateSelect = (selectedDate) => {
    setLiabilityDate(selectedDate);
    setLiabilityFormData((prev) => ({
      ...prev,
      due_date: format(selectedDate, "yyyy-MM-dd"),
    }));
  };

  const handleSelectChange = (name, value, formType) => {
    if (formType === "asset") {
      setAssetFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setLiabilityFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddAsset = async () => {
    try {
      if (
        !assetFormData.type ||
        !assetFormData.value ||
        !assetFormData.payment_account_id
      ) {
        toast.error(
          "Please fill all required fields including payment account"
        );
        return;
      }

      const amount = parseFloat(assetFormData.value as string);
      if (amount === 0) {
        toast.error("Amount cannot be zero");
        return;
      }

      // Get the selected account to check balance
      const selectedAccount = accounts.find(
        (acc) => acc.id === assetFormData.payment_account_id
      );
      if (!selectedAccount) {
        toast.error("Selected payment account not found");
        return;
      }

      // Calculate transaction amounts based on transaction types
      let assetAmount = 0;
      let cashAmount = 0;

      if (assetFormData.asset_transaction_type === "asset_in") {
        assetAmount = Math.abs(amount); // Positive for asset increase
      } else {
        assetAmount = -Math.abs(amount); // Negative for asset decrease
      }

      if (assetFormData.cash_transaction_type === "cash_out") {
        cashAmount = -Math.abs(amount); // Negative for cash decrease
      } else {
        cashAmount = Math.abs(amount); // Positive for cash increase
      }

      // Check if account has sufficient balance for cash out transactions
      if (
        assetFormData.cash_transaction_type === "cash_out" &&
        selectedAccount.balance < Math.abs(cashAmount)
      ) {
        toast.error(
          `Insufficient balance in ${
            selectedAccount.name
          }. Available: ${formatter.format(selectedAccount.balance)}`
        );
        return;
      }

      // Create both asset and cash transactions
      const transactions = [
        {
          amount: assetAmount,
          type: "asset",
          description: `${assetFormData.type} ${
            assetFormData.asset_transaction_type === "asset_in"
              ? "Purchase"
              : "Sale"
          }${
            assetFormData.description ? ` - ${assetFormData.description}` : ""
          }`,
          date: assetFormData.purchase_date,
          account_id: assetFormData.payment_account_id,
          category_id: null,
        },
        {
          amount: cashAmount,
          type:
            assetFormData.cash_transaction_type === "cash_out"
              ? "expense"
              : "income",
          description: `Cash ${
            assetFormData.cash_transaction_type === "cash_out"
              ? "Payment"
              : "Receipt"
          } for ${assetFormData.type}${
            assetFormData.description ? ` - ${assetFormData.description}` : ""
          }`,
          date: assetFormData.purchase_date,
          account_id: assetFormData.payment_account_id,
          category_id: null,
        },
      ];

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .insert(transactions)
        .select();

      if (transactionError) throw transactionError;

      // Update the account balance
      const newBalance = selectedAccount.balance + cashAmount;
      const { error: accountUpdateError } = await supabase
        .from("accounts")
        .update({
          balance: newBalance,
        })
        .eq("id", assetFormData.payment_account_id);

      if (accountUpdateError) throw accountUpdateError;

      toast.success("Asset and cash transactions processed successfully");
      fetchData();
      setIsAddAssetDialogOpen(false);
      resetAssetForm();
    } catch (error) {
      console.error("Error adding asset:", error);
      toast.error("Failed to add asset");
    }
  };

  const handleAddLiability = async () => {
    try {
      if (!liabilityFormData.type || !liabilityFormData.amount_due) {
        toast.error("Please fill all required fields");
        return;
      }

      const amount = parseFloat(liabilityFormData.amount_due as string);
      const finalAmount =
        liabilityFormData.amount_type === "negative"
          ? -Math.abs(amount)
          : Math.abs(amount);

      const { error } = await supabase.from("transactions").insert([
        {
          amount: finalAmount,
          type: "liability", // Use lowercase for consistency
          description: `${liabilityFormData.type} - ${
            liabilityFormData.status
          } - ${liabilityFormData.description || ""}`,
          date: liabilityFormData.due_date,
        },
      ]);

      if (error) throw error;

      toast.success("Liability added successfully");
      fetchData();
      setIsAddLiabilityDialogOpen(false);
      resetLiabilityForm();
    } catch (error) {
      console.error("Error adding liability:", error);
      toast.error("Failed to add liability");
    }
  };

  const handleDeleteAsset = async (id) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Asset deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  const handleDeleteLiability = async (id) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Liability deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting liability:", error);
      toast.error("Failed to delete liability");
    }
  };

  const handleUpdateLiabilityStatus = async (id, newStatus) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      let updatedDescription = data.description || "";

      // Replace status in description if it exists
      if (
        updatedDescription.includes("Pending") ||
        updatedDescription.includes("Paid") ||
        updatedDescription.includes("Overdue")
      ) {
        updatedDescription = updatedDescription.replace(
          /Pending|Paid|Overdue/,
          newStatus
        );
      } else {
        // Add status if not present
        updatedDescription = `${updatedDescription} - ${newStatus}`;
      }

      const { error } = await supabase
        .from("transactions")
        .update({ description: updatedDescription })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Liability marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error("Error updating liability status:", error);
      toast.error("Failed to update liability status");
    }
  };

  const resetAssetForm = () => {
    setAssetFormData({
      type: "",
      value: "",
      description: "",
      purchase_date: new Date().toISOString().split("T")[0],
      asset_transaction_type: "asset_in",
      cash_transaction_type: "cash_out",
      payment_account_id: "",
    });
    setAssetDate(new Date());
  };

  const resetLiabilityForm = () => {
    setLiabilityFormData({
      type: "Loan",
      due_date: new Date().toISOString().split("T")[0],
      amount_due: "",
      status: "Pending",
      description: "",
      amount_type: "positive",
    });
    setLiabilityDate(new Date());
  };

  const calculateTotals = () => {
    const totalAssets = assets.reduce(
      (sum, asset) => sum + parseFloat(asset.value.toString() || "0"),
      0
    );
    const totalLiabilities = liabilities.reduce(
      (sum, liability) =>
        sum + parseFloat(liability.amount_due.toString() || "0"),
      0
    );
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(totalAssets)}
            </div>
            <p className="text-xs text-muted-foreground">Current valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Total Liabilities
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(totalLiabilities)}
            </div>
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
            <div
              className={`text-2xl font-bold ${
                netWorth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatter.format(netWorth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Assets - Liabilities
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {activeTab === "assets" ? (
            <Dialog
              open={isAddAssetDialogOpen}
              onOpenChange={setIsAddAssetDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                  <Plus className="mr-2 h-4 w-4" />
                  Asset & Cash Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Asset & Cash Transaction</DialogTitle>
                  <DialogDescription>
                    Create dual transactions: one for asset changes and one for
                    cash flow. Example: Asset In + Cash Out = Purchase asset,
                    Asset Out + Cash In = Sell asset.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-type" className="text-right">
                      Asset Type
                    </Label>
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
                    <Label htmlFor="asset-value" className="text-right">
                      Value
                    </Label>
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
                    <Label
                      htmlFor="asset-transaction-type"
                      className="text-right"
                    >
                      Asset Transaction *
                    </Label>
                    <Select
                      value={assetFormData.asset_transaction_type}
                      onValueChange={(value) =>
                        handleSelectChange(
                          "asset_transaction_type",
                          value,
                          "asset"
                        )
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select asset transaction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset_in">
                          📈 Asset In (Increase Assets)
                        </SelectItem>
                        <SelectItem value="asset_out">
                          📉 Asset Out (Decrease Assets)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="cash-transaction-type"
                      className="text-right"
                    >
                      Cash Transaction *
                    </Label>
                    <Select
                      value={assetFormData.cash_transaction_type}
                      onValueChange={(value) =>
                        handleSelectChange(
                          "cash_transaction_type",
                          value,
                          "asset"
                        )
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select cash transaction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash_out">
                          💸 Cash Out (Decrease Cash)
                        </SelectItem>
                        <SelectItem value="cash_in">
                          💰 Cash In (Increase Cash)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transaction Flow Indicator */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Transaction Flow</Label>
                    <div className="col-span-3 p-3 bg-gray-50 rounded-md border">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Selected Transaction:
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">
                          {assetFormData.asset_transaction_type === "asset_in"
                            ? "📈 Asset In"
                            : "📉 Asset Out"}
                        </span>
                        {" + "}
                        <span className="font-semibold">
                          {assetFormData.cash_transaction_type === "cash_out"
                            ? "💸 Cash Out"
                            : "💰 Cash In"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {assetFormData.value &&
                          assetFormData.asset_transaction_type &&
                          assetFormData.cash_transaction_type && (
                            <>
                              Asset:{" "}
                              {assetFormData.asset_transaction_type ===
                              "asset_in"
                                ? "+"
                                : "-"}
                              ${assetFormData.value} | Cash:{" "}
                              {assetFormData.cash_transaction_type ===
                              "cash_out"
                                ? "-"
                                : "+"}
                              ${assetFormData.value}
                            </>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="asset-payment-account"
                      className="text-right"
                    >
                      Cash Account *
                    </Label>
                    <Select
                      value={assetFormData.payment_account_id}
                      onValueChange={(value) =>
                        handleSelectChange("payment_account_id", value, "asset")
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select payment account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - {account.account_code} (
                            {formatter.format(account.balance)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-purchase-date" className="text-right">
                      Purchase Date
                    </Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {assetDate ? (
                              format(assetDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                    <Label htmlFor="asset-description" className="text-right">
                      Description
                    </Label>
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
                  <Button
                    variant="outline"
                    onClick={() => setIsAddAssetDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAsset}
                    className="bg-fleet-purple hover:bg-fleet-purple-dark"
                  >
                    Process Transactions
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog
              open={isAddLiabilityDialogOpen}
              onOpenChange={setIsAddLiabilityDialogOpen}
            >
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
                    <Label htmlFor="liability-type" className="text-right">
                      Type
                    </Label>
                    <Select
                      value={liabilityFormData.type}
                      onValueChange={(value) =>
                        handleSelectChange("type", value, "liability")
                      }
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
                    <Label htmlFor="liability-amount" className="text-right">
                      Amount Due
                    </Label>
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
                    <Label
                      htmlFor="liability-amount-type"
                      className="text-right"
                    >
                      Amount Type
                    </Label>
                    <Select
                      value={liabilityFormData.amount_type}
                      onValueChange={(value) =>
                        handleSelectChange("amount_type", value, "liability")
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select amount type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">
                          + (Add to Liabilities)
                        </SelectItem>
                        <SelectItem value="negative">
                          - (Reduce Liabilities)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="liability-due-date" className="text-right">
                      Due Date
                    </Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {liabilityDate ? (
                              format(liabilityDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                    <Label htmlFor="liability-status" className="text-right">
                      Status
                    </Label>
                    <Select
                      value={liabilityFormData.status}
                      onValueChange={(value) =>
                        handleSelectChange("status", value, "liability")
                      }
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
                    <Label
                      htmlFor="liability-description"
                      className="text-right"
                    >
                      Description
                    </Label>
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
                  <Button
                    variant="outline"
                    onClick={() => setIsAddLiabilityDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddLiability}
                    className="bg-fleet-purple hover:bg-fleet-purple-dark"
                  >
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
              <CardDescription>
                All company assets and their current valuations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
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
                        <td className="p-3">{asset.description || "-"}</td>
                        <td className="p-3">
                          {asset.purchase_date
                            ? format(
                                new Date(asset.purchase_date),
                                "MMM dd, yyyy"
                              )
                            : "-"}
                        </td>
                        <td className="p-3 text-right font-medium">
                          <span
                            className={
                              asset.value >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {asset.value >= 0 ? "+" : ""}
                            {formatter.format(asset.value)}
                          </span>
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
                        <td
                          colSpan={5}
                          className="p-4 text-center text-gray-500"
                        >
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
              <CardDescription>
                All outstanding loans, EMIs and financial obligations
              </CardDescription>
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
                      <tr
                        key={liability.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3">{liability.type}</td>
                        <td className="p-3">{liability.description || "-"}</td>
                        <td className="p-3">
                          {format(new Date(liability.due_date), "MMM dd, yyyy")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              liability.status === "Paid"
                                ? "bg-green-100 text-green-800"
                                : liability.status === "Overdue"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {liability.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">
                          <span
                            className={
                              liability.amount_due >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {liability.amount_due >= 0 ? "+" : ""}
                            {formatter.format(liability.amount_due)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteLiability(liability.id)
                              }
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
                        <td
                          colSpan={6}
                          className="p-4 text-center text-gray-500"
                        >
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

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Asset & Liability Transactions</CardTitle>
              <CardDescription>
                All transactions categorized as assets or liabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="p-3 font-medium">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="p-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === "asset"
                                ? "bg-blue-100 text-blue-800"
                                : transaction.type === "liability"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </TableCell>
                        <TableCell className="p-3 text-right font-medium">
                          <span
                            className={
                              transaction.amount >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatter.format(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="p-3">
                          {new Date(transaction.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="p-3">
                          {transaction.accounts?.name || "N/A"}
                        </TableCell>
                        <TableCell className="p-3">
                          {transaction.categories?.name || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}

                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="p-4 text-center text-gray-500"
                        >
                          No asset or liability transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetsLiabilitiesSection;
