import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Clock,
  FileText,
  Users,
  Search,
  Filter,
  Ban,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  Car,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format, parseISO, isAfter, addDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Driver {
  id: string;
  name: string;
  email_id: string;
  phone_number: string;
  vehicle_number?: string;
  shift?: string;
  online: boolean;
  profile_photo?: string;
  joining_date: string;
  cash_trip_blocked: boolean;
  last_form_submission?: string;
  overdue_count: number;
  total_overdue_amount: number;
  days_since_last_submission: number;
  status: "overdue" | "no_submission" | "blocked" | "active";
}

interface BlockingStats {
  totalBlocked: number;
  overdueDrivers: number;
  noSubmissionDrivers: number;
  totalOverdueAmount: number;
  averageOverdueDays: number;
}

const CashTripBlockingList = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BlockingStats>({
    totalBlocked: 0,
    overdueDrivers: 0,
    noSubmissionDrivers: 0,
    totalOverdueAmount: 0,
    averageOverdueDays: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("priority");

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    filterAndSortDrivers();
  }, [drivers, searchTerm, shiftFilter, sortBy]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);

      // Fetch all online drivers
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select(
          "id, name, email_id, phone_number, vehicle_number, shift, online, profile_photo, joining_date, cash_trip_blocked"
        )
        .eq("online", true)
        .order("name");

      if (driversError) throw driversError;

      // Fetch fleet reports for each driver
      const driversWithReports = await Promise.all(
        driversData.map(async (driver) => {
          const { data: reports, error: reportsError } = await supabase
            .from("fleet_reports")
            .select("submission_date, rent_paid_amount, status, rent_date")
            .eq("user_id", driver.id)
            .order("submission_date", { ascending: false })
            .limit(10);

          if (reportsError) {
            console.error(
              `Error fetching reports for driver ${driver.id}:`,
              reportsError
            );
            return null;
          }

          const lastSubmission = reports?.[0]?.submission_date;
          const today = new Date();
          const daysSinceLastSubmission = lastSubmission
            ? Math.floor(
                (today.getTime() - new Date(lastSubmission).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : Math.floor(
                (today.getTime() - new Date(driver.joining_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              );

          // Calculate overdue status
          const overdueReports =
            reports?.filter((report) => {
              if (report.status === "approved" || report.status === "leave")
                return false;

              const reportDate = parseISO(report.rent_date);
              const deadline = getDeadlineForShift(
                reportDate,
                driver.shift || "morning"
              );
              return isAfter(today, deadline);
            }) || [];

          const overdueAmount = overdueReports.reduce(
            (sum, report) => sum + (report.rent_paid_amount || 0),
            0
          );

          let status: Driver["status"] = "active";
          if (driver.cash_trip_blocked) {
            status = "blocked";
          } else if (overdueReports.length > 0) {
            status = "overdue";
          } else if (daysSinceLastSubmission > 3) {
            status = "no_submission";
          }

          return {
            ...driver,
            last_form_submission: lastSubmission,
            overdue_count: overdueReports.length,
            total_overdue_amount: overdueAmount,
            days_since_last_submission: daysSinceLastSubmission,
            status,
          };
        })
      );

      const validDrivers = driversWithReports.filter(
        (driver) => driver !== null
      ) as Driver[];
      setDrivers(validDrivers);

      // Calculate stats
      const stats: BlockingStats = {
        totalBlocked: validDrivers.filter((d) => d.cash_trip_blocked).length,
        overdueDrivers: validDrivers.filter((d) => d.status === "overdue")
          .length,
        noSubmissionDrivers: validDrivers.filter(
          (d) => d.status === "no_submission"
        ).length,
        totalOverdueAmount: validDrivers.reduce(
          (sum, d) => sum + d.total_overdue_amount,
          0
        ),
        averageOverdueDays:
          validDrivers.length > 0
            ? Math.round(
                validDrivers.reduce(
                  (sum, d) => sum + d.days_since_last_submission,
                  0
                ) / validDrivers.length
              )
            : 0,
      };
      setStats(stats);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load driver data");
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineForShift = (date: Date, shift: string): Date => {
    const deadline = new Date(date);
    if (shift === "morning") {
      deadline.setHours(17, 0, 0, 0); // 5:00 PM
    } else if (shift === "night" || shift === "24hr") {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(5, 0, 0, 0); // 5:00 AM next day
    } else {
      deadline.setHours(17, 0, 0, 0); // Default to 5:00 PM
    }
    return deadline;
  };

  const filterAndSortDrivers = () => {
    // Only show overdue users
    let filtered = drivers.filter((driver) => {
      // Must be overdue
      if (driver.status !== "overdue") return false;

      const matchesSearch =
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.vehicle_number
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        driver.phone_number.includes(searchTerm);

      const matchesShift =
        shiftFilter === "all" || driver.shift === shiftFilter;

      return matchesSearch && matchesShift;
    });

    // Sort drivers by priority (most overdue first)
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          // Primary: Sort by overdue count (most overdue reports first)
          if (b.overdue_count !== a.overdue_count) {
            return b.overdue_count - a.overdue_count;
          }
          // Secondary: Sort by total overdue amount (highest first)
          if (b.total_overdue_amount !== a.total_overdue_amount) {
            return b.total_overdue_amount - a.total_overdue_amount;
          }
          // Tertiary: Sort by days since last submission (longest first)
          return b.days_since_last_submission - a.days_since_last_submission;
        case "name":
          return a.name.localeCompare(b.name);
        case "overdue_amount":
          return b.total_overdue_amount - a.total_overdue_amount;
        case "days_since_submission":
          return b.days_since_last_submission - a.days_since_last_submission;
        case "overdue_count":
          return b.overdue_count - a.overdue_count;
        default:
          return 0;
      }
    });

    setFilteredDrivers(filtered);
  };

  const toggleCashTripBlock = async (
    driverId: string,
    currentBlocked: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ cash_trip_blocked: !currentBlocked })
        .eq("id", driverId);

      if (error) throw error;

      toast.success(
        `Cash trip ${!currentBlocked ? "blocked" : "unblocked"} for driver`
      );
      fetchDrivers(); // Refresh data
    } catch (error) {
      console.error("Error updating cash trip block:", error);
      toast.error("Failed to update cash trip block status");
    }
  };

  const getStatusBadge = (status: Driver["status"]) => {
    switch (status) {
      case "blocked":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Ban className="h-3 w-3" />
            Blocked
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Overdue
          </Badge>
        );
      case "no_submission":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            No Submission
          </Badge>
        );
      case "active":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusColor = (status: Driver["status"]) => {
    switch (status) {
      case "blocked":
        return "border-l-red-500";
      case "overdue":
        return "border-l-orange-500";
      case "no_submission":
        return "border-l-yellow-500";
      case "active":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cash Trip Blocking List
          </h2>
          <p className="text-muted-foreground">
            Manage overdue drivers - sorted by priority (most overdue first)
          </p>
        </div>
        <Button onClick={fetchDrivers} variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blocked</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.totalBlocked}
            </div>
            <p className="text-xs text-muted-foreground">
              Drivers blocked from cash trips
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Drivers
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.overdueDrivers}
            </div>
            <p className="text-xs text-muted-foreground">
              With pending payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Submission</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.noSubmissionDrivers}
            </div>
            <p className="text-xs text-muted-foreground">
              Missing recent forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.totalOverdueAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageOverdueDays}</div>
            <p className="text-xs text-muted-foreground">
              Since last submission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>


            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="24hr">24 Hours</SelectItem>
                <SelectItem value="none">No Shift</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority (Most Overdue First)</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="overdue_amount">Overdue Amount</SelectItem>
                <SelectItem value="days_since_submission">
                  Days Since Submission
                </SelectItem>
                <SelectItem value="overdue_count">Overdue Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Drivers ({filteredDrivers.length})
          </CardTitle>
          <CardDescription>
            Showing only overdue drivers. Click the toggle to block/unblock drivers from cash trips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No overdue drivers found
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle & Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Submission</TableHead>
                    <TableHead>Overdue Info</TableHead>
                    <TableHead className="text-center">
                      Cash Trip Block
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={driver.profile_photo} />
                            <AvatarFallback>
                              {driver.name?.charAt(0) || "D"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{driver.name}</div>
                            <div className="text-sm text-gray-500">
                              ID: {driver.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {driver.phone_number}
                          </div>
                          {driver.email_id && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="h-3 w-3 mr-1" />
                              {driver.email_id}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {driver.vehicle_number || "N/A"}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {driver.shift || "No Shift"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(driver.status)}</TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {driver.last_form_submission
                              ? format(
                                  parseISO(driver.last_form_submission),
                                  "dd MMM yyyy"
                                )
                              : "Never"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {driver.days_since_last_submission} days ago
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {driver.overdue_count > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-orange-600">
                              {driver.overdue_count} overdue
                            </div>
                            <div className="text-xs text-gray-500">
                              ₹{driver.total_overdue_amount.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No overdue
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Switch
                            checked={driver.cash_trip_blocked}
                            onCheckedChange={() =>
                              toggleCashTripBlock(
                                driver.id,
                                driver.cash_trip_blocked
                              )
                            }
                          />
                          <span className="text-xs text-gray-500">
                            {driver.cash_trip_blocked ? "Blocked" : "Allowed"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashTripBlockingList;
