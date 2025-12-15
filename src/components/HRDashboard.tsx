import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Phone,
  MessageSquare,
  Calendar,
  Settings,
  UserCheck,
  PhoneCall,
  BarChart3,
  TrendingUp,
  Clock,
  Menu,
  X,
  ArrowBigLeft,
  LucideArrowBigRightDash,
  ArrowBigRightDash,
  Activity,
  Target,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import HRLeadsManagement from "@/components/HRLeadsManagement";
import HRStaffManagement from "@/components/HRStaffManagement";
import HRWhatsAppManagement from "@/components/HRWhatsAppManagement";
import HRStatusManagement from "@/components/HRStatusManagement";
import HRCalendar from "@/components/HRCalendar";
import HRStaffPortal from "@/components/HRStaffPortal";
import HRStaffLeads from "@/components/HRStaffLeads";
import HRStaffWhatsApp from "@/components/HRStaffWhatsApp";
import HRStaffOverview from "@/components/HRStaffOverview";
import HRPerformanceAnalytics from "@/components/HRPerformanceAnalytics";
import HREnhancedAnalytics from "@/components/HREnhancedAnalytics";
import HRMobileView from "@/components/HRMobileView";
import HRJoiningCalendar from "@/components/HRJoiningCalendar";
import HRPerformanceAnalyticsEnhanced from "@/components/HRPerformanceAnalyticsEnhanced";
import HRLiveActivityDashboard from "@/components/HRLiveActivityDashboard";
import HRAlertCenter from "@/components/HRAlertCenter";
import HRTargetManagement from "@/components/HRTargetManagement";
import HRSystemSettings from "@/components/HRSystemSettings";
import HRDailyHistory from "@/components/HRDailyHistory";
import HRManipulationMonitor from "@/components/HRManipulationMonitor";
import HRWorkingHours from "@/components/HRWorkingHours";

interface HRStats {
  totalLeads: number;
  totalStaff: number;
  totalNumbers: number;
  statusCounts: Record<string, number>;
  recentActivity: any[];
}

const HRDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "leads"
    | "staff"
    | "whatsapp"
    | "statuses"
    | "calendar"
    | "performance"
    | "enhanced_analytics"
    | "analytics"
    | "live_activity"
    | "alerts"
    | "targets"
    | "settings"
    | "daily_history"
    | "manipulation_monitor"
    | "working_hours"
  >("overview");
  const [userRole, setUserRole] = useState<
    "hr_manager" | "hr_staff" | "admin" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const initialLoadRef = useRef(true);
  const [stats, setStats] = useState<HRStats>({
    totalLeads: 0,
    totalStaff: 0,
    totalNumbers: 0,
    statusCounts: {},
    recentActivity: [],
  });
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showClockInPrompt, setShowClockInPrompt] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchStats();
      checkClockInStatus();
    }
  }, [user]);

  useEffect(() => {
    if (
      userRole === "hr_staff" &&
      activeTab === "overview" &&
      initialLoadRef.current
    ) {
      setActiveTab("leads");
      initialLoadRef.current = false;
    }
  }, [userRole, activeTab]);

  // Handle sidebar behavior and mobile detection on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
        setSidebarHovered(false);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkClockInStatus = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("hr_staff_attendance")
        .select("*")
        .eq("staff_user_id", user.id)
        .gte("clock_in_time", `${today}T00:00:00`)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error checking clock-in status:", error);
        return;
      }

      const clockedIn = !!data;
      setIsClockedIn(clockedIn);

      // Show prompt only for HR staff who are not clocked in
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userData?.role === "hr_staff" && !clockedIn) {
        setShowClockInPrompt(true);
      }
    } catch (error) {
      console.error("Error checking clock-in status:", error);
    }
  };

  const checkUserRole = async () => {
    if (!user) return;

    try {
      // Check user role from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userData && !userError) {
        if (userData.role === "admin") {
          setUserRole("admin");
        } else if (userData.role === "hr_manager") {
          setUserRole("hr_manager");
        } else if (userData.role === "hr_staff") {
          setUserRole("hr_staff");
        } else {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch total leads
      const { count: leadsCount } = await supabase
        .from("hr_leads")
        .select("*", { count: "exact", head: true });

      // Fetch total HR staff from users table
      const { count: staffCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "hr_staff");

      // Fetch WhatsApp numbers
      const { count: numbersCount } = await supabase
        .from("hr_whatsapp_numbers")
        .select("*", { count: "exact", head: true });

      // Fetch status counts
      const { data: statusData } = await supabase
        .from("hr_leads")
        .select("status");

      const statusCounts: Record<string, number> = {};
      statusData?.forEach((lead) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      });

      // Fetch recent activity
      const { data: activityData } = await supabase
        .from("hr_lead_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setStats({
        totalLeads: leadsCount || 0,
        totalStaff: staffCount || 0,
        totalNumbers: numbersCount || 0,
        statusCounts,
        recentActivity: activityData || [],
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getAvailableTabs = () => {
    if (userRole === "hr_manager" || userRole === "admin") {
      return [
        {
          id: "overview",
          label: "Overview",
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: "leads",
          label: "Leads Management",
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: "staff",
          label: "HR Staff",
          icon: <UserCheck className="w-4 h-4" />,
        },
        {
          id: "whatsapp",
          label: "WhatsApp Numbers",
          icon: <Phone className="w-4 h-4" />,
        },
        {
          id: "statuses",
          label: "Lead Statuses",
          icon: <MessageSquare className="w-4 h-4" />,
        },
        {
          id: "calendar",
          label: "Calendar",
          icon: <Calendar className="w-4 h-4" />,
        },
        {
          id: "performance",
          label: "Team Performance",
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: "daily_history",
          label: "Daily History",
          icon: <Calendar className="w-4 h-4" />,
        },
        {
          id: "live_activity",
          label: "Live Activity",
          icon: <Activity className="w-4 h-4" />,
        },
        {
          id: "targets",
          label: "Target Management",
          icon: <Target className="w-4 h-4" />,
        },
        {
          id: "alerts",
          label: "Alert Center",
          icon: <AlertCircle className="w-4 h-4" />,
        },
        {
          id: "manipulation_monitor",
          label: "Manipulation Monitor",
          icon: <Shield className="w-4 h-4" />,
        },
        {
          id: "working_hours",
          label: "Working Hours",
          icon: <Clock className="w-4 h-4" />,
        },
        {
          id: "settings",
          label: "System Settings",
          icon: <Settings className="w-4 h-4" />,
        },
      ];
    } else if (userRole === "hr_staff") {
      return [
        {
          id: "overview",
          label: "Overview",
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: "leads",
          label: "Leads Management",
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: "whatsapp",
          label: "WhatsApp Numbers",
          icon: <Phone className="w-4 h-4" />,
        },
        {
          id: "analytics",
          label: "Performance",
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          id: "daily_history",
          label: "Daily History",
          icon: <Calendar className="w-4 h-4" />,
        },
        {
          id: "working_hours",
          label: "Working Hours",
          icon: <Clock className="w-4 h-4" />,
        },
      ];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access the HR system.
          </p>
        </div>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  // Show mobile view on small screens for overview, leads, analytics, calendar
  if (
    isMobile &&
    ["overview", "leads", "analytics", "calendar"].includes(activeTab)
  ) {
    return (
      <HRMobileView
        onNavigate={(tab) => setActiveTab(tab as any)}
        activeTab={activeTab}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Clock-In Prompt */}
      {showClockInPrompt && userRole === "hr_staff" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6" />
              <div>
                <p className="font-semibold">You haven't clocked in today!</p>
                <p className="text-sm opacity-90">
                  Please clock in to start tracking your work hours.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setActiveTab("overview");
                  setShowClockInPrompt(false);
                }}
                variant="secondary"
                size="sm"
              >
                Clock In Now
              </Button>
              <Button
                onClick={() => setShowClockInPrompt(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-orange-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:w-16"
        } ${sidebarHovered && !sidebarOpen ? "lg:w-64" : ""}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-fleet-purple rounded flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div
              className={`transition-opacity duration-300 ${
                sidebarOpen || sidebarHovered
                  ? "opacity-100"
                  : "opacity-0 lg:opacity-0"
              }`}
            >
              <h1 className="text-lg font-bold text-fleet-purple whitespace-nowrap">
                HR System
              </h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {userRole === "hr_manager"
                  ? "HR Manager"
                  : userRole === "admin"
                  ? "Admin"
                  : "HR Staff"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="mt-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-fleet-purple text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                title={!sidebarOpen && !sidebarHovered ? tab.label : undefined}
              >
                <div className="flex-shrink-0">{tab.icon}</div>
                <span
                  className={`transition-opacity duration-300 whitespace-nowrap ${
                    sidebarOpen || sidebarHovered
                      ? "opacity-100"
                      : "opacity-0 lg:opacity-0"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={` px-2 hover:bg-gray-100 hidden lg:block`}
          >
            <ArrowBigRightDash className="w-5 h-5" />
          </button>
        </nav>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {availableTabs.find((tab) => tab.id === activeTab)?.label ||
                    "HR Dashboard"}
                </h1>
                <p className="text-sm text-gray-600">
                  {userRole === "hr_manager" || userRole === "admin"
                    ? "Manage HR staff, leads, and system settings"
                    : "Call your assigned leads and track daily performance"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="w-full p-4 lg:p-6">
          <div className="">
            {/* Overview Tab - Only for HR Managers and Admins */}
            {activeTab === "overview" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="space-y-6 sm:space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <Card className="bg-gradient-to-br from-fleet-purple to-purple-600 text-white border-0 shadow-lg">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-purple-100">
                              Total Leads
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-white">
                              {stats.totalLeads}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-green-100">
                              HR Staff
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-white">
                              {stats.totalStaff}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-lg">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-blue-100">
                              WhatsApp Numbers
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-white">
                              {stats.totalNumbers}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-lg">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-purple-100">
                              Active Statuses
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-white">
                              {Object.keys(stats.statusCounts).length}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lead Status Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <Card className="shadow-lg border-0">
                      <CardHeader className="bg-gradient-to-r from-fleet-purple to-purple-600 text-white rounded-t-lg">
                        <CardTitle className="text-white text-sm sm:text-base">
                          Lead Status Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4 sm:space-y-6">
                          {Object.entries(stats.statusCounts).map(
                            ([status, count]) => (
                              <div
                                key={status}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-0"
                              >
                                <span className="font-semibold text-gray-800 text-sm sm:text-base">
                                  {status}
                                </span>
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <div className="w-24 sm:w-40 bg-gray-200 rounded-full h-2 sm:h-3">
                                    <div
                                      className="bg-gradient-to-r from-fleet-purple to-purple-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                                      style={{
                                        width: `${
                                          (count / stats.totalLeads) * 100
                                        }%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm sm:text-lg font-bold text-fleet-purple w-8 sm:w-12 text-right">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                      <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
                        <CardTitle className="text-white text-sm sm:text-base">
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          {stats.recentActivity
                            .slice(0, 5)
                            .map((activity, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                              >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-fleet-purple to-purple-600 rounded-full flex items-center justify-center">
                                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                    {activity.description}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(
                                      activity.created_at
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-t-lg">
                      <CardTitle className="text-white text-sm sm:text-base">
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {userRole === "hr_manager" || userRole === "admin" ? (
                          <>
                            <Button
                              onClick={() => setActiveTab("staff")}
                              className="flex items-center gap-3 sm:gap-4 h-20 sm:h-24 bg-gradient-to-r from-fleet-purple to-purple-600 hover:from-purple-600 hover:to-fleet-purple text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-sm sm:text-lg">
                                  HR Staff
                                </div>
                                <div className="text-xs sm:text-sm opacity-90">
                                  Manage staff & settings
                                </div>
                              </div>
                            </Button>
                            <Button
                              onClick={() => setActiveTab("calendar")}
                              className="flex items-center gap-4 h-24 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-cyan-600 hover:to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-lg">
                                  Calendar View
                                </div>
                                <div className="text-sm opacity-90">
                                  View joining dates
                                </div>
                              </div>
                            </Button>
                            <Button
                              onClick={() => setActiveTab("whatsapp")}
                              className="flex items-center gap-4 h-24 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Phone className="w-6 h-6" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-lg">
                                  WhatsApp Numbers
                                </div>
                                <div className="text-sm opacity-90">
                                  Manage inquiry numbers
                                </div>
                              </div>
                            </Button>
                          </>
                        ) : userRole === "hr_staff" ? (
                          <>
                            <Button
                              onClick={() => setActiveTab("leads")}
                              className="flex items-center gap-4 h-24 bg-gradient-to-r from-fleet-purple to-purple-600 hover:from-purple-600 hover:to-fleet-purple text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-lg">
                                  My Leads
                                </div>
                                <div className="text-sm opacity-90">
                                  Manage assigned leads
                                </div>
                              </div>
                            </Button>
                            <Button
                              onClick={() => setActiveTab("whatsapp")}
                              className="flex items-center gap-4 h-24 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <MessageSquare className="w-6 h-6" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-lg">
                                  WhatsApp
                                </div>
                                <div className="text-sm opacity-90">
                                  Manage WhatsApp numbers
                                </div>
                              </div>
                            </Button>
                          </>
                        ) : null}
                        <Button className="flex items-center gap-4 h-24 bg-gradient-to-r from-orange-500 to-red-600 hover:from-red-600 hover:to-orange-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <PhoneCall className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-lg">
                              Make Call
                            </div>
                            <div className="text-sm opacity-90">
                              Call leads directly
                            </div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            {/* HR Staff Overview - Daily Stats */}
            {activeTab === "overview" && userRole === "hr_staff" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <HRStaffPortal />
              </div>
            )}

            {/* Leads Management Tab */}
            {activeTab === "leads" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                {userRole === "hr_staff" ? (
                  <HRStaffLeads />
                ) : (
                  <HRLeadsManagement />
                )}
              </div>
            )}

            {/* HR Staff Tab */}
            {activeTab === "staff" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRStaffManagement />
                </div>
              )}

            {/* WhatsApp Numbers Tab */}
            {activeTab === "whatsapp" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRWhatsAppManagement />
                </div>
              )}

            {/* Lead Statuses Tab */}
            {activeTab === "statuses" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRStatusManagement />
                </div>
              )}

            {/* Calendar Tab - For All HR Users */}
            {activeTab === "calendar" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <HRJoiningCalendar />
              </div>
            )}

            {/* WhatsApp Tab - For HR Staff */}
            {activeTab === "whatsapp" && userRole === "hr_staff" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <HRStaffWhatsApp />
              </div>
            )}

            {/* Team Performance Tab - For HR Managers and Admins */}
            {activeTab === "performance" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRPerformanceAnalyticsEnhanced />
                </div>
              )}

            {/* Daily History Tab - For HR Managers and Admins */}
            {activeTab === "daily_history" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRDailyHistory />
                </div>
              )}

            {/* Live Activity Tab - For HR Managers and Admins */}
            {activeTab === "live_activity" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRLiveActivityDashboard />
                </div>
              )}

            {/* Target Management Tab - For HR Managers and Admins */}
            {activeTab === "targets" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRTargetManagement />
                </div>
              )}

            {/* Alert Center Tab - For HR Managers and Admins */}
            {activeTab === "alerts" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRAlertCenter />
                </div>
              )}

            {/* Manipulation Monitor Tab - For HR Managers and Admins */}
            {activeTab === "manipulation_monitor" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRManipulationMonitor />
                </div>
              )}

            {/* Working Hours Tab - For HR Managers and Admins */}
            {activeTab === "working_hours" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRWorkingHours />
                </div>
              )}

            {/* System Settings Tab - For HR Managers and Admins */}
            {activeTab === "settings" &&
              (userRole === "hr_manager" || userRole === "admin") && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <HRSystemSettings />
                </div>
              )}

            {/* My Performance Tab - For HR Staff */}
            {activeTab === "analytics" && userRole === "hr_staff" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <HRStaffOverview />
              </div>
            )}

            {/* Daily History Tab - For HR Staff */}
            {activeTab === "daily_history" && userRole === "hr_staff" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <HRDailyHistory />
              </div>
            )}

            {/* Working Hours Tab - For HR Staff */}
            {activeTab === "working_hours" && userRole === "hr_staff" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <HRWorkingHours />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
