import React, { useState, useEffect, useMemo } from "react";
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
  Gift,
  AlertTriangle,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
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

interface PenaltyManagementProps {
  driverId: string;
  currentPenalties: number;
  onPenaltyUpdate?: () => void;
}

type PenaltyType =
  | "penalty"
  | "penalty_paid"
  | "bonus"
  | "refund"
  | "due"
  | "extra_collection";

interface PenaltyTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: PenaltyType;
  description?: string;
  created_at: string;
  created_by: string;
}

export const PenaltyManagement = ({
  driverId,
  currentPenalties,
  onPenaltyUpdate,
}: PenaltyManagementProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<PenaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [penaltyType, setPenaltyType] = useState<PenaltyType>("penalty");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PenaltyTransaction | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditingPenalties, setIsEditingPenalties] = useState<boolean>(false);
  const [newPenalties, setNewPenalties] = useState<string>("");
  const [editPenaltyReason, setEditPenaltyReason] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");

  useEffect(() => {
    if (driverId) {
      fetchTransactions();
    }
  }, [driverId]);

  useEffect(() => {
    // Update the newPenalties state whenever currentPenalties changes
    setNewPenalties(currentPenalties.toString());
  }, [currentPenalties]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("driver_penalty_transactions")
        .select("*")
        .eq("user_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching penalty transactions:", error);
      toast.error("Failed to load penalty transaction history");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0 || !penaltyType) {
      toast.error("Please enter a valid amount and select a transaction type");
      return;
    }

    try {
      setIsSubmitting(true);

      const isPositive = ["bonus", "refund"].includes(penaltyType);
      const numericAmount = parseFloat(amount);
      const penaltyChange = isPositive
        ? 0
        : penaltyType === "penalty" ||
          penaltyType === "due" ||
          penaltyType === "extra_collection"
        ? numericAmount
        : -numericAmount;

      const { error: txError } = await supabase
        .from("driver_penalty_transactions")
        .insert({
          user_id: driverId,
          amount: numericAmount,
          type: penaltyType,
          description: description || undefined,
          created_by: user?.id,
        });

      if (txError) throw txError;

      // Update driver's total penalties
      const { error: userError } = await supabase
        .from("users")
        .update({
          total_penalties: Math.max(0, currentPenalties + penaltyChange),
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Penalty transaction added successfully");

      setAmount("");
      setDescription("");
      setIsAdding(false);

      fetchTransactions();
      if (onPenaltyUpdate) onPenaltyUpdate();
    } catch (error) {
      console.error("Error adding penalty transaction:", error);
      toast.error("Failed to add penalty transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      // First, get the transaction details to calculate penalty adjustment
      const { data: transactionData, error: fetchError } = await supabase
        .from("driver_penalty_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate the penalty adjustment
      const isPositive = ["bonus", "refund"].includes(transactionData.type);
      const penaltyChange = isPositive
        ? 0
        : transactionData.type === "penalty" ||
          transactionData.type === "due" ||
          transactionData.type === "extra_collection"
        ? -transactionData.amount
        : transactionData.amount;

      // Delete the transaction
      const { error } = await supabase
        .from("driver_penalty_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      // Update the user's penalties
      const { error: userError } = await supabase
        .from("users")
        .update({
          total_penalties: Math.max(0, currentPenalties + penaltyChange),
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Transaction deleted successfully");
      fetchTransactions();
      if (onPenaltyUpdate) onPenaltyUpdate();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const handleEditTransaction = async (transaction: PenaltyTransaction) => {
    setAmount(transaction.amount.toString());
    setDescription(transaction.description || "");
    setPenaltyType(transaction.type);
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
      !penaltyType ||
      !editDate
    ) {
      toast.error(
        "Please enter a valid amount, select a transaction type, and provide a date"
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const isPositive = ["bonus", "refund"].includes(penaltyType);
      const numericAmount = parseFloat(amount);
      const oldAmount = selectedTransaction.amount;
      const oldIsPositive = ["bonus", "refund"].includes(
        selectedTransaction.type
      );

      // Calculate the penalty difference
      const oldPenaltyChange = oldIsPositive
        ? 0
        : selectedTransaction.type === "penalty" ||
          selectedTransaction.type === "due" ||
          selectedTransaction.type === "extra_collection"
        ? oldAmount
        : -oldAmount;
      const newPenaltyChange = isPositive
        ? 0
        : penaltyType === "penalty" ||
          penaltyType === "due" ||
          penaltyType === "extra_collection"
        ? numericAmount
        : -numericAmount;
      const penaltyDifference = newPenaltyChange - oldPenaltyChange;

      // Update the transaction
      const { error: txError } = await supabase
        .from("driver_penalty_transactions")
        .update({
          amount: numericAmount,
          type: penaltyType,
          description: description || undefined,
          created_at: editDate,
        })
        .eq("id", selectedTransaction.id);

      if (txError) throw txError;

      // Update the user's penalties
      const { error: userError } = await supabase
        .from("users")
        .update({
          total_penalties: Math.max(0, currentPenalties + penaltyDifference),
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
      if (onPenaltyUpdate) onPenaltyUpdate();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPenalties = () => {
    setIsEditingPenalties(true);
    setNewPenalties(currentPenalties.toString());
    setEditPenaltyReason("");
  };

  const handleCancelEditPenalties = () => {
    setIsEditingPenalties(false);
    setNewPenalties(currentPenalties.toString());
    setEditPenaltyReason("");
  };

  const handleSaveNewPenalties = async () => {
    if (!newPenalties || isNaN(parseFloat(newPenalties))) {
      toast.error("Please enter a valid penalty amount");
      return;
    }

    if (!editPenaltyReason.trim()) {
      toast.error("Please provide a reason for the penalty adjustment");
      return;
    }

    try {
      setIsSubmitting(true);

      const oldPenalties = currentPenalties;
      const newPenaltiesValue = parseFloat(newPenalties);
      const penaltyDifference = newPenaltiesValue - oldPenalties;

      // Determine transaction type based on the penalty change
      let adjustmentType: PenaltyType = "penalty";
      if (penaltyDifference < 0) {
        adjustmentType = "penalty_paid";
      } else if (penaltyDifference > 0) {
        adjustmentType = "penalty";
      }

      // Add a transaction record for the manual adjustment
      const { error: txError } = await supabase
        .from("driver_penalty_transactions")
        .insert({
          user_id: driverId,
          amount: Math.abs(penaltyDifference),
          type: adjustmentType,
          description: `Manual penalty adjustment: ${editPenaltyReason}`,
          created_by: user?.id,
        });

      if (txError) throw txError;

      // Update the user's penalties
      const { error: userError } = await supabase
        .from("users")
        .update({
          total_penalties: newPenaltiesValue,
        })
        .eq("id", driverId);

      if (userError) throw userError;

      toast.success("Penalties updated successfully");

      setIsEditingPenalties(false);
      fetchTransactions();
      if (onPenaltyUpdate) onPenaltyUpdate();
    } catch (error) {
      console.error("Error updating penalties:", error);
      toast.error("Failed to update penalties");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionLabel = (type: PenaltyType) => {
    switch (type) {
      case "penalty":
        return "Penalty";
      case "penalty_paid":
        return "Penalty Paid";
      case "bonus":
        return "Bonus";
      case "refund":
        return "Refund";
      case "due":
        return "Due";
      case "extra_collection":
        return "Extra Collection";
      default:
        return type;
    }
  };

  const getTransactionIcon = (type: PenaltyType) => {
    switch (type) {
      case "penalty":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "penalty_paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "bonus":
        return <Gift className="h-4 w-4 text-blue-500" />;
      case "refund":
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "due":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "extra_collection":
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const isPositiveTransaction = (type: PenaltyType) => {
    return ["bonus", "penalty_paid", "refund"].includes(type);
  };

  // Calculate penalty summary from transactions (same logic as profile components)
  const penaltySummary = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { netPenalties: 0, totalRefunds: 0, totalBonuses: 0 };
    }

    let totalPenalties = 0;
    let totalPenaltyPaid = 0;
    let totalRefunds = 0;
    let totalBonuses = 0;

    transactions.forEach((transaction) => {
      const amount = transaction.amount;

      switch (transaction.type) {
        case "penalty":
          totalPenalties += amount;
          break;
        case "penalty_paid":
          totalPenaltyPaid += amount;
          break;
        case "bonus":
          totalBonuses += amount;
          break;
        case "refund":
          totalRefunds += amount;
          break;
        case "due":
          totalPenalties += amount; // Due amounts are treated as penalties
          break;
        case "extra_collection":
          totalPenalties += amount; // Extra collection amounts are treated as penalties
          break;
      }
    });

    // Calculate net amount: if refunds > penalties, show positive refund balance
    // If penalties > refunds, show penalty balance
    const totalCredits = totalPenaltyPaid + totalRefunds + totalBonuses;
    const netAmount = totalCredits - totalPenalties;

    return {
      netPenalties: netAmount, // This will be positive (refund balance) or negative (penalty balance)
      totalRefunds,
      totalBonuses,
      totalPenalties,
      totalPenaltyPaid,
    };
  }, [transactions]);

  const filteredTransactions = transactions;

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex justify-between items-center">
            Penalties & Refunds
            {!isEditingPenalties && (
              <Button variant="outline" size="sm" onClick={handleEditPenalties}>
                <Edit className="h-4 w-4 mr-1" /> Edit Penalties
              </Button>
            )}
          </CardTitle>

          {isEditingPenalties ? (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="new-penalties" className="w-20">
                  New Penalties:
                </Label>
                <Input
                  id="new-penalties"
                  type="number"
                  placeholder="Enter new penalty amount"
                  value={newPenalties}
                  onChange={(e) => setNewPenalties(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex items-start gap-2">
                <Label htmlFor="penalty-reason" className="w-20 pt-2">
                  Reason:
                </Label>
                <Input
                  id="penalty-reason"
                  placeholder="Reason for adjustment"
                  value={editPenaltyReason}
                  onChange={(e) => setEditPenaltyReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditPenalties}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNewPenalties}
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-1" />{" "}
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`mt-1 text-2xl font-bold ${
                  penaltySummary.netPenalties > 0
                    ? "text-green-500" // Positive = refund balance (green)
                    : penaltySummary.netPenalties < 0
                    ? "text-red-500" // Negative = penalty balance (red)
                    : "text-gray-500" // Zero
                }`}
              >
                {penaltySummary.netPenalties < 0
                  ? `-₹${Math.abs(
                      penaltySummary.netPenalties
                    ).toLocaleString()}`
                  : `₹${penaltySummary.netPenalties.toLocaleString()}`}
              </div>
              <div className="text-sm text-muted-foreground">
                {penaltySummary.netPenalties > 0
                  ? `Driver has ₹${penaltySummary.netPenalties.toLocaleString()} in refund balance`
                  : penaltySummary.netPenalties < 0
                  ? `Driver owes ₹${Math.abs(
                      penaltySummary.netPenalties
                    ).toLocaleString()} in penalties`
                  : "No outstanding balance"}
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
                    value={penaltyType}
                    onValueChange={(value) =>
                      setPenaltyType(value as PenaltyType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="penalty">Penalty</SelectItem>
                      <SelectItem value="penalty_paid">Penalty Paid</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                      <SelectItem value="extra_collection">
                        Extra Collection
                      </SelectItem>
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
                    value={penaltyType}
                    onValueChange={(value) =>
                      setPenaltyType(value as PenaltyType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="penalty">Penalty</SelectItem>
                      <SelectItem value="penalty_paid">Penalty Paid</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                      <SelectItem value="extra_collection">
                        Extra Collection
                      </SelectItem>
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
            Penalty Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p>No penalty transactions found</p>
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
                            "bonus",
                            "penalty_paid",
                            "refund",
                          ].includes(transaction.type);
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {transaction.description || "-"}
                              </TableCell>
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
                                <div className="flex items-center gap-2">
                                  {getTransactionIcon(transaction.type)}
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      transaction.type === "penalty"
                                        ? "bg-red-100 text-red-800"
                                        : transaction.type === "penalty_paid"
                                        ? "bg-green-100 text-green-800"
                                        : transaction.type === "refund"
                                        ? "bg-green-100 text-green-800"
                                        : transaction.type === "due"
                                        ? "bg-orange-100 text-orange-800"
                                        : transaction.type ===
                                          "extra_collection"
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {getTransactionLabel(transaction.type)}
                                  </span>
                                </div>
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
                  "bonus",
                  "penalty_paid",
                  "refund",
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
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === "penalty"
                              ? "bg-red-100 text-red-800"
                              : transaction.type === "penalty_paid"
                              ? "bg-green-100 text-green-800"
                              : transaction.type === "refund"
                              ? "bg-green-100 text-green-800"
                              : transaction.type === "due"
                              ? "bg-orange-100 text-orange-800"
                              : transaction.type === "extra_collection"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {getTransactionLabel(transaction.type)}
                        </span>
                      </div>
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
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No penalty transactions found
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
