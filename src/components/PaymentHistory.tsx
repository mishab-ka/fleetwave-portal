import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subWeeks,
  addWeeks,
} from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  Calendar,
  ArrowDown,
  ArrowUp,
  FilterIcon,
  Wallet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RentStatusBadge } from "@/components/RentStatusBadge";
import { formatter } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PaymentHistory = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rent");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [penaltyFilter, setPenaltyFilter] = useState("all"); // "all", "thisWeek", "lastWeek", "custom"
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user) return;
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        setProfileData(data);
        // Initialize edit form with current data
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Fetch rent history
  const { data: rentHistory, isLoading: isLoadingRent } = useQuery({
    queryKey: ["fleet_reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("*")
        .eq("user_id", user?.id)
        .order("rent_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch balance transactions
  const { data: balanceTransactions, isLoading: isLoadingTransactions } =
    useQuery({
      queryKey: ["balanceTransactions", user?.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("driver_balance_transactions")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      },
      enabled: !!user?.id,
    });

  // Fetch user data to get the pending balance
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["userData", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("pending_balance")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch penalty transactions
  const { data: penaltyTransactions, isLoading: isLoadingPenalties } = useQuery(
    {
      queryKey: ["penaltyTransactions", user?.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("driver_penalty_transactions")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      },
      enabled: !!user?.id,
    }
  );

  const isLoading =
    isLoadingRent ||
    isLoadingTransactions ||
    isLoadingUser ||
    isLoadingPenalties;

  // Helper function to get transaction label
  const getTransactionLabel = (type) => {
    switch (type) {
      case "Penalty paid":
        return "Penalty paid";
      case "Penalty":
        return "Penalty";
      case "Bonus":
        return "Bonus ";
      default:
        return type;
    }
  };

  // Helper to determine if a transaction is positive or negative
  const isPositiveTransaction = (type) => {
    return ["deposit", "refund", "bonus"].includes(type);
  };

  // Helper function to get penalty transaction label
  const getPenaltyTransactionLabel = (type) => {
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
        return "Due Amount";
      case "extra_collection":
        return "Extra Collection";
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to determine if a penalty transaction is positive or negative
  const isPositivePenaltyTransaction = (type) => {
    return ["bonus", "penalty_paid", "refund"].includes(type);
  };

  // Filter penalty transactions based on selected filter
  const filteredPenaltyTransactions = useMemo(() => {
    if (!penaltyTransactions) return [];

    if (penaltyFilter === "all") {
      return penaltyTransactions;
    }

    const now = new Date();
    let startDate, endDate;

    switch (penaltyFilter) {
      case "thisWeek":
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
        break;
      case "lastWeek":
        const lastWeek = subWeeks(now, 1);
        startDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case "custom":
        startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
        endDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
        break;
      default:
        return penaltyTransactions;
    }

    return penaltyTransactions.filter((transaction) => {
      const transactionDate = new Date(transaction.created_at);
      return isWithinInterval(transactionDate, {
        start: startDate,
        end: endDate,
      });
    });
  }, [penaltyTransactions, penaltyFilter, currentWeek]);

  // Calculate weekly summary
  const weeklySummary = useMemo(() => {
    const summary = {
      penalties: 0,
      penaltyPaid: 0,
      bonuses: 0,
      refunds: 0,
      totalDeducted: 0,
      totalAdded: 0,
    };

    filteredPenaltyTransactions.forEach((transaction) => {
      const amount = transaction.amount;

      switch (transaction.type) {
        case "penalty":
          summary.penalties += amount;
          summary.totalDeducted += amount;
          break;
        case "penalty_paid":
          summary.penaltyPaid += amount;
          summary.totalAdded += amount;
          break;
        case "bonus":
          summary.bonuses += amount;
          summary.totalAdded += amount;
          break;
        case "refund":
          summary.refunds += amount;
          summary.totalAdded += amount;
          break;
        case "due":
          summary.penalties += amount; // Due amounts are treated as penalties
          summary.totalDeducted += amount;
          break;
        case "extra_collection":
          summary.penalties += amount; // Extra collection amounts are treated as penalties
          summary.totalDeducted += amount;
          break;
      }
    });

    return summary;
  }, [filteredPenaltyTransactions]);

  // Calculate total penalty summary from all transactions
  const totalPenaltySummary = useMemo(() => {
    if (!penaltyTransactions)
      return { netPenalties: 0, totalRefunds: 0, totalBonuses: 0 };

    let totalPenalties = 0;
    let totalPenaltyPaid = 0;
    let totalRefunds = 0;
    let totalBonuses = 0;

    penaltyTransactions.forEach((transaction) => {
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

    const summary = {
      netPenalties: netAmount, // This will be positive (refund balance) or negative (penalty balance)
      totalRefunds,
      totalBonuses,
      totalPenalties,
      totalPenaltyPaid,
    };

    return summary;
  }, [penaltyTransactions]);

  // Helper functions for week navigation
  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple" />
      </div>
    );
  }

  const pendingBalance = userData?.pending_balance || 0;
  const isPendingBalancePositive = pendingBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Pending Balance Card */}
      {/* {profileData && (
        <Card>
          <CardHeader className="pb-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <Wallet className="h-4 w-4" />
                Deposit Balance
              </div>
              <p
                className={`text-lg font-semibold ${
                  (profileData?.pending_balance || 0) < 0
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              >
                {formatCurrency(profileData?.pending_balance || 0)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                <AlertTriangle className="h-4 w-4" />
                Penalties & Refunds
              </div>
              <p
                className={`text-lg font-semibold ${
                  totalPenaltySummary.netPenalties > 0
                    ? "text-green-500" // Positive = refund balance (green)
                    : totalPenaltySummary.netPenalties < 0
                    ? "text-red-500" // Negative = penalty balance (red)
                    : "text-gray-500" // Zero
                }`}
              >
                {totalPenaltySummary.netPenalties < 0
                  ? `-${formatCurrency(
                      Math.abs(totalPenaltySummary.netPenalties)
                    )}`
                  : formatCurrency(totalPenaltySummary.netPenalties)}
              </p>
            </div>
          </CardHeader>
        </Card>
      )} */}

      {/* Tabs for different history types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="rent"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="rent">Rent History</TabsTrigger>
              <TabsTrigger value="penalties">R & F</TabsTrigger>
              <TabsTrigger value="transactions">Deposite</TabsTrigger>
            </TabsList>

            {/* Rent History Tab */}
            <TabsContent value="rent">
              <div className="rounded-md border">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Platform Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentHistory?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {format(new Date(record.rent_date), "dd MMM yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {record.shift}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "approved"
                                ? "success"
                                : record.status === "leave"
                                ? "default"
                                : record.status === "pending_verification"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap ${
                            record.rent_paid_amount < 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          ₹
                          {(record.rent_paid_amount > 0
                            ? -record.rent_paid_amount
                            : Math.abs(record.rent_paid_amount)
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-blue-600">
                          ₹{(record.platform_fee || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!rentHistory || rentHistory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No rent history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Balance Transactions Tab */}
            <TabsContent value="transactions">
              <div className="space-y-4">
                {balanceTransactions?.map((transaction) => {
                  const isPositive = isPositiveTransaction(transaction.type);
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-start p-3 border rounded-md"
                    >
                      <div
                        className={`p-2 rounded-full mr-3 ${
                          isPositive ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="font-medium">
                            {getTransactionLabel(transaction.type)}
                          </div>
                          <div
                            className={`font-bold ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? "+" : "-"}₹
                            {transaction.amount.toLocaleString()}
                          </div>
                        </div>

                        {transaction.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transaction.description}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(transaction.created_at), "PPp")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!balanceTransactions || balanceTransactions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No balance transactions found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Penalty History Tab */}
            <TabsContent value="penalties">
              <div className="space-y-4">
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4 text-gray-500" />
                    <Select
                      value={penaltyFilter}
                      onValueChange={setPenaltyFilter}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="lastWeek">Last Week</SelectItem>
                        <SelectItem value="custom">Custom Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {penaltyFilter === "custom" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousWeek}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToCurrentWeek}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextWeek}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600 min-w-[120px]">
                        {format(
                          startOfWeek(currentWeek, { weekStartsOn: 1 }),
                          "MMM dd"
                        )}{" "}
                        -{" "}
                        {format(
                          endOfWeek(currentWeek, { weekStartsOn: 1 }),
                          "MMM dd, yyyy"
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Weekly Summary */}
                {penaltyFilter !== "all" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {penaltyFilter === "thisWeek" && "This Week Summary"}
                        {penaltyFilter === "lastWeek" && "Last Week Summary"}
                        {penaltyFilter === "custom" && "Week Summary"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            Penalties
                          </div>
                          <div className="text-sm font-semibold text-red-600">
                            ₹{weeklySummary.penalties.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            Penalty Paid
                          </div>
                          <div className="text-sm font-semibold text-green-600">
                            ₹{weeklySummary.penaltyPaid.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            Bonuses
                          </div>
                          <div className="text-sm font-semibold text-blue-600">
                            ₹{weeklySummary.bonuses.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            Refunds
                          </div>
                          <div className="text-sm font-semibold text-green-600">
                            ₹{weeklySummary.refunds.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            Net Change:
                          </div>
                          <div
                            className={`text-sm font-semibold ${
                              weeklySummary.totalAdded -
                                weeklySummary.totalDeducted >=
                              0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {weeklySummary.totalAdded -
                              weeklySummary.totalDeducted >=
                            0
                              ? "+"
                              : ""}
                            ₹
                            {(
                              weeklySummary.totalAdded -
                              weeklySummary.totalDeducted
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Transactions List */}
                <div className="space-y-3">
                  {filteredPenaltyTransactions?.map((transaction) => {
                    const isPositive = isPositivePenaltyTransaction(
                      transaction.type
                    );
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-start p-3 border rounded-md"
                      >
                        <div
                          className={`p-2 rounded-full mr-3 ${
                            isPositive ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div className="font-medium">
                              {getPenaltyTransactionLabel(transaction.type)}
                            </div>
                            <div
                              className={`font-bold ${
                                isPositive ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isPositive ? "+" : "-"}₹
                              {transaction.amount.toLocaleString()}
                            </div>
                          </div>

                          {transaction.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {transaction.description}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(transaction.created_at), "PPp")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {(!filteredPenaltyTransactions ||
                    filteredPenaltyTransactions.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>
                        {penaltyFilter === "all"
                          ? "No penalty transactions found"
                          : "No transactions found for the selected period"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
