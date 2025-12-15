import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CalendarIcon,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  CreditCard,
  Calculator,
  BarChart3,
  PieChart,
} from "lucide-react";
import { formatter } from "@/lib/utils";

interface AccountBalance {
  id: string;
  account_code: string;
  name: string;
  type: string;
  normal_balance: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

interface TrialBalanceData {
  accounts: AccountBalance[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
}

interface PnLData {
  revenue: number;
  expenses: number;
  net_profit: number;
  revenue_accounts: AccountBalance[];
  expense_accounts: AccountBalance[];
}

interface BalanceSheetData {
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
}

interface FinancialReportsSectionProps {
  refreshTrigger?: number;
}

const FinancialReportsSection = ({
  refreshTrigger,
}: FinancialReportsSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("trial-balance");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [trialBalanceData, setTrialBalanceData] =
    useState<TrialBalanceData | null>(null);
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [balanceSheetData, setBalanceSheetData] =
    useState<BalanceSheetData | null>(null);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);

      const { data: journalLines, error } = await supabase
        .from("journal_lines")
        .select(
          `
          account_id,
          debit,
          credit,
          journal_entries!inner(date, status)
        `
        )
        .gte("journal_entries.date", startDate.toISOString().split("T")[0])
        .lte("journal_entries.date", endDate.toISOString().split("T")[0])
        .eq("journal_entries.status", "posted");

      if (error) throw error;

      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_code");

      if (accountsError) throw accountsError;

      // Calculate balances for each account
      const accountBalances: AccountBalance[] = accounts.map((account) => {
        const accountLines =
          journalLines?.filter((line) => line.account_id === account.id) || [];
        const debitTotal = accountLines.reduce(
          (sum, line) => sum + (line.debit || 0),
          0
        );
        const creditTotal = accountLines.reduce(
          (sum, line) => sum + (line.credit || 0),
          0
        );

        let balance = 0;
        if (account.normal_balance === "Debit") {
          balance = debitTotal - creditTotal;
        } else {
          balance = creditTotal - debitTotal;
        }

        return {
          id: account.id,
          account_code: account.account_code,
          name: account.name,
          type: account.type,
          normal_balance: account.normal_balance,
          debit_total: debitTotal,
          credit_total: creditTotal,
          balance: balance,
        };
      });

      const totalDebits = accountBalances.reduce(
        (sum, acc) => sum + acc.debit_total,
        0
      );
      const totalCredits = accountBalances.reduce(
        (sum, acc) => sum + acc.credit_total,
        0
      );

