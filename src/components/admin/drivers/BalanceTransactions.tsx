import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Plus,
  Edit,
  Trash,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatter } from "@/lib/utils";

interface BalanceTransactionsProps {
  driverId: string;
  currentBalance: number;
  onBalanceUpdate?: () => void;
}

type TransactionType = "due" | "deposit" | "refund" | "penalty" | "bonus";

interface BalanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description?: string;
  created_at: string;
  created_by: string;
}

export const BalanceTransactions = ({
  driverId,
  currentBalance,
  onBalanceUpdate,
}: BalanceTransactionsProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [transactionType, setTransactionType] =
    useState<TransactionType>("due");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<BalanceTransaction | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditingBalance, setIsEditingBalance] = useState<boolean>(false);
  const [newBalance, setNewBalance] = useState<string>("");
  const [editBalanceReason, setEditBalanceReason] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");

  useEffect(() => {
    if (driverId) {
      fetchTransactions();
    }
  }, [driverId]);

  useEffect(() => {
    // Update the newBalance state whenever currentBalance changes
    setNewBalance(currentBalance.toString());
  }, [currentBalance]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      console.log("Fetching transactions for driverId:", driverId);
      
      const { data, error } = await supabase
        .from("driver_balance_transactions")
        .select("*")
        .eq("user_id", driverId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        throw error;
      }
      
      console.log("Fetched transactions:", data);
      console.log("Transaction count:", data?.length || 0);
      setTransactions(data || []);
      
      if (data && data.length === 0) {
        console.log("No transactions found in database for driverId:", driverId);
      }
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      
      let errorMessage = "Failed to load transaction history";
      if (error?.code === "42501") {
        errorMessage = "Permission denied: Cannot view transactions. Please check RLS policies in Supabase.";
      } else if (error?.code === "PGRST116") {
        errorMessage = "No transactions found for this driver.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        description: error?.code === "42501" 
          ? "Contact your administrator to verify Row Level Security policies allow your role to view transactions."
          : "Please check the browser console for more details.",
        duration: 5000,
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0 || !transactionType) {
      toast.error("Please enter a valid amount and select a transaction type");
      return;
    }

    try {
      setIsSubmitting(true);

      const isPositive = ["deposit", "refund", "bonus"].includes(
        transactionType
      );
      const numericAmount = parseFloat(amount);
      const balanceChange = isPositive ? numericAmount : -numericAmount;

      const { error: txError } = await supabase
        .from("driver_balance_transactions")
        .insert({
          user_id: driverId,
          amount: numericAmount,
          type: transactionType,
          description: description || undefined,
          created_by: user?.id,
        });

      if (txError) throw txError;

      const { error: userError } = await supabase
        .from("users")
        .update({
          pending_balance: currentBalance + balanceChange,
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Transaction added successfully");

      setAmount("");
      setDescription("");
      setIsAdding(false);

      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      // First, get the transaction details to calculate balance adjustment
      const { data: transactionData, error: fetchError } = await supabase
        .from("driver_balance_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate the balance adjustment
      const isPositive = ["deposit", "refund", "bonus"].includes(
        transactionData.type
      );
      const amountChange = isPositive
        ? -transactionData.amount
        : transactionData.amount;

      // Delete the transaction
      const { error } = await supabase
        .from("driver_balance_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      // Update the user's balance
      const { error: userError } = await supabase
        .from("users")
        .update({
          pending_balance: currentBalance + amountChange,
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Transaction deleted successfully");
      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const handleEditTransaction = async (transaction: BalanceTransaction) => {
    setAmount(transaction.amount.toString());
    setDescription(transaction.description || "");
    setTransactionType(transaction.type);
    setEditDate(transaction.created_at.split("T")[0]);
    setSelectedTransaction(transaction);
    setIsAdding(false);
    setIsEditing(true);
  };

  const handleUpdateTransaction = async () => {
    if (
      !selectedTransaction ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !transactionType ||
      !editDate
    ) {
      toast.error(
        "Please enter a valid amount, select a transaction type, and provide a date"
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const isPositive = ["deposit", "refund", "bonus"].includes(
        transactionType
      );
      const numericAmount = parseFloat(amount);
      const oldAmount = selectedTransaction.amount;
      const oldIsPositive = ["deposit", "refund", "bonus"].includes(
        selectedTransaction.type
      );

      // Calculate the balance difference
      const oldBalanceChange = oldIsPositive ? oldAmount : -oldAmount;
      const newBalanceChange = isPositive ? numericAmount : -numericAmount;
      const balanceDifference = newBalanceChange - oldBalanceChange;

      // Update the transaction
      const { error: txError } = await supabase
        .from("driver_balance_transactions")
        .update({
          amount: numericAmount,
          type: transactionType,
          description: description || undefined,
          created_at: editDate,
        })
        .eq("id", selectedTransaction.id);

      if (txError) throw txError;

      // Update the user's balance
      const { error: userError } = await supabase
        .from("users")
        .update({
          pending_balance: currentBalance + balanceDifference,
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Transaction updated successfully");

      setAmount("");
      setDescription("");
      setEditDate("");
      setIsEditing(false);
      setSelectedTransaction(null);

      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBalance = () => {
    setIsEditingBalance(true);
    setNewBalance(currentBalance.toString());
    setEditBalanceReason("");
  };

  const handleCancelEditBalance = () => {
    setIsEditingBalance(false);
    setNewBalance(currentBalance.toString());
    setEditBalanceReason("");
  };

  const handleSaveNewBalance = async () => {
    if (!newBalance || isNaN(parseFloat(newBalance))) {
      toast.error("Please enter a valid balance amount");
      return;
    }

    if (!editBalanceReason.trim()) {
      toast.error("Please provide a reason for the balance adjustment");
      return;
    }

    try {
      setIsSubmitting(true);

      const oldBalance = currentBalance;
      const newBalanceValue = parseFloat(newBalance);
      const balanceDifference = newBalanceValue - oldBalance;

      // Determine transaction type based on the balance change
      let adjustmentType: TransactionType = "deposit";
      if (balanceDifference < 0) {
        adjustmentType = "due";
      } else {
        adjustmentType = "deposit";
      }

      // Add a transaction record for the manual adjustment
      const { error: txError } = await supabase
        .from("driver_balance_transactions")
        .insert({
          user_id: driverId,
          amount: Math.abs(balanceDifference),
          type: adjustmentType,
          description: `Manual balance adjustment: ${editBalanceReason}`,
          created_by: user?.id,
        });

      if (txError) throw txError;

      // Update the user's balance
      const { error: userError } = await supabase
        .from("users")
        .update({
          pending_balance: newBalanceValue,
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Balance updated successfully");

      setIsEditingBalance(false);
      fetchTransactions();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error("Failed to update balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionLabel = (type: TransactionType) => {
    switch (type) {
      case "due":
        return "Amount Due";
      case "deposit":
        return "Deposit Added";
      case "refund":
        return "Refund Issued";
      case "penalty":
        return "Penalty";
      case "bonus":
        return "Bonus";
      default:
        return type;
    }
  };

  const isPositiveTransaction = (type: TransactionType) => {
    return ["deposit", "refund", "bonus"].includes(type);
  };

  // const handleEditBalance = () => {
  //   const { error: userError } = await supabase
  //   .from('users')
  //   .update({
  //     pending_balance: newBalanceValue
  //   })
  //   .eq('id', driverId);
  // }

  const filteredTransactions = transactions;

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex justify-between items-center">
            Current Balance
            {!isEditingBalance && (
              <Button variant="outline" size="sm" onClick={handleEditBalance}>
                <Edit className="h-4 w-4 mr-1" /> Edit Balance
              </Button>
            )}
          </CardTitle>

          {isEditingBalance ? (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="new-balance" className="w-20">
                  New Balance:
                </Label>
                <Input
                  id="new-balance"
                  type="number"
                  placeholder="Enter new balance"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex items-start gap-2">
                <Label htmlFor="balance-reason" className="w-20 pt-2">
                  Reason:
                </Label>
                <Input
                  id="balance-reason"
                  placeholder="Reason for adjustment"
                  value={editBalanceReason}
                  onChange={(e) => setEditBalanceReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditBalance}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNewBalance}
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-1" />{" "}
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold">
                ₹{currentBalance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentBalance < 0
                  ? "Amount due from driver"
                  : currentBalance > 0
                  ? "Amount available to driver"
                  : "No pending balance"}
              </div>
            </>
          )}
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setIsAdding(!isAdding)}
            className="w-full text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>

          {isAdding && (
            <div className="mt-4 p-4 border rounded-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={(value) =>
                      setTransactionType(value as TransactionType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Due (Driver owes)</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="penalty">Penalty</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Enter description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Transaction"}
                </Button>
              </div>
            </div>
          )}

          {isEditing && selectedTransaction && (
            <div className="mt-4 p-4 border rounded-md space-y-4">
              <h3 className="text-lg font-semibold">Edit Transaction</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={(value) =>
                      setTransactionType(value as TransactionType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Due (Driver owes)</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="penalty">Penalty</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-description">
                    Description (Optional)
                  </Label>
                  <Input
                    id="edit-description"
                    placeholder="Enter description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedTransaction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateTransaction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating..." : "Update Transaction"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
              <p className="font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                This driver has no deposit, refund, due, penalty, or bonus transactions yet.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                If you expected to see transactions, please check:
              </p>
              <ul className="text-xs text-muted-foreground text-left max-w-md mx-auto mt-2 space-y-1">
                <li>• RLS policies allow your role to view transactions</li>
                <li>• Transactions exist in the database for this driver</li>
                <li>• Check browser console for error messages</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="hidden md:block w-full">
                <ScrollArea className="h-[300px] w-full">
                  <div className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => {
                          const isPositiveTransaction = [
                            "deposit",
                            "refund",
                            "bonus",
                          ].includes(transaction.type);
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                <span
                                  className={`flex items-center font-medium ${
                                    isPositiveTransaction
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }`}
                                >
                                  {isPositiveTransaction ? (
                                    <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                                  ) : (
                                    <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                                  )}
                                  {formatter.format(transaction.amount)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    isPositiveTransaction
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {getTransactionLabel(transaction.type)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  transaction.created_at
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleEditTransaction(transaction)
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  {isAdmin && (
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
                                            Delete Transaction?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This
                                            will permanently delete the
                                            transaction.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDeleteTransaction(
                                                transaction.id
                                              )
                                            }
                                            className="bg-red-500 hover:bg-red-600"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          <div className="md:hidden w-full">
            <ScrollArea className="h-[300px] w-full">
              {filteredTransactions.map((transaction) => {
                const isPositiveTransaction = [
                  "deposit",
                  "refund",
                  "bonus",
                ].includes(transaction.type);
                return (
                  <div
                    key={transaction.id}
                    className="border-b border-gray-200 py-4 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`flex items-center font-medium ${
                          isPositiveTransaction
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {isPositiveTransaction ? (
                          <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                        )}
                        {formatter.format(transaction.amount)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPositiveTransaction
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {getTransactionLabel(transaction.type)}
                      </span>
                    </div>

                    {transaction.description && (
                      <p className="text-sm text-gray-600">
                        {transaction.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {isAdmin && (
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
                                  Delete Transaction?
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <AlertCircle className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">No transactions found</p>
                  <p className="text-xs text-muted-foreground">
                    This driver has no deposit transactions yet.
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
