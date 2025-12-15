import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  Phone,
  Activity,
  TrendingUp,
  Shield,
  RefreshCw,
} from "lucide-react";

interface Alert {
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  staff_id: string;
  staff_name: string;
  staff_email: string;
  message: string;
  details: any;
}

interface ActiveStaff {
  id: string;
  staff_user_id: string;
  clock_in_time: string;
  active_work_seconds: number;
  background_seconds: number;
  last_activity_time: string;
  users: {
    name: string;
    email: string;
  };
}

const HRManipulationMonitor: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeStaff, setActiveStaff] = useState<ActiveStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadMonitoringData();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadMonitoringData();
    }, 30000);

    // Real-time subscriptions
    const subscription = supabase
      .channel("monitoring")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hr_staff_attendance",
        },
        () => {
          loadMonitoringData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);

    try {
      // Run all detection algorithms
      const [idleAlerts, noCallAlerts, timerAlerts] = await Promise.all([
        detectIdleStaff(),
        detectNoCallActivity(),
        detectTimerManipulation(),
      ]);

      // Combine all alerts
      const allAlerts = [...idleAlerts, ...noCallAlerts, ...timerAlerts].sort(
        (a, b) => {
          const severityOrder: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
          };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
      );

      setAlerts(allAlerts);

      // Load active staff
      const { data } = await supabase
        .from("hr_staff_attendance")
        .select(
          `
          *,
          users:staff_user_id (name, email)
        `
        )
        .eq("is_active", true)
        .gte("clock_in_time", new Date().toISOString().split("T")[0]);

      setActiveStaff(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error loading monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectIdleStaff = async (): Promise<Alert[]> => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const { data: activeStaffData } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        id,
        staff_user_id,
        clock_in_time,
        last_activity_time,
        active_work_seconds,
        background_seconds,
        users:staff_user_id (name, email)
      `
      )
      .eq("is_active", true)
      .lt("clock_in_time", twoHoursAgo.toISOString());

    const alerts: Alert[] = [];

    for (const staff of activeStaffData || []) {
      const totalSeconds =
        staff.active_work_seconds + staff.background_seconds;
      const activePercentage =
        totalSeconds > 0 ? (staff.active_work_seconds / totalSeconds) * 100 : 0;

      const lastActivityMinutes = Math.floor(
        (now.getTime() - new Date(staff.last_activity_time).getTime()) / 60000
      );

      // Alert: Very low active percentage (< 40%)
      if (activePercentage < 40 && totalSeconds > 3600) {
        alerts.push({
          type: "LOW_ACTIVE_TIME",
          severity: "HIGH",
          staff_id: staff.staff_user_id,
          staff_name: staff.users.name,
          staff_email: staff.users.email,
          message: `Only ${activePercentage.toFixed(1)}% active time`,
          details: {
            active_seconds: staff.active_work_seconds,
            background_seconds: staff.background_seconds,
            active_percentage: activePercentage,
            clock_in_time: staff.clock_in_time,
          },
        });
      }

      // Alert: No activity for 30+ minutes
      if (lastActivityMinutes > 30) {
        alerts.push({
          type: "EXTENDED_IDLE",
          severity: "HIGH",
          staff_id: staff.staff_user_id,
          staff_name: staff.users.name,
          staff_email: staff.users.email,
          message: `No activity for ${lastActivityMinutes} minutes`,
          details: {
            last_activity: staff.last_activity_time,
            minutes_idle: lastActivityMinutes,
          },
        });
      }
    }

    return alerts;
  };

  const detectNoCallActivity = async (): Promise<Alert[]> => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const today = now.toISOString().split("T")[0];

    const { data: activeStaffData } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        staff_user_id,
        clock_in_time,
        users:staff_user_id (name, email)
      `
      )
      .eq("is_active", true)
      .lt("clock_in_time", threeHoursAgo.toISOString());

    const alerts: Alert[] = [];

    for (const staff of activeStaffData || []) {
      const { count } = await supabase
        .from("hr_call_tracking")
        .select("*", { count: "exact", head: true })
        .eq("staff_user_id", staff.staff_user_id)
        .gte("called_date", today);

      if (count === 0) {
        const hoursWorked = Math.floor(
          (now.getTime() - new Date(staff.clock_in_time).getTime()) / 3600000
        );

        alerts.push({
          type: "NO_CALLS_MADE",
          severity: "CRITICAL",
          staff_id: staff.staff_user_id,
          staff_name: staff.users.name,
          staff_email: staff.users.email,
          message: `No calls made in ${hoursWorked} hours of work`,
          details: {
            clock_in_time: staff.clock_in_time,
            hours_worked: hoursWorked,
            calls_made: 0,
          },
        });
      }
    }

    return alerts;
  };

  const detectTimerManipulation = async (): Promise<Alert[]> => {
    const alerts: Alert[] = [];

    // Alert: Timer running overnight (> 16 hours)
    const { data: overnightTimers } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        id,
        staff_user_id,
        clock_in_time,
        users:staff_user_id (name, email)
      `
      )
      .eq("is_active", true);

    for (const staff of overnightTimers || []) {
      const hoursRunning =
        (Date.now() - new Date(staff.clock_in_time).getTime()) / 3600000;

      if (hoursRunning > 16) {
        alerts.push({
          type: "OVERNIGHT_TIMER",
          severity: "CRITICAL",
          staff_id: staff.staff_user_id,
          staff_name: staff.users.name,
          staff_email: staff.users.email,
          message: `Timer running for ${hoursRunning.toFixed(1)} hours`,
          details: {
            clock_in_time: staff.clock_in_time,
            hours_running: hoursRunning,
          },
        });
      }
    }

    // Alert: Excessive background time
    const { data: highBackgroundStaff } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        staff_user_id,
        active_work_seconds,
        background_seconds,
        users:staff_user_id (name, email)
      `
      )
      .eq("is_active", true);

    for (const staff of highBackgroundStaff || []) {
      const totalSeconds =
        staff.active_work_seconds + staff.background_seconds;
      const backgroundPercentage =
        totalSeconds > 0 ? (staff.background_seconds / totalSeconds) * 100 : 0;

      if (backgroundPercentage > 70 && totalSeconds > 3600) {
        alerts.push({
          type: "EXCESSIVE_BACKGROUND_TIME",
          severity: "HIGH",
          staff_id: staff.staff_user_id,
          staff_name: staff.users.name,
          staff_email: staff.users.email,
          message: `${backgroundPercentage.toFixed(1)}% time in background`,
          details: {
            background_percentage: backgroundPercentage,
            background_seconds: staff.background_seconds,
            active_seconds: staff.active_work_seconds,
          },
        });
      }
    }

    return alerts;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "bg-red-100 border-red-500 text-red-900",
      HIGH: "bg-orange-100 border-orange-500 text-orange-900",
      MEDIUM: "bg-yellow-100 border-yellow-500 text-yellow-900",
      LOW: "bg-blue-100 border-blue-500 text-blue-900",
    };
    return colors[severity] || colors.MEDIUM;
  };

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fleet-purple flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Staff Manipulation Monitoring
          </h2>
          <p className="text-gray-600">
            Real-time detection of suspicious behavior and time manipulation
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          onClick={loadMonitoringData}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-100">
                  Critical Alerts
                </p>
                <p className="text-3xl font-bold">
                  {alerts.filter((a) => a.severity === "CRITICAL").length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">
                  Total Alerts
                </p>
                <p className="text-3xl font-bold">{alerts.length}</p>
              </div>
              <Activity className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">
                  Active Staff
                </p>
                <p className="text-3xl font-bold">{activeStaff.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Active Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">
                ✅ No manipulation detected
              </p>
              <p className="text-sm text-gray-600 mt-2">
                All staff activity looks normal
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`border-l-4 rounded-lg p-4 ${getSeverityColor(
                    alert.severity
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          <span className="font-bold">{alert.severity}</span>
                        </Badge>
                        <span className="text-xs px-2 py-1 bg-white/50 rounded">
                          {alert.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base mb-1">
                        {alert.staff_name}
                      </h3>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <p className="text-xs opacity-75">{alert.staff_email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        // Implement action handler
                        console.log("Taking action on alert:", alert);
                      }}
                    >
                      Take Action
                    </Button>
                  </div>

                  {/* Details */}
                  {alert.details && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium opacity-75 hover:opacity-100">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-white/30 rounded text-xs overflow-x-auto">
                        {JSON.stringify(alert.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Staff Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Currently Working Staff ({activeStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStaff.map((staff) => {
              const totalSeconds =
                staff.active_work_seconds + staff.background_seconds;
              const activePercentage =
                totalSeconds > 0
                  ? ((staff.active_work_seconds / totalSeconds) * 100).toFixed(
                      1
                    )
                  : 0;

              const lastActivityMinutes = Math.floor(
                (Date.now() - new Date(staff.last_activity_time).getTime()) /
                  60000
              );

              const isActive = lastActivityMinutes < 2;

              return (
                <div
                  key={staff.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-base">
                        {staff.users.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {staff.users.email}
                      </p>
                    </div>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={
                        isActive ? "bg-green-500" : "bg-gray-500"
                      }
                    >
                      {isActive ? "🟢 Active" : "⚪ Idle"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Time:</span>
                      <span className="font-medium">
                        {formatSeconds(staff.active_work_seconds)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Background:</span>
                      <span className="font-medium">
                        {formatSeconds(staff.background_seconds)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active %:</span>
                      <span
                        className={`font-bold ${
                          Number(activePercentage) >= 70
                            ? "text-green-600"
                            : Number(activePercentage) >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {activePercentage}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Last Activity:</span>
                      <span>{lastActivityMinutes}m ago</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRManipulationMonitor;

