import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import {
  useVehicleTransactions,
  VehicleTransaction,
  TransactionSummary,
} from "@/hooks/useVehicleTransactions";
import { toast } from "sonner";

interface VehicleTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleNumber: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

const VehicleTransactionHistory: React.FC<VehicleTransactionHistoryProps> = ({
  open,
  onOpenChange,
  vehicleNumber,
  dateRange,
}) => {
  const {
    transactions,
    loading,
    getVehicleTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionSummary,
  } = useVehicleTransactions();

  const [summary, setSummary] = useState<TransactionSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0,
    transactionCount: 0,
  });

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<VehicleTransaction | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    transaction_type: "income" as "income" | "expense",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });

  // Load transactions when dialog opens or date range changes
  useEffect(() => {
    if (open && vehicleNumber) {
      loadTransactions();
    }
  }, [open, vehicleNumber, dateRange]);

  const loadTransactions = async () => {
    await getVehicleTransactions(
      vehicleNumber,
      dateRange?.startDate,
      dateRange?.endDate
    );

    const summaryData = await getTransactionSummary(
      vehicleNumber,
      dateRange?.startDate,
      dateRange?.endDate
    );
    setSummary(summaryData);
  };

  const resetForm = () => {
    setFormData({
      transaction_type: "income",
      amount: "",
      description: "",
      transaction_date: new Date().toISOString().split("T")[0],
    });
    setIsAddingTransaction(false);
    setEditingTransaction(null);
  };

  const handleAddTransaction = async () => {
    if (!formData.amount || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await addTransaction({
        vehicle_number: vehicleNumber,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
      });

      resetForm();
      loadTransactions(); // Reload to update summary
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction || !formData.amount || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateTransaction(editingTransaction.id, {
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
      });

      resetForm();
      loadTransactions(); // Reload to update summary
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(id);
        loadTransactions(); // Reload to update summary
      } catch (error) {
        console.error("Error deleting transaction:", error);
      }
    }
  };

  const startEdit = (transaction: VehicleTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      transaction_type: transaction.transaction_type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      transaction_date: transaction.transaction_date,
    });
    setIsAddingTransaction(true);
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction History - {vehicleNumber}</DialogTitle>
          <DialogDescription>
            Detailed income and expense history for this vehicle
            {dateRange && (
              <span className="block mt-1 text-sm">
                Period: {format(new Date(dateRange.startDate), "MMM dd, yyyy")}{" "}
                - {format(new Date(dateRange.endDate), "MMM dd, yyyy")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalIncome)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expense
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpense)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  summary.netAmount >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.netAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Transactions
              </CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {summary.transactionCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Transaction Form */}
        {isAddingTransaction && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingTransaction
                  ? "Edit Transaction"
                  : "Add New Transaction"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transaction_type">Type</Label>
                  <select
                    id="transaction_type"
                    value={formData.transaction_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_type: e.target.value as
                          | "income"
                          | "expense",
                      })
                    }
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="transaction_date">Date</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transaction_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter transaction description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={
                    editingTransaction
                      ? handleEditTransaction
                      : handleAddTransaction
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingTransaction ? "Update" : "Add"} Transaction
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Transaction Button */}
        {!isAddingTransaction && (
          <div className="mb-4">
            <Button
              onClick={() => setIsAddingTransaction(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        )}

        {/* Transactions Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-gray-500"
                  >
                    No transactions found for this period
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(
                        new Date(transaction.transaction_date),
                        "MMM dd, yyyy"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          transaction.transaction_type === "income"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {transaction.transaction_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`font-semibold ${
                        transaction.transaction_type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <div
                        className="max-w-xs truncate"
                        title={transaction.description}
                      >
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(transaction)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleDeleteTransaction(transaction.id)
                          }
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleTransactionHistory;
