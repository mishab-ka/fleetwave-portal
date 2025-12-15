import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  Phone,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDailyMetrics } from "@/services/hrMetricsService";
import { checkIdleStatus } from "@/services/hrActivityTracker";

interface StaffActivityStatus {
  id: string;
  name: string;
  phone_number: string;
  status: "active" | "idle" | "offline" | "not_clocked_in";
  lastActivityTime: string | null;
  hoursWorked: number;
  todayCalls: number;
  targetCalls: number;
  targetProgress: number;
  minutesSinceActivity: number;
}

const HRLiveActivityDashboard: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffActivityStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStaffActivity();

    // Auto-refresh every 30 seconds
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStaffActivity();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchStaffActivity = async () => {
    try {
      setLoading(true);

      // Get ALL HR staff from users table
      const { data: allStaff, error: staffError } = await supabase
        .from("users")
        .select("id, name, phone_number")
        .eq("role", "hr_staff");

      if (staffError) throw staffError;

      const today = new Date().toISOString().split("T")[0];

      // Get today's attendance for all staff
      const { data: attendanceData } = await supabase
        .from("hr_staff_attendance")
        .select("*")
        .gte("clock_in_time", `${today}T00:00:00`)
        .eq("is_active", true);

      const attendanceMap = new Map(
        attendanceData?.map((a) => [a.staff_user_id, a]) || []
      );

      const staffStatusPromises = (allStaff || []).map(async (staffUser) => {
        const attendance = attendanceMap.get(staffUser.id);

        // Get today's metrics
        const metrics = await getDailyMetrics(staffUser.id, today);

        // Determine status
        let status: "active" | "idle" | "offline" | "not_clocked_in" =
          "not_clocked_in";
        let lastActivityTime: string | null = null;
        let hoursWorked = 0;
        let minutesSinceActivity = 0;

        if (attendance) {
          // Staff is clocked in
          // Check idle status
          const idleStatus = await checkIdleStatus(staffUser.id, 30);

          if (idleStatus.isIdle) {
            status = "idle";
          } else {
            status = "active";
          }

          lastActivityTime = attendance.last_activity_at;
          hoursWorked = attendance.total_work_duration_seconds
            ? attendance.total_work_duration_seconds / 3600
            : 0;
          minutesSinceActivity = idleStatus.minutesSinceActivity;
        }

        const targetCalls = metrics?.calls_target || 0;
        const todayCalls = metrics?.total_calls || 0;
        const targetProgress =
          targetCalls > 0 ? (todayCalls / targetCalls) * 100 : 0;

        return {
          id: staffUser.id,
          name: staffUser.name || staffUser.phone_number,
          phone_number: staffUser.phone_number,
          status,
          lastActivityTime,
          hoursWorked,
          todayCalls,
          targetCalls,
          targetProgress,
          minutesSinceActivity,
        };
      });

      const staffStatuses = await Promise.all(staffStatusPromises);
      // Sort: active first, then idle, then not clocked in
      staffStatuses.sort((a, b) => {
        const statusOrder = { active: 0, idle: 1, not_clocked_in: 2, offline: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
      
      setStaffList(staffStatuses);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching staff activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "idle":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "offline":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "not_clocked_in":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Wifi className="w-4 h-4 text-green-600" />;
      case "idle":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "offline":
        return <WifiOff className="w-4 h-4 text-gray-600" />;
      case "not_clocked_in":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "idle":
        return "Idle";
      case "offline":
        return "Offline";
      case "not_clocked_in":
        return "Not Clocked In";
      default:
        return status;
    }
  };

  const formatTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatLastActivity = (time: string | null): string => {
    if (!time) return "No activity";

    const lastActivity = new Date(time);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  const activeCount = staffList.filter((s) => s.status === "active").length;
  const idleCount = staffList.filter((s) => s.status === "idle").length;
  const notClockedInCount = staffList.filter((s) => s.status === "not_clocked_in").length;
  const totalCalls = staffList.reduce((sum, s) => sum + s.todayCalls, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffList.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Now</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeCount}
                </p>
              </div>
              <Wifi className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Idle / Not Clocked In</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {idleCount} / {notClockedInCount}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Calls Today</p>
                <p className="text-2xl font-bold text-purple-600">{totalCalls}</p>
              </div>
              <Phone className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Staff Activity
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-300"
                  }`}
                ></div>
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "Pause" : "Resume"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStaffActivity}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && staffList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading staff activity...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No HR staff found</p>
              <p className="text-gray-500 text-sm mt-1">
                Make sure HR staff are added to the system
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((staff) => (
                <Card
                  key={staff.id}
                  className={`border-2 transition-all hover:shadow-md ${
                    staff.status === "active"
                      ? "border-green-200"
                      : staff.status === "idle"
                      ? "border-yellow-200"
                      : staff.status === "not_clocked_in"
                      ? "border-red-200"
                      : "border-gray-200"
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {staff.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {staff.phone_number}
                        </p>
                      </div>
                      <Badge
                        className={`${getStatusColor(staff.status)} border`}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(staff.status)}
                          <span className="text-xs">
                            {getStatusLabel(staff.status)}
                          </span>
                        </div>
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Hours Worked</span>
                        <span className="font-medium text-gray-900">
                          {formatTime(staff.hoursWorked)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Calls Today</span>
                        <span className="font-medium text-gray-900">
                          {staff.todayCalls}
                          {staff.targetCalls > 0 && (
                            <span className="text-gray-500">
                              /{staff.targetCalls}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Target Progress */}
                      {staff.targetCalls > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Target Progress</span>
                            <span className="font-medium text-gray-700">
                              {Math.round(staff.targetProgress)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                staff.targetProgress >= 100
                                  ? "bg-green-500"
                                  : staff.targetProgress >= 50
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                              }`}
                              style={{
                                width: `${Math.min(staff.targetProgress, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Last Activity */}
                      {staff.status !== "not_clocked_in" && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t">
                          <span className="text-gray-500">Last Activity</span>
                          <span
                            className={`font-medium ${
                              staff.status === "idle"
                                ? "text-yellow-600"
                                : "text-gray-700"
                            }`}
                          >
                            {formatLastActivity(staff.lastActivityTime)}
                          </span>
                        </div>
                      )}

                      {staff.status === "idle" && (
                        <div className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            Idle for {staff.minutesSinceActivity} minutes
                          </span>
                        </div>
                      )}

                      {staff.status === "not_clocked_in" && (
                        <div className="flex items-center gap-1 text-xs text-red-700 bg-red-50 p-2 rounded">
                          <AlertCircle className="w-3 h-3" />
                          <span>Staff needs to clock in to start tracking</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRLiveActivityDashboard;
