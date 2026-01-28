import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VehicleTransaction {
  id: string;
  vehicle_number: string;
  transaction_type: "income" | "expense";
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
}

export const useVehicleTransactions = () => {
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Get transactions for a specific vehicle and date range
  const getVehicleTransactions = async (
    vehicleNumber: string,
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      let query = supabase
        .from("vehicle_transactions")
        .select("*")
        .eq("vehicle_number", vehicleNumber)
        .order("transaction_date", { ascending: false });

      if (startDate) {
        query = query.gte("transaction_date", startDate);
      }
      if (endDate) {
        query = query.lte("transaction_date", endDate);
      }

      console.log("Query params:", { vehicleNumber, startDate, endDate });
      const { data, error } = await query;

      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      console.log("Raw transaction data from DB:", data);
      console.log("Number of transactions found:", data?.length || 0);
      
      setTransactions(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching vehicle transactions:", error);
      toast.error("Failed to load transaction history");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add a new transaction
  const addTransaction = async (
    transaction: Omit<VehicleTransaction, "id" | "created_at" | "updated_at">
  ) => {
    try {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;

      setTransactions((prev) => [data, ...prev]);
      toast.success(`${transaction.transaction_type} added successfully`);
      return data;
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
      throw error;
    }
  };

  // Update an existing transaction
  const updateTransaction = async (
    id: string,
    updates: Partial<VehicleTransaction>
  ) => {
    try {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((transaction) => (transaction.id === id ? data : transaction))
      );
      toast.success("Transaction updated successfully");
      return data;
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
      throw error;
    }
  };

  // Delete a transaction
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vehicle_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTransactions((prev) =>
        prev.filter((transaction) => transaction.id !== id)
      );
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
      throw error;
    }
  };

  // Get transaction summary for a vehicle in a date range
  const getTransactionSummary = async (
    vehicleNumber: string,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSummary> => {
    try {
      let query = supabase
        .from("vehicle_transactions")
        .select("transaction_type, amount")
        .eq("vehicle_number", vehicleNumber);

      if (startDate) {
        query = query.gte("transaction_date", startDate);
      }
      if (endDate) {
        query = query.lte("transaction_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = (data || []).reduce(
        (acc, transaction) => {
          if (transaction.transaction_type === "income") {
            acc.totalIncome += Number(transaction.amount);
          } else {
            acc.totalExpense += Number(transaction.amount);
          }
          acc.transactionCount++;
          return acc;
        },
        { totalIncome: 0, totalExpense: 0, netAmount: 0, transactionCount: 0 }
      );

      summary.netAmount = summary.totalIncome - summary.totalExpense;
      return summary;
    } catch (error) {
      console.error("Error getting transaction summary:", error);
      return {
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        transactionCount: 0,
      };
    }
  };

  // Get transactions for multiple vehicles (for filtering)
  const getTransactionsForDateRange = async (
    startDate: string,
    endDate: string,
    vehicleNumbers?: string[]
  ) => {
    try {
      let query = supabase
        .from("vehicle_transactions")
        .select("*")
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false });

      if (vehicleNumbers && vehicleNumbers.length > 0) {
        query = query.in("vehicle_number", vehicleNumbers);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching transactions for date range:", error);
      return [];
    }
  };

  return {
    transactions,
    loading,
    getVehicleTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionSummary,
    getTransactionsForDateRange,
  };
};
