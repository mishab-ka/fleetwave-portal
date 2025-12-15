import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Phone,
  Clock,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Target,
  Calendar as CalendarIcon,
  LogIn,
  LogOut,
  Activity,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import HRStaffLeads from "./HRStaffLeads";
import HRJoiningCalendar from "./HRJoiningCalendar";
import { logActivity } from "@/services/hrActivityTracker";
import {
  clockIn,
  clockOut,
  getAttendanceStatus,
} from "@/services/hrAttendanceService";
import { toast } from "sonner";

interface MobileStats {
  totalLeads: number;
  todayCalls: number;
  weekCalls: number;
  avgDuration: number;
  successRate: number;
}

interface HRMobileViewProps {
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

const HRMobileView: React.FC<HRMobileViewProps> = ({
  onNavigate,
  activeTab = "overview",
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MobileStats>({
    totalLeads: 0,
    todayCalls: 0,
    weekCalls: 0,
    avgDuration: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  // Clock-in/out state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [workDuration, setWorkDuration] = useState(0);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchStats();
      checkClockInStatus();
    }
  }, [user]);

  // Update work duration every second when clocked in
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor(
          (now.getTime() - clockInTime.getTime()) / 1000
        );
        setWorkDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  const fetchStats = async () => {
    try {
      // Fetch leads count
      const { count: leadsCount } = await supabase
        .from("hr_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_staff_user_id", user?.id);

      // Fetch call tracking data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: todayCallsData } = await supabase
        .from("hr_call_tracking")
        .select("call_duration, status")
        .eq("staff_user_id", user?.id)
        .gte("called_date", today.toISOString().split("T")[0]);

      const { data: weekCallsData } = await supabase
        .from("hr_call_tracking")
        .select("call_duration, status")
        .eq("staff_user_id", user?.id)
        .gte("called_date", weekAgo.toISOString().split("T")[0]);

      const avgDuration =
        weekCallsData && weekCallsData.length > 0
          ? weekCallsData.reduce(
              (sum, call) => sum + (call.call_duration || 0),
              0
            ) / weekCallsData.length
          : 0;

      const successfulCalls =
        weekCallsData?.filter((call) =>
          ["joined", "hot_lead", "callback"].includes(call.status)
        ).length || 0;

      const successRate =
        weekCallsData && weekCallsData.length > 0
          ? (successfulCalls / weekCallsData.length) * 100
          : 0;

      setStats({
        totalLeads: leadsCount || 0,
        todayCalls: todayCallsData?.length || 0,
        weekCalls: weekCallsData?.length || 0,
        avgDuration: Math.round(avgDuration),
        successRate: Math.round(successRate),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkClockInStatus = async () => {
    if (!user) return;

    try {
      const status = await getAttendanceStatus(user.id);
      setIsClockedIn(status.isClockedIn);

      if (status.isClockedIn && status.attendance?.clock_in_time) {
        setClockInTime(new Date(status.attendance.clock_in_time));
        setWorkDuration(status.hoursWorked * 3600);
      }
    } catch (error) {
      console.error("Error checking clock-in status:", error);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;

    try {
      const result = await clockIn(user.id);
      if (result.success) {
        setIsClockedIn(true);
        setClockInTime(new Date());
        setWorkDuration(0);
        toast.success("Clocked in successfully! Have a great day! 🎉");
      } else {
        toast.error(result.error || "Failed to clock in");
      }
    } catch (error) {
      console.error("Error clocking in:", error);
      toast.error("Failed to clock in");
    }
  };

  const handleClockOut = async () => {
    if (!user) return;

    try {
      const result = await clockOut(user.id);
      if (result.success) {
        setIsClockedIn(false);
        setClockInTime(null);
        const hours = Math.floor(workDuration / 3600);
        const minutes = Math.floor((workDuration % 3600) / 60);
        toast.success(
          `Clocked out successfully! You worked ${hours}h ${minutes}m today. Great job! 👏`
        );
        setWorkDuration(0);
      } else {
        toast.error(result.error || "Failed to clock out");
      }
    } catch (error) {
      console.error("Error clocking out:", error);
      toast.error("Failed to clock out");
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatWorkDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "leads":
        return {
          title: "My Leads",
          subtitle: "Manage your assigned leads",
          icon: <Phone className="w-5 h-5 text-white" />,
        };
      case "analytics":
        return {
          title: "Performance",
          subtitle: "Your stats and analytics",
          icon: <BarChart3 className="w-5 h-5 text-white" />,
        };
      case "calendar":
        return {
          title: "Calendar",
          subtitle: "Schedule and events",
          icon: <CalendarIcon className="w-5 h-5 text-white" />,
        };
      default:
        return {
          title: "Welcome Back! 👋",
          subtitle: "Here's your overview today",
          icon: <Users className="w-5 h-5 text-white" />,
        };
    }
  };

  const header = getHeaderTitle();

  // Debug logging
  console.log("HRMobileView - activeTab:", activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{header.title}</h1>
            <p className="text-sm text-gray-600">{header.subtitle}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            {header.icon}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Clock In/Out Widget */}
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isClockedIn ? "You're Clocked In" : "Ready to Start?"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {isClockedIn
                        ? `Working for ${formatWorkDuration(workDuration)}`
                        : "Clock in to start tracking your work"}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isClockedIn ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    {isClockedIn ? (
                      <Activity className="w-6 h-6 text-green-600 animate-pulse" />
                    ) : (
                      <Clock className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {isClockedIn ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 font-medium">
                            Work Duration
                          </p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatWorkDuration(workDuration)}
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <Button
                      onClick={handleClockOut}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-12 rounded-xl font-semibold"
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Clock Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleClockIn}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-12 rounded-xl font-semibold"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Clock In
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Today's Goal Section */}
            <Card className="bg-gradient-to-br from-purple-600 to-blue-600 border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-purple-100 text-sm">Today's Goal</p>
                    <h2 className="text-3xl font-bold text-white mt-1">
                      {stats.todayCalls} Calls
                    </h2>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{stats.successRate}% success rate this week</span>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalLeads}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total Leads</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.weekCalls}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">This Week</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(stats.avgDuration)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Avg Duration</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.successRate}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Success Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      if (user) {
                        logActivity(user.id, "page_viewed", { page: "leads" });
                      }
                      onNavigate?.("leads");
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-14 justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">My Leads</div>
                        <div className="text-xs opacity-90">
                          View assigned leads
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() => {
                      if (user) {
                        logActivity(user.id, "page_viewed", {
                          page: "analytics",
                        });
                      }
                      onNavigate?.("analytics");
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-14 justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Performance</div>
                        <div className="text-xs opacity-90">
                          View your stats
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() => {
                      if (user) {
                        logActivity(user.id, "page_viewed", {
                          page: "calendar",
                        });
                      }
                      onNavigate?.("calendar");
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-14 justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Calendar</div>
                        <div className="text-xs opacity-90">View schedule</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Project Analytics Style Section */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Weekly Analytics
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm text-green-600 font-semibold">
                      +12%
                    </span>
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stats.successRate}%
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Success rate this week
                </p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                    style={{ width: `${stats.successRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <HRStaffLeads />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            {/* Weekly Performance Card */}
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-green-100 text-sm">Weekly Performance</p>
                    <h2 className="text-3xl font-bold text-white mt-1">
                      {stats.weekCalls} Calls
                    </h2>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{stats.successRate}% success rate</span>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(stats.avgDuration)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Avg Duration</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.successRate}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Success Rate</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.todayCalls}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Today's Calls</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalLeads}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total Leads</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Card */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  This Week's Progress
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Calls Completed</span>
                      <span className="font-semibold">{stats.weekCalls}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                        style={{
                          width: `${Math.min(
                            (stats.weekCalls / 50) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-semibold">
                        {stats.successRate}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                        style={{ width: `${stats.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div className="pb-4">
            <HRJoiningCalendar />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-around">
          <button
            onClick={() => {
              if (user) {
                logActivity(user.id, "page_viewed", { page: "overview" });
              }
              onNavigate?.("overview");
            }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeTab === "overview" ? "bg-purple-100" : ""
              }`}
            >
              <Users
                className={`w-5 h-5 ${
                  activeTab === "overview" ? "text-purple-600" : "text-gray-400"
                }`}
              />
            </div>
            <span
              className={`text-xs ${
                activeTab === "overview"
                  ? "text-purple-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              Overview
            </span>
          </button>
          <button
            onClick={() => {
              if (user) {
                logActivity(user.id, "page_viewed", { page: "leads" });
              }
              onNavigate?.("leads");
            }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeTab === "leads" ? "bg-purple-100" : ""
              }`}
            >
              <Phone
                className={`w-5 h-5 ${
                  activeTab === "leads" ? "text-purple-600" : "text-gray-400"
                }`}
              />
            </div>
            <span
              className={`text-xs ${
                activeTab === "leads"
                  ? "text-purple-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              Leads
            </span>
          </button>
          <button
            onClick={() => {
              if (user) {
                logActivity(user.id, "page_viewed", { page: "analytics" });
              }
              onNavigate?.("analytics");
            }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeTab === "analytics" ? "bg-purple-100" : ""
              }`}
            >
              <BarChart3
                className={`w-5 h-5 ${
                  activeTab === "analytics"
                    ? "text-purple-600"
                    : "text-gray-400"
                }`}
              />
            </div>
            <span
              className={`text-xs ${
                activeTab === "analytics"
                  ? "text-purple-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              Stats
            </span>
          </button>
          <button
            onClick={() => {
              if (user) {
                logActivity(user.id, "page_viewed", { page: "calendar" });
              }
              onNavigate?.("calendar");
            }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeTab === "calendar" ? "bg-purple-100" : ""
              }`}
            >
              <CalendarIcon
                className={`w-5 h-5 ${
                  activeTab === "calendar" ? "text-purple-600" : "text-gray-400"
                }`}
              />
            </div>
            <span
              className={`text-xs ${
                activeTab === "calendar"
                  ? "text-purple-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              Calendar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HRMobileView;