      setTrialBalanceData({
        accounts: accountBalances,
        total_debits: totalDebits,
        total_credits: totalCredits,
        is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
      });
    } catch (error) {
      console.error("Error fetching trial balance:", error);
      toast.error("Failed to load trial balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitLoss = async () => {
    try {
      setLoading(true);

      const { data: journalLines, error } = await supabase
        .from("journal_lines")
        .select(
          `
          account_id,
          debit,
          credit,
          journal_entries!inner(date, status)
        `
        )
        .gte("journal_entries.date", startDate.toISOString().split("T")[0])
        .lte("journal_entries.date", endDate.toISOString().split("T")[0])
        .eq("journal_entries.status", "posted");

      if (error) throw error;

      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .in("type", ["Income", "Expense"])
        .order("account_code");

      if (accountsError) throw accountsError;

      const revenueAccounts: AccountBalance[] = [];
      const expenseAccounts: AccountBalance[] = [];
      let totalRevenue = 0;
      let totalExpenses = 0;

      accounts.forEach((account) => {
        const accountLines =
          journalLines?.filter((line) => line.account_id === account.id) || [];
        const debitTotal = accountLines.reduce(
          (sum, line) => sum + (line.debit || 0),
          0
        );
        const creditTotal = accountLines.reduce(
          (sum, line) => sum + (line.credit || 0),
          0
        );

        let balance = 0;
        if (account.normal_balance === "Debit") {
          balance = debitTotal - creditTotal;
        } else {
          balance = creditTotal - debitTotal;
        }

        const accountBalance: AccountBalance = {
          id: account.id,
          account_code: account.account_code,
          name: account.name,
          type: account.type,
          normal_balance: account.normal_balance,
          debit_total: debitTotal,
          credit_total: creditTotal,
          balance: balance,
        };

        if (account.type === "Income") {
          revenueAccounts.push(accountBalance);
          totalRevenue += balance;
        } else if (account.type === "Expense") {
          expenseAccounts.push(accountBalance);
          totalExpenses += balance;
        }
      });

      setPnlData({
        revenue: totalRevenue,
        expenses: totalExpenses,
        net_profit: totalRevenue - totalExpenses,
        revenue_accounts: revenueAccounts,
        expense_accounts: expenseAccounts,
      });
    } catch (error) {
      console.error("Error fetching profit & loss:", error);
      toast.error("Failed to load profit & loss");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);

      const { data: journalLines, error } = await supabase
        .from("journal_lines")
        .select(
          `
          account_id,
          debit,
          credit,
          journal_entries!inner(date, status)
        `
        )
        .lte("journal_entries.date", endDate.toISOString().split("T")[0])
        .eq("journal_entries.status", "posted");

      if (error) throw error;

      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .in("type", ["Asset", "Liability", "Equity"])
        .order("account_code");

      if (accountsError) throw accountsError;

      const assetAccounts: AccountBalance[] = [];
      const liabilityAccounts: AccountBalance[] = [];
      const equityAccounts: AccountBalance[] = [];

      accounts.forEach((account) => {
        const accountLines =
          journalLines?.filter((line) => line.account_id === account.id) || [];
        const debitTotal = accountLines.reduce(
          (sum, line) => sum + (line.debit || 0),
          0
        );
        const creditTotal = accountLines.reduce(
          (sum, line) => sum + (line.credit || 0),
          0
        );

        let balance = 0;
        if (account.normal_balance === "Debit") {
          balance = debitTotal - creditTotal;
        } else {
          balance = creditTotal - debitTotal;
        }

        const accountBalance: AccountBalance = {
          id: account.id,
          account_code: account.account_code,
          name: account.name,
          type: account.type,
          normal_balance: account.normal_balance,
          debit_total: debitTotal,
          credit_total: creditTotal,
          balance: balance,
        };

        if (account.type === "Asset") {
          assetAccounts.push(accountBalance);
        } else if (account.type === "Liability") {
          liabilityAccounts.push(accountBalance);
        } else if (account.type === "Equity") {
          equityAccounts.push(accountBalance);
        }
      });

      const totalAssets = assetAccounts.reduce(
        (sum, acc) => sum + acc.balance,
        0
      );
      const totalLiabilities = liabilityAccounts.reduce(
        (sum, acc) => sum + acc.balance,
        0
      );
      const totalEquity = equityAccounts.reduce(
        (sum, acc) => sum + acc.balance,
        0
      );

      setBalanceSheetData({
        assets: assetAccounts,
        liabilities: liabilityAccounts,
        equity: equityAccounts,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        is_balanced:
          Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      });
    } catch (error) {
      console.error("Error fetching balance sheet:", error);
      toast.error("Failed to load balance sheet");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (
    field: "start" | "end",
    date: Date | undefined
  ) => {
    if (date) {
      if (field === "start") {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleGenerateReport = () => {
    if (activeTab === "trial-balance") {
      fetchTrialBalance();
    } else if (activeTab === "profit-loss") {
      fetchProfitLoss();
    } else if (activeTab === "balance-sheet") {
      fetchBalanceSheet();
    }
  };

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      handleGenerateReport();
    }
  }, [refreshTrigger]);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "Asset":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case "Liability":
        return <CreditCard className="h-4 w-4 text-red-500" />;
      case "Equity":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "Income":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "Expense":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "Asset":
        return "bg-blue-100 text-blue-800";
      case "Liability":
        return "bg-red-100 text-red-800";
      case "Equity":
        return "bg-green-100 text-green-800";
      case "Income":
        return "bg-green-100 text-green-800";
      case "Expense":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports and statements
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>
            Select the date range for your financial reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => handleDateRangeChange("start", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => handleDateRangeChange("end", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                ) : (
                  <BarChart3 className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>
                    All accounts with their debit and credit balances
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trialBalanceData ? (
                <div className="space-y-4">
                  <div className="flex justify-end space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">Total Debits: </span>
                      <span className="text-green-600">
                        {formatter.format(trialBalanceData.total_debits)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Total Credits: </span>
                      <span className="text-green-600">
                        {formatter.format(trialBalanceData.total_credits)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Difference: </span>
                      <span
                        className={
                          trialBalanceData.is_balanced
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {formatter.format(
                          trialBalanceData.total_debits -
                            trialBalanceData.total_credits
                        )}
                      </span>
                    </div>
                    {trialBalanceData.is_balanced ? (
                      <Badge variant="default" className="bg-green-500">
                        Balanced
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Not Balanced</Badge>
                    )}
                  </div>

                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalanceData.accounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">
                              {account.account_code}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getAccountTypeIcon(account.type)}
                                <span>{account.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getAccountTypeColor(account.type)}
                              >
                                {account.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {account.debit_total > 0
                                ? formatter.format(account.debit_total)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {account.credit_total > 0
                                ? formatter.format(account.credit_total)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span
                                className={
                                  account.balance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {formatter.format(account.balance)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Click "Generate Report" to view trial balance
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit-loss">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  <CardDescription>
                    Revenue, expenses, and net profit for the selected period
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pnlData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-green-600">
                          Total Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatter.format(pnlData.revenue)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-red-600">
                          Total Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {formatter.format(pnlData.expenses)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Net Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={`text-2xl font-bold ${
                            pnlData.net_profit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatter.format(pnlData.net_profit)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-green-600">
                        Revenue Accounts
                      </h3>
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pnlData.revenue_accounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getAccountTypeIcon(account.type)}
                                    <span>{account.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatter.format(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-red-600">
                        Expense Accounts
                      </h3>
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pnlData.expense_accounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getAccountTypeIcon(account.type)}
                                    <span>{account.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                  {formatter.format(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Click "Generate Report" to view profit & loss statement
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>
                    Assets, liabilities, and equity as of the selected date
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {balanceSheetData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-blue-600">
                          Total Assets
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatter.format(balanceSheetData.total_assets)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-red-600">
                          Total Liabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {formatter.format(balanceSheetData.total_liabilities)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-green-600">
                          Total Equity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatter.format(balanceSheetData.total_equity)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-sm">
                      <span className="font-medium">Balance Check: </span>
                      <span
                        className={
                          balanceSheetData.is_balanced
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {balanceSheetData.is_balanced
                          ? "Balanced"
                          : "Not Balanced"}
                      </span>
                      <span className="text-gray-500 ml-2">
                        (Assets:{" "}
                        {formatter.format(balanceSheetData.total_assets)} =
                        Liabilities:{" "}
                        {formatter.format(balanceSheetData.total_liabilities)} +
                        Equity:{" "}
                        {formatter.format(balanceSheetData.total_equity)})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-blue-600">
                        Assets
                      </h3>
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {balanceSheetData.assets.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getAccountTypeIcon(account.type)}
                                    <span>{account.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-blue-600">
                                  {formatter.format(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-red-600">
                        Liabilities
                      </h3>
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {balanceSheetData.liabilities.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getAccountTypeIcon(account.type)}
                                    <span>{account.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                  {formatter.format(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-green-600">
                        Equity
                      </h3>
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {balanceSheetData.equity.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getAccountTypeIcon(account.type)}
                                    <span>{account.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatter.format(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Click "Generate Report" to view balance sheet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>
                Cash flow analysis and forecasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Cash Flow Statement coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsSection;

