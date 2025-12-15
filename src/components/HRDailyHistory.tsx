import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Phone,
  Target,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DailyStats {
  id: string;
  staff_user_id: string;
  staff_name: string;
  date: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_call_duration: number;
  avg_call_duration: number;
  leads_contacted: number;
  hot_leads_generated: number;
  leads_joined: number;
  callbacks_scheduled: number;
  conversion_rate: number;
  status_breakdown: any;
  source_breakdown: any;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_work_hours: number;
}

const HRDailyHistory: React.FC = () => {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [timeRange, setTimeRange] = useState("week");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    []
  );
  const [staffNames, setStaffNames] = useState<{ [key: string]: string }>({});
  const [userRole, setUserRole] = useState<
    "hr_manager" | "hr_staff" | "admin" | null
  >(null);

  useEffect(() => {
    checkUserRole();
    fetchStaffList();
  }, [user]);

  useEffect(() => {
    if (userRole) {
      fetchDailyStats();
    }
  }, [timeRange, selectedStaff, userRole]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role as any);
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "hr_staff")
        .order("name", { ascending: true });

      if (error) throw error;
      setStaffList(data || []);

      const nameMap: { [key: string]: string } = {};
      data?.forEach((staff) => {
        nameMap[staff.id] = staff.name;
      });
      setStaffNames(nameMap);
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  };

  const fetchDailyStats = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      let query = supabase
        .from("hr_staff_daily_stats")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      // Filter by staff if not "all"
      if (selectedStaff !== "all") {
        query = query.eq("staff_user_id", selectedStaff);
      } else if (userRole === "hr_staff" && user) {
        // HR staff can only see their own stats
        query = query.eq("staff_user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with staff names
      const enrichedData = (data || []).map((stat) => ({
        ...stat,
        staff_name: staffNames[stat.staff_user_id] || "Unknown Staff",
      }));

      setDailyStats(enrichedData);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTrendIcon = (current: number, previous: number | null) => {
    if (previous === null) return <Minus className="w-4 h-4 text-gray-400" />;
    if (current > previous)
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous)
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const calculateTotals = () => {
    return {
      totalCalls: dailyStats.reduce((sum, stat) => sum + stat.total_calls, 0),
      totalSuccessful: dailyStats.reduce(
        (sum, stat) => sum + stat.successful_calls,
        0
      ),
      totalDuration: dailyStats.reduce(
        (sum, stat) => sum + stat.total_call_duration,
        0
      ),
      totalJoined: dailyStats.reduce((sum, stat) => sum + stat.leads_joined, 0),
      totalHotLeads: dailyStats.reduce(
        (sum, stat) => sum + stat.hot_leads_generated,
        0
      ),
      avgConversion:
        dailyStats.length > 0
          ? dailyStats.reduce((sum, stat) => sum + stat.conversion_rate, 0) /
            dailyStats.length
          : 0,
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-fleet-purple flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Daily Performance History
          </h2>
          <p className="text-gray-600">
            Track daily call metrics and conversion rates
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>

            {(userRole === "hr_manager" || userRole === "admin") && (
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={fetchDailyStats}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Total Calls</p>
                <p className="text-3xl font-bold">{totals.totalCalls}</p>
              </div>
              <Phone className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">
                  Successful Calls
                </p>
                <p className="text-3xl font-bold">{totals.totalSuccessful}</p>
              </div>
              <Target className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">
                  Leads Joined
                </p>
                <p className="text-3xl font-bold">{totals.totalJoined}</p>
              </div>
              <Users className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">
                  Avg Conversion
                </p>
                <p className="text-3xl font-bold">
                  {totals.avgConversion.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No daily stats available</p>
              <p className="text-gray-400 text-sm mt-2">
                Stats will appear here after calls are made
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto h-[500px] overflow-y-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {(userRole === "hr_manager" || userRole === "admin") && (
                      <TableHead>Staff Member</TableHead>
                    )}
                    <TableHead>Total Calls</TableHead>
                    <TableHead>Successful</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Hot Leads</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Work Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyStats.map((stat, index) => {
                    const previousStat =
                      index < dailyStats.length - 1
                        ? dailyStats[index + 1]
                        : null;
                    return (
                      <TableRow key={stat.id}>
                        <TableCell className="font-medium">
                          {new Date(stat.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        {(userRole === "hr_manager" ||
                          userRole === "admin") && (
                          <TableCell>{stat.staff_name}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {stat.total_calls}
                            </span>
                            {getTrendIcon(
                              stat.total_calls,
                              previousStat?.total_calls || null
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50">
                            {stat.successful_calls}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50">
                            {stat.leads_joined}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-orange-50">
                            {stat.hot_leads_generated}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              stat.conversion_rate >= 50
                                ? "bg-green-500 text-white"
                                : stat.conversion_rate >= 30
                                ? "bg-yellow-500 text-white"
                                : "bg-red-500 text-white"
                            }
                          >
                            {stat.conversion_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {formatDuration(stat.total_call_duration)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {stat.total_work_hours > 0
                              ? `${stat.total_work_hours.toFixed(1)}h`
                              : "N/A"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRDailyHistory;
