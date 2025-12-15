import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Phone,
  Clock,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  User,
  AlertCircle,
  Activity,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import HRClockInWidget from "./HRClockInWidget";
import HRActivityTimeline from "./HRActivityTimeline";
import { Progress } from "@/components/ui/progress";

interface StaffPerformance {
  total_calls: number;
  total_duration: number;
  avg_duration: number;
  successful_calls: number;
  conversion_rate: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  calls_by_status: { [key: string]: number };
  calls_by_source: { [key: string]: number };
  daily_breakdown: { [key: string]: number };
  weekly_breakdown: { [key: string]: number };
  monthly_breakdown: { [key: string]: number };
  success_rate_today: number;
  success_rate_week: number;
  success_rate_month: number;
}

interface CallData {
  id: string;
  name: string;
  phone: string;
  status: string;
  called_date: string;
  call_duration: number;
  source: string;
  notes: string;
}

interface Target {
  id: string;
  target_type: string;
  target_value: number;
  period: string;
  current_value?: number;
}

interface Alert {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  created_at: string;
  is_resolved: boolean;
}

const HRStaffOverview: React.FC = () => {
  const { user } = useAuth();
  const [performance, setPerformance] = useState<StaffPerformance>({
    total_calls: 0,
    total_duration: 0,
    avg_duration: 0,
    successful_calls: 0,
    conversion_rate: 0,
    calls_today: 0,
    calls_this_week: 0,
    calls_this_month: 0,
    calls_by_status: {},
    calls_by_source: {},
    daily_breakdown: {},
    weekly_breakdown: {},
    monthly_breakdown: {},
    success_rate_today: 0,
    success_rate_week: 0,
    success_rate_month: 0,
  });
  const [recentCalls, setRecentCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("week");
  const [targets, setTargets] = useState<Target[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (user) {
      fetchStaffPerformance();
      fetchRecentCalls();
      fetchTargets();
      fetchAlerts();
    }
  }, [user, timeFilter]);

  const fetchStaffPerformance = async () => {
    try {
      setLoading(true);

      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date;

      switch (timeFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from("hr_call_tracking")
        .select("*")
        .eq("staff_user_id", user?.id)
        .gte("called_date", startDate.toISOString().split("T")[0])
        .order("called_date", { ascending: false });

      if (error) throw error;

      // Calculate performance metrics
      const performance: StaffPerformance = {
        total_calls: 0,
        total_duration: 0,
        avg_duration: 0,
        successful_calls: 0,
        conversion_rate: 0,
        calls_today: 0,
        calls_this_week: 0,
        calls_this_month: 0,
        calls_by_status: {},
        calls_by_source: {},
        daily_breakdown: {},
        weekly_breakdown: {},
        monthly_breakdown: {},
        success_rate_today: 0,
        success_rate_week: 0,
        success_rate_month: 0,
      };

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);

      let todaySuccessful = 0;
      let weekSuccessful = 0;
      let monthSuccessful = 0;

      data?.forEach((call) => {
        const callDate = new Date(call.called_date);

        performance.total_calls++;
        performance.total_duration += call.call_duration || 0;

        if (callDate.toDateString() === today.toDateString()) {
          performance.calls_today++;
        }
        if (callDate >= weekAgo) {
          performance.calls_this_week++;
        }
        if (callDate >= monthAgo) {
          performance.calls_this_month++;
        }

        if (["joined", "hot_lead", "callback"].includes(call.status)) {
          performance.successful_calls++;

          if (callDate.toDateString() === today.toDateString()) {
            todaySuccessful++;
          }
          if (callDate >= weekAgo) {
            weekSuccessful++;
          }
          if (callDate >= monthAgo) {
            monthSuccessful++;
          }
        }

        // Count by status
        performance.calls_by_status[call.status] =
          (performance.calls_by_status[call.status] || 0) + 1;

        // Count by source
        if (call.source) {
          performance.calls_by_source[call.source] =
            (performance.calls_by_source[call.source] || 0) + 1;
        }

        // Daily breakdown
        const dayKey = callDate.toISOString().split("T")[0];
        performance.daily_breakdown[dayKey] =
          (performance.daily_breakdown[dayKey] || 0) + 1;

        // Weekly breakdown
        const weekKey = getWeekKey(callDate);
        performance.weekly_breakdown[weekKey] =
          (performance.weekly_breakdown[weekKey] || 0) + 1;

        // Monthly breakdown
        const monthKey = callDate.toISOString().substring(0, 7);
        performance.monthly_breakdown[monthKey] =
          (performance.monthly_breakdown[monthKey] || 0) + 1;
      });

      // Calculate success rates
      performance.success_rate_today =
        performance.calls_today > 0
          ? (todaySuccessful / performance.calls_today) * 100
          : 0;
      performance.success_rate_week =
        performance.calls_this_week > 0
          ? (weekSuccessful / performance.calls_this_week) * 100
          : 0;
      performance.success_rate_month =
        performance.calls_this_month > 0
          ? (monthSuccessful / performance.calls_this_month) * 100
          : 0;

      // Calculate averages
      performance.avg_duration =
        performance.total_calls > 0
          ? performance.total_duration / performance.total_calls
          : 0;
      performance.conversion_rate =
        performance.total_calls > 0
          ? (performance.successful_calls / performance.total_calls) * 100
          : 0;

      setPerformance(performance);
    } catch (error) {
      console.error("Error fetching staff performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_call_tracking")
        .select("*")
        .eq("staff_user_id", user?.id)
        .order("called_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentCalls(data || []);
    } catch (error) {
      console.error("Error fetching recent calls:", error);
    }
  };

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_staff_targets")
        .select("*")
        .eq("staff_user_id", user?.id)
        .eq("is_active", true);

      if (error) throw error;

      // Calculate current values for each target
      const targetsWithProgress = await Promise.all(
        (data || []).map(async (target) => {
          let currentValue = 0;

          if (target.target_type === "daily_calls") {
            currentValue = performance.calls_today;
          } else if (target.target_type === "weekly_calls") {
            currentValue = performance.calls_this_week;
          } else if (target.target_type === "monthly_calls") {
            currentValue = performance.calls_this_month;
          } else if (target.target_type === "conversion_rate") {
            currentValue = Math.round(performance.conversion_rate);
          }

          return { ...target, current_value: currentValue };
        })
      );

      setTargets(targetsWithProgress);
    } catch (error) {
      console.error("Error fetching targets:", error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_performance_alerts")
        .select("*")
        .eq("staff_user_id", user?.id)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const getWeekKey = (date: Date) => {
    const year = date.getFullYear();
    const week = Math.ceil(
      (date.getTime() - new Date(year, 0, 1).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );
    return `${year}-W${week}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      joined: "bg-green-100 text-green-800",
      hot_lead: "bg-orange-100 text-orange-800",
      callback: "bg-purple-100 text-purple-800",
      contacted: "bg-blue-100 text-blue-800",
      not_interested: "bg-red-100 text-red-800",
      call_not_picked: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "low":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Clock-In Widget */}
      <HRClockInWidget />

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertColor(
                    alert.severity
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{alert.alert_type}</div>
                      <div className="text-sm mt-1">{alert.message}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Targets Section */}
      {targets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              My Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {targets.map((target) => {
                const progress = target.current_value
                  ? (target.current_value / target.target_value) * 100
                  : 0;
                const isAchieved = progress >= 100;

                return (
                  <div key={target.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAchieved ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Activity className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium">
                          {target.target_type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <Badge variant="outline">{target.period}</Badge>
                      </div>
                      <span className="text-sm font-medium">
                        {target.current_value || 0} / {target.target_value}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} />
                    <div className="text-xs text-muted-foreground">
                      {isAchieved
                        ? "🎉 Target achieved!"
                        : `${Math.round(
                            target.target_value - (target.current_value || 0)
                          )} more to reach target`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.calls_today}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(performance.success_rate_today)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.calls_this_week}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(performance.success_rate_week)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.calls_this_month}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(performance.success_rate_month)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.total_calls}</div>
            <p className="text-xs text-muted-foreground">
              {timeFilter === "today"
                ? "Today"
                : timeFilter === "week"
                ? "This week"
                : "This month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDuration(performance.total_duration)}
            </div>
            <p className="text-xs text-muted-foreground">Total call time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDuration(Math.round(performance.avg_duration))}
            </div>
            <p className="text-xs text-muted-foreground">Average per call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {Math.round(performance.conversion_rate)}%
            </div>
            <p className="text-xs text-muted-foreground">Conversion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Call Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Calls by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(performance.calls_by_status).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="flex justify-between items-center"
                  >
                    <Badge className={getStatusColor(status)}>
                      {status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Calls by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(performance.calls_by_source).map(
                ([source, count]) => (
                  <div
                    key={source}
                    className="flex justify-between items-center"
                  >
                    <Badge variant="outline">{source.toUpperCase()}</Badge>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <HRActivityTimeline />

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCalls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>{call.name}</TableCell>
                  <TableCell>{call.phone}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(call.status)}>
                      {call.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDuration(call.call_duration)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {call.source?.toUpperCase() || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(call.called_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRStaffOverview;
