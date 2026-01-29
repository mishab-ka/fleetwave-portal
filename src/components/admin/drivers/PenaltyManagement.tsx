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
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfWeek, addDays, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  | "extra_collection"
  | "insurance_claim_charge";

interface PenaltyTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: PenaltyType;
  description?: string;
  created_at: string;
  created_by: string;
}

type RefundRequestStatus = "pending" | "approved" | "rejected";

export const PenaltyManagement = ({
  driverId,
  currentPenalties,
  onPenaltyUpdate,
}: PenaltyManagementProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<PenaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [penaltyType, setPenaltyType] = useState<PenaltyType>("penalty");
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PenaltyTransaction | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditingPenalties, setIsEditingPenalties] = useState<boolean>(false);
  const [newPenalties, setNewPenalties] = useState<string>("");
  const [editPenaltyReason, setEditPenaltyReason] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    phone_number: string | null;
  } | null>(null);

  // Refund request (R&F balance payout request)
  const [refundRequestOpen, setRefundRequestOpen] = useState(false);
  const [refundRequestAmount, setRefundRequestAmount] = useState<string>("");
  const [refundRequestNotes, setRefundRequestNotes] = useState<string>("");
  const [refundRequestSubmitting, setRefundRequestSubmitting] = useState(false);
  const [pendingRefundRequest, setPendingRefundRequest] = useState<{
    id: string;
    status: RefundRequestStatus;
    requested_at: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    if (driverId) {
      fetchTransactions();
      fetchDriverInfo();
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

  const fetchDriverInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, driver_id, phone_number")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      setDriverInfo({
        name: data?.name || data?.driver_id || "Driver",
        phone_number: data?.phone_number || null,
      });
    } catch (error) {
      console.error("Error fetching driver info:", error);
    }
  };

  // Get week date range for a given date (Monday to Sunday)
  // Ensures the date is parsed correctly to avoid timezone issues
  const getWeekRange = (dateInput: Date | string) => {
    let date: Date;
    if (typeof dateInput === "string") {
      // Parse date string as local date (YYYY-MM-DD format)
      const [year, month, day] = dateInput.split("-").map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = dateInput;
    }

    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday = 1
    const weekEnd = addDays(weekStart, 6); // Sunday

    // Format as YYYY-MM-DD to ensure consistent date comparison
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd),
    };
  };

  // Get current week date range (Monday to Sunday)
  const getCurrentWeekRange = () => {
    return getWeekRange(new Date());
  };

  // Distribute penalty to vehicles the driver ran in a specific week
  const distributePenaltyToVehicles = async (
    penaltyAmount: number,
    penaltyDescription: string,
    transactionDate?: string,
    penaltyTransactionId?: string
  ) => {
    try {
      // Use transaction date if provided, otherwise use current date
      // Pass the date string directly to avoid timezone issues
      const dateForWeek =
        transactionDate || new Date().toISOString().split("T")[0];
      const weekRange = getWeekRange(dateForWeek);

      // Get all fleet reports for this driver in the week of the selected date
      // Only count APPROVED reports - each approved report = 1 working day
      const { data: reports, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("vehicle_number, rent_date, status, id")
        .eq("user_id", driverId)
        .gte("rent_date", weekRange.startDate)
        .lte("rent_date", weekRange.endDate)
        .eq("status", "approved");

      if (reportsError) {
        console.error("Error fetching fleet reports:", reportsError);
        throw reportsError;
      }

      console.log(`Week range: ${weekRange.startDate} to ${weekRange.endDate}`);
      console.log(`Total reports fetched: ${reports?.length || 0}`);
      console.log(
        "All reports:",
        reports?.map((r) => ({
          vehicle: r.vehicle_number,
          date: r.rent_date,
          status: r.status,
          id: r.id,
        }))
      );

      if (!reports || reports.length === 0) {
        console.log(
          `No approved reports found for this driver in the week of ${
            transactionDate || "selected date"
          }`
        );
        toast.info(
          `No vehicles found for the driver in the week of ${
            transactionDate || "selected date"
          }. Penalty not distributed to vehicles.`
        );
        return; // No vehicles to distribute to
      }

      // Count days (approved reports) per vehicle
      // Each approved report represents 1 day the vehicle was run
      // IMPORTANT: We're counting ALL approved reports, not unique dates
      const vehicleDaysMap = new Map<string, number>();

      console.log(
        `Processing ${reports.length} approved reports for penalty distribution`
      );

      reports.forEach((report) => {
        const vehicleNumber = report.vehicle_number;
        const rentDate = report.rent_date;

        // Double-check: Only count reports within the week range
        // This ensures we don't count reports from outside the selected week
        if (
          vehicleNumber &&
          vehicleNumber.trim() !== "" &&
          rentDate >= weekRange.startDate &&
          rentDate <= weekRange.endDate
        ) {
          const currentDays = vehicleDaysMap.get(vehicleNumber) || 0;
          vehicleDaysMap.set(vehicleNumber, currentDays + 1);
          console.log(
            `Report ${
              report.id
            }: Vehicle ${vehicleNumber} - Date: ${rentDate}, Status: ${
              report.status
            }, Count: ${currentDays + 1}`
          );
        } else {
          console.log(
            `Skipping report ${report.id}: Vehicle ${vehicleNumber} - Date: ${rentDate} (outside week range ${weekRange.startDate} to ${weekRange.endDate})`
          );
        }
      });

      // Log the days count per vehicle
      console.log(
        "Vehicle days distribution:",
        Array.from(vehicleDaysMap.entries())
          .map(([v, d]) => `${v}: ${d} days`)
          .join(", ")
      );

      if (vehicleDaysMap.size === 0) {
        console.log(
          `No vehicles found for this driver in the week of ${
            transactionDate || "selected date"
          }`
        );
        toast.info(
          `No vehicles found for the driver in the week of ${
            transactionDate || "selected date"
          }. Penalty not distributed to vehicles.`
        );
        return;
      }

      // Calculate total days across all vehicles (sum of all approved reports)
      const totalDays = Array.from(vehicleDaysMap.values()).reduce(
        (sum, days) => sum + days,
        0
      );

      console.log(`Total approved reports (days): ${totalDays}`);
      console.log(`Penalty amount to distribute: ₹${penaltyAmount}`);

      if (totalDays === 0) {
        console.log("Total days is 0, cannot distribute penalty");
        return;
      }

      // Get driver name for description
      const { data: driverData } = await supabase
        .from("users")
        .select("name, driver_id")
        .eq("id", driverId)
        .single();

      const driverName = driverData?.name || driverData?.driver_id || "Driver";

      // Create vehicle transactions for each vehicle
      // Distribute penalty proportionally based on days each vehicle was run
      // Include penalty transaction ID in description for accurate matching
      const penaltyTxId = penaltyTransactionId || `TEMP_${Date.now()}`;
      const transactionsToInsert = Array.from(vehicleDaysMap.entries()).map(
        ([vehicleNumber, days]) => {
          // Calculate proportional amount: (days / totalDays) * penaltyAmount
          const proportionalAmount = (days / totalDays) * penaltyAmount;
          const roundedAmount = Math.round(proportionalAmount * 100) / 100; // Round to 2 decimal places

          console.log(
            `Vehicle ${vehicleNumber}: ${days} days / ${totalDays} total days = ${(
              (days / totalDays) *
              100
            ).toFixed(2)}% → ₹${roundedAmount}`
          );

          return {
            vehicle_number: vehicleNumber,
            transaction_type: "income",
            amount: roundedAmount,
            description: `Driver Penalty: ${driverName} - ${
              penaltyDescription || "Penalty"
            } (${days} day${
              days > 1 ? "s" : ""
            }) [PENALTY_TX_ID:${penaltyTxId}]`,
            // Use week start date (Monday) so all transactions for the week have the same date
            // This ensures they appear in the correct week in VehiclePerformance
            transaction_date: weekRange.startDate,
            created_by: user?.id,
          };
        }
      );

      const { error: vehicleTxError } = await supabase
        .from("vehicle_transactions")
        .insert(transactionsToInsert);

      if (vehicleTxError) {
        console.error("Error creating vehicle transactions:", vehicleTxError);
        throw vehicleTxError;
      }

      // Create summary message showing distribution
      const distributionSummary = transactionsToInsert
        .map(
          (tx) =>
            `${tx.vehicle_number}: ₹${tx.amount} (${
              tx.description.match(/\((\d+) day/)?.[1] || "0"
            } day${
              tx.description.match(/\((\d+) day/)?.[1] === "1" ? "" : "s"
            })`
        )
        .join(", ");

      console.log(
        `Penalty ₹${penaltyAmount} distributed proportionally across ${vehicleDaysMap.size} vehicles (${totalDays} total days): ${distributionSummary}`
      );

      toast.success(
        `Penalty ₹${penaltyAmount} distributed to ${vehicleDaysMap.size} vehicle(s) based on ${totalDays} working days`
      );
    } catch (error) {
      console.error("Error distributing penalty to vehicles:", error);
      // Don't throw error - penalty was already added, just log the distribution failure
      toast.error("Penalty added but failed to distribute to vehicles");
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
          penaltyType === "extra_collection" ||
          penaltyType === "insurance_claim_charge"
        ? numericAmount
        : -numericAmount;

      // Insert penalty transaction and get the ID
      // Use the selected transaction date for created_at
      const transactionDateTime = transactionDate
        ? new Date(transactionDate + "T00:00:00")
        : new Date();

      const { data: insertedTx, error: txError } = await supabase
        .from("driver_penalty_transactions")
        .insert({
          user_id: driverId,
          amount: numericAmount,
          type: penaltyType,
          description: description || undefined,
          created_by: user?.id,
          created_at: transactionDateTime.toISOString(),
        })
        .select("id")
        .single();

      if (txError) throw txError;

      if (!insertedTx || !insertedTx.id) {
        throw new Error("Failed to get penalty transaction ID");
      }

      // Update driver's total penalties
      const { error: userError } = await supabase
        .from("users")
        .update({
          total_penalties: Math.max(0, currentPenalties + penaltyChange),
        })
        .eq("id", driverId);

      if (userError) throw userError;

      // If this is a penalty type, distribute to vehicles as income
      // Only for "penalty" type, not for insurance_claim_charge
      if (penaltyType === "penalty") {
        await distributePenaltyToVehicles(
          numericAmount,
          description || penaltyType,
          transactionDate,
          insertedTx.id
        );
      }

      toast.success("Penalty transaction added successfully");

      setAmount("");
      setDescription("");
      setTransactionDate(new Date().toISOString().split("T")[0]);
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

  // Remove vehicle transactions for a deleted penalty
  const removePenaltyFromVehicles = async (
    penaltyAmount: number,
    penaltyDescription: string,
    transactionDate?: string,
    penaltyTransactionId?: string
  ) => {
    try {
      // Use transaction date if provided, otherwise use current date
      // Pass the date string directly to avoid timezone issues
      const dateForWeek =
        transactionDate || new Date().toISOString().split("T")[0];
      const weekRange = getWeekRange(dateForWeek);

      // Get driver name for matching
      const { data: driverData } = await supabase
        .from("users")
        .select("name, driver_id")
        .eq("id", driverId)
        .single();

      const driverName = driverData?.name || driverData?.driver_id || "Driver";

      // Get all fleet reports for this driver in the week
      const { data: reports } = await supabase
        .from("fleet_reports")
        .select("vehicle_number")
        .eq("user_id", driverId)
        .gte("rent_date", weekRange.startDate)
        .lte("rent_date", weekRange.endDate)
        .eq("status", "approved");

      if (!reports || reports.length === 0) return;

      // Count days per vehicle (same logic as distribution)
      const vehicleDaysMap = new Map<string, number>();
      reports.forEach((report) => {
        const vehicleNumber = report.vehicle_number;
        if (vehicleNumber && vehicleNumber.trim() !== "") {
          const currentDays = vehicleDaysMap.get(vehicleNumber) || 0;
          vehicleDaysMap.set(vehicleNumber, currentDays + 1);
        }
      });

      if (vehicleDaysMap.size === 0) return;

      // Find and delete vehicle transactions that match this penalty
      // Use penalty transaction ID for exact matching (amounts will vary per vehicle)
      const vehicleNumbers = Array.from(vehicleDaysMap.keys());

      for (const vehicleNumber of vehicleNumbers) {
        let vehicleTransactions;

        if (penaltyTransactionId) {
          // Exact match using penalty transaction ID (this is the primary method)
          const { data } = await supabase
            .from("vehicle_transactions")
            .select("id, amount, description")
            .eq("vehicle_number", vehicleNumber)
            .eq("transaction_type", "income")
            .like("description", `%[PENALTY_TX_ID:${penaltyTransactionId}]%`);

          vehicleTransactions = data;
        } else {
          // Fallback: match by description pattern and date range
          // Note: We can't match by exact amount since amounts vary per vehicle
          const { data } = await supabase
            .from("vehicle_transactions")
            .select("id, amount, description")
            .eq("vehicle_number", vehicleNumber)
            .eq("transaction_type", "income")
            .gte("transaction_date", weekRange.startDate)
            .lte("transaction_date", weekRange.endDate)
            .like("description", `%Driver Penalty: ${driverName}%`);

          vehicleTransactions = data;
        }

        if (vehicleTransactions && vehicleTransactions.length > 0) {
          // Delete all matching transactions
          const idsToDelete = vehicleTransactions.map((tx) => tx.id);
          await supabase
            .from("vehicle_transactions")
            .delete()
            .in("id", idsToDelete);
        }
      }

      console.log(
        `Removed penalty distribution from ${vehicleNumbers.length} vehicles`
      );
    } catch (error) {
      console.error("Error removing penalty from vehicles:", error);
      // Don't throw - penalty deletion should still succeed
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
          transactionData.type === "extra_collection" ||
          transactionData.type === "insurance_claim_charge"
        ? -transactionData.amount
        : transactionData.amount;

      // If this is a penalty type, remove from vehicles
      // Only for "penalty" type that was distributed to vehicles
      if (transactionData.type === "penalty") {
        await removePenaltyFromVehicles(
          transactionData.amount,
          transactionData.description || transactionData.type,
          transactionData.created_at.split("T")[0],
          transactionId // Pass the penalty transaction ID for exact matching
        );
      }

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
          selectedTransaction.type === "extra_collection" ||
          selectedTransaction.type === "insurance_claim_charge"
        ? oldAmount
        : -oldAmount;
      const newPenaltyChange = isPositive
        ? 0
        : penaltyType === "penalty" ||
          penaltyType === "due" ||
          penaltyType === "extra_collection" ||
          penaltyType === "insurance_claim_charge"
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

      // Handle vehicle transaction updates for penalties
      // Only handle "penalty" type for vehicle transactions
      const wasPenaltyType = selectedTransaction.type === "penalty";
      const isPenaltyType = penaltyType === "penalty";

      // If old transaction was a penalty type, remove old vehicle transactions
      if (wasPenaltyType) {
        await removePenaltyFromVehicles(
          oldAmount,
          selectedTransaction.description || selectedTransaction.type,
          selectedTransaction.created_at.split("T")[0],
          selectedTransaction.id // Use penalty transaction ID for exact matching
        );
      }

      // If new transaction is a penalty type, add new vehicle transactions
      if (isPenaltyType) {
        await distributePenaltyToVehicles(
          numericAmount,
          description || penaltyType,
          editDate,
          selectedTransaction.id // Use the same transaction ID since we're updating
        );
      }

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
        return "Pending Paid";
      case "bonus":
        return "Bonus";
      case "refund":
        return "Refund";
      case "due":
        return "Due";
      case "extra_collection":
        return "Extra Collection";
      case "insurance_claim_charge":
        return "Insurance Claim Charge";
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
      case "insurance_claim_charge":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
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
        case "insurance_claim_charge":
          totalPenalties += amount; // Insurance claim charges are treated as penalties
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

  const fetchPendingRefundRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("driver_refund_requests")
        .select("id, status, requested_at, amount")
        .eq("driver_id", driverId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      setPendingRefundRequest(data && data.length > 0 ? (data[0] as any) : null);
    } catch (e) {
      // If the table/policy isn't present in an environment yet, don't break the UI
      console.warn("Unable to load pending refund request:", e);
      setPendingRefundRequest(null);
    }
  };

  useEffect(() => {
    if (!driverId) return;
    fetchPendingRefundRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const filteredTransactions = transactions;

  // Handle WhatsApp share for refund
  const handleWhatsAppShare = () => {
    if (!driverInfo?.phone_number) {
      toast.error("Phone number not available for this driver");
      return;
    }

    if (penaltySummary.netPenalties <= 0) {
      toast.error("No refund amount to share");
      return;
    }

    // Get current week range for the message
    const currentDate = new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekRange = `${format(weekStart, "dd MMM")} - ${format(
      weekEnd,
      "dd MMM yyyy"
    )}`;
    const currentDateFormatted = format(currentDate, "dd MMM yyyy");

    // Format phone number for WhatsApp
    let formattedPhone = driverInfo.phone_number.replace(/\D/g, "");
    if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    // Create WhatsApp message
    const message = `💰 *Refund Details*

*Driver Name:* ${driverInfo.name}
*Week:* ${weekRange}
*Refund Amount:* ₹${penaltySummary.netPenalties.toLocaleString()}
*Date:* ${currentDateFormatted}

Your refund has been processed and credited to your account. Thank you for your service!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const openRefundRequest = () => {
    if (penaltySummary.netPenalties <= 0) return;
    setRefundRequestAmount(String(Math.floor(penaltySummary.netPenalties)));
    setRefundRequestNotes("");
    setRefundRequestOpen(true);
  };

  const submitRefundRequest = async () => {
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }
    const amountNum = Number(refundRequestAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amountNum > penaltySummary.netPenalties) {
      toast.error("Amount cannot exceed the current refund balance");
      return;
    }
    if (pendingRefundRequest) {
      toast.error("A refund request is already pending for this driver");
      return;
    }

    try {
      setRefundRequestSubmitting(true);
      const { error } = await supabase.from("driver_refund_requests").insert({
        driver_id: driverId,
        amount: amountNum,
        status: "pending",
        requested_by: user.id,
        notes: refundRequestNotes.trim() || null,
      });

      if (error) throw error;
      toast.success("Refund request submitted");
      setRefundRequestOpen(false);
      await fetchPendingRefundRequest();
    } catch (e) {
      console.error("Error submitting refund request:", e);
      toast.error("Failed to submit refund request");
    } finally {
      setRefundRequestSubmitting(false);
    }
  };

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
              {penaltySummary.netPenalties > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2 items-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openRefundRequest}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                      disabled={!!pendingRefundRequest}
                      title={
                        pendingRefundRequest
                          ? "A pending refund request already exists"
                          : ""
                      }
                    >
                      Request Refund
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWhatsAppShare}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      disabled={!driverInfo?.phone_number}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Refund via WhatsApp
                    </Button>
                  </div>

                  {pendingRefundRequest && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Refund request pending: ₹
                      {Number(pendingRefundRequest.amount).toLocaleString(
                        "en-IN"
                      )}{" "}
                      ({format(
                        new Date(pendingRefundRequest.requested_at),
                        "dd MMM yyyy"
                      )})
                    </p>
                  )}
                  {!driverInfo?.phone_number && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Phone number not available
                    </p>
                  )}
                </div>
              )}
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
                      <SelectItem value="penalty_paid">Pending Paid</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                      <SelectItem value="extra_collection">
                        Extra Collection
                      </SelectItem>
                      <SelectItem value="insurance_claim_charge">
                        Insurance Claim Charge
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-date">Transaction Date</Label>
                  <Input
                    id="transaction-date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setAmount("");
                    setDescription("");
                    setTransactionDate(new Date().toISOString().split("T")[0]);
                  }}
                >
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
                      <SelectItem value="insurance_claim_charge">
                        Insurance Claim Charge
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
                                        : transaction.type ===
                                          "insurance_claim_charge"
                                        ? "bg-red-200 text-red-900"
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
                              : transaction.type === "insurance_claim_charge"
                              ? "bg-red-200 text-red-900"
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
                <div className="text-center py-8 text-gray-500">
                  No penalty transactions found
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Dialog open={refundRequestOpen} onOpenChange={setRefundRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Refund (R&F)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="text-muted-foreground">Available refund balance</div>
              <div className="text-lg font-semibold text-green-700">
                ₹{Number(penaltySummary.netPenalties).toLocaleString("en-IN")}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-request-amount">Amount</Label>
              <Input
                id="refund-request-amount"
                type="number"
                min={1}
                value={refundRequestAmount}
                onChange={(e) => setRefundRequestAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-xs text-muted-foreground">
                Amount must be ≤ current refund balance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-request-notes">Notes (optional)</Label>
              <Textarea
                id="refund-request-notes"
                value={refundRequestNotes}
                onChange={(e) => setRefundRequestNotes(e.target.value)}
                rows={3}
                placeholder="Any details for the finance/admin team..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRefundRequestOpen(false)}
                disabled={refundRequestSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={submitRefundRequest} disabled={refundRequestSubmitting}>
                {refundRequestSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
