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
  Phone,
  Clock,
  TrendingUp,
  Users,
  Target,
  Award,
  Activity,
  Percent,
  UserCheck,
  PhoneCall,
  AlertCircle,
  TrendingDown,
  BarChart3,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface StaffPerformance {
  staff_user_id: string;
  staff_name: string;
  staff_phone: string;
  
  // Call metrics
  total_calls: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  
  // Time metrics
  total_call_duration: number;
  avg_call_duration: number;
  
  // Lead metrics
  total_leads_assigned: number;
  leads_contacted: number;
  leads_pending: number;
  
  // Conversion metrics
  hot_leads: number;
  joined_count: number;
  conversion_rate: number;
  
  // Response metrics
  avg_response_time_hours: number;
  callback_completion_rate: number;
  
  // Quality metrics
  quality_score: number;
  efficiency_score: number;
  
  // Status breakdown
  status_breakdown: { [key: string]: number };
  
  // Source breakdown
  source_breakdown: { [key: string]: number };
}

interface RetentionMetrics {
  total_joined: number;
  active_after_30_days: number;
  active_after_60_days: number;
  active_after_90_days: number;
  retention_rate_30: number;
  retention_rate_60: number;
  retention_rate_90: number;
  churn_rate: number;
}

interface ConversionFunnel {
  new_leads: number;
  contacted: number;
  hot_leads: number;
  joined: number;
  contact_rate: number;
  hot_lead_rate: number;
  conversion_rate: number;
}

interface TeamMetrics {
  total_staff: number;
  active_staff_today: number;
  total_leads: number;
  total_calls_today: number;
  avg_calls_per_staff: number;
  best_performer: string;
  team_conversion_rate: number;
  team_efficiency_score: number;
}

const HREnhancedAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("week");
  const [selectedStaff, setSelectedStaff] = useState("all");
  
  // Main data states
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [retentionMetrics, setRetentionMetrics] = useState<RetentionMetrics | null>(null);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  
  // Staff list for filter
  const [staffList, setStaffList] = useState<{ id: string; name: string; phone: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchAllMetrics();
    }
  }, [user, timeFilter, selectedStaff]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStaffList(),
        fetchStaffPerformance(),
        fetchRetentionMetrics(),
        fetchConversionFunnel(),
        fetchTeamMetrics(),
      ]);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone_number")
        .eq("role", "hr_staff")
        .order("name", { ascending: true });

      if (error) throw error;
      setStaffList(data?.map(s => ({ id: s.id, name: s.name || s.phone_number, phone: s.phone_number })) || []);
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  };

  const fetchStaffPerformance = async () => {
    try {
      const { startDate } = getDateRange();
      
      // Fetch all staff members
      const { data: staffData, error: staffError } = await supabase
        .from("users")
        .select("id, name, phone_number")
        .eq("role", "hr_staff");

      if (staffError) throw staffError;

      const performanceData: StaffPerformance[] = [];

      for (const staff of staffData || []) {
        // Skip if filtering for specific staff
        if (selectedStaff !== "all" && staff.id !== selectedStaff) continue;

        // Get assigned leads count
        const { count: totalLeads } = await supabase
          .from("hr_leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_staff_user_id", staff.id);

        // Get leads by status
        const { data: leadsData } = await supabase
          .from("hr_leads")
          .select("status, created_at, callback_date")
          .eq("assigned_staff_user_id", staff.id);

        // Get call tracking data
        const { data: callsData } = await supabase
          .from("hr_call_tracking")
          .select("*")
          .eq("staff_user_id", staff.id)
          .gte("called_date", startDate.toISOString().split("T")[0]);

        // Calculate status breakdown
        const statusBreakdown: { [key: string]: number } = {};
        const contactedLeads = new Set<string>();
        
        leadsData?.forEach((lead) => {
          statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1;
        });

        // Get unique contacted leads
        callsData?.forEach((call) => {
          if (call.lead_id) {
            contactedLeads.add(call.lead_id);
          }
        });

        // Calculate source breakdown
        const sourceBreakdown: { [key: string]: number } = {};
        callsData?.forEach((call) => {
          if (call.source) {
            sourceBreakdown[call.source] = (sourceBreakdown[call.source] || 0) + 1;
          }
        });

        // Time-based calls
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const callsToday = callsData?.filter(
          (call) => new Date(call.called_date) >= today
        ).length || 0;

        const callsThisWeek = callsData?.filter(
          (call) => new Date(call.called_date) >= weekAgo
        ).length || 0;

        // Calculate durations
        const totalDuration = callsData?.reduce((sum, call) => sum + (call.call_duration || 0), 0) || 0;
        const avgDuration = callsData && callsData.length > 0 ? totalDuration / callsData.length : 0;

        // Calculate conversions
        const hotLeads = statusBreakdown["hot_lead"] || 0;
        const joined = statusBreakdown["joined"] || 0;
        const conversionRate = totalLeads && totalLeads > 0 ? (joined / totalLeads) * 100 : 0;

        // Calculate callback completion rate
        const leadsWithCallbacks = leadsData?.filter((lead) => lead.callback_date).length || 0;
        const completedCallbacks = callsData?.filter((call) => 
          call.status === "callback" || call.callback_date
        ).length || 0;
        const callbackCompletionRate = leadsWithCallbacks > 0 ? (completedCallbacks / leadsWithCallbacks) * 100 : 0;

        // Calculate average response time (from lead creation to first call)
        let totalResponseTime = 0;
        let responseCount = 0;
        
        for (const lead of leadsData || []) {
          const firstCall = callsData?.find((call) => call.lead_id === lead.id);
          if (firstCall) {
            const leadCreated = new Date(lead.created_at).getTime();
            const callMade = new Date(firstCall.created_at).getTime();
            const responseTimeHours = (callMade - leadCreated) / (1000 * 60 * 60);
            totalResponseTime += responseTimeHours;
            responseCount++;
          }
        }
        
        const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

        // Calculate quality score (0-100)
        // Based on: conversion rate (40%), callback completion (30%), response time (30%)
        const responseTimeScore = Math.max(0, 100 - (avgResponseTime * 2)); // Lower is better
        const qualityScore = Math.round(
          (conversionRate * 0.4) + 
          (callbackCompletionRate * 0.3) + 
          (responseTimeScore * 0.3)
        );

        // Calculate efficiency score (calls per lead ratio, avg duration)
        const callsPerLead = totalLeads && totalLeads > 0 ? (callsData?.length || 0) / totalLeads : 0;
        const efficiencyScore = Math.round(
          Math.min(100, (callsPerLead * 20) + (avgDuration > 0 ? Math.min(50, avgDuration / 10) : 0))
        );

        performanceData.push({
          staff_user_id: staff.id,
          staff_name: staff.name || staff.phone_number,
          staff_phone: staff.phone_number,
          total_calls: callsData?.length || 0,
          calls_today: callsToday,
          calls_this_week: callsThisWeek,
          calls_this_month: callsData?.length || 0,
          total_call_duration: totalDuration,
          avg_call_duration: avgDuration,
          total_leads_assigned: totalLeads || 0,
          leads_contacted: contactedLeads.size,
          leads_pending: (totalLeads || 0) - contactedLeads.size,
          hot_leads: hotLeads,
          joined_count: joined,
          conversion_rate: conversionRate,
          avg_response_time_hours: avgResponseTime,
          callback_completion_rate: callbackCompletionRate,
          quality_score: qualityScore,
          efficiency_score: efficiencyScore,
          status_breakdown: statusBreakdown,
          source_breakdown: sourceBreakdown,
        });
      }

      // Sort by quality score descending
      performanceData.sort((a, b) => b.quality_score - a.quality_score);
      setStaffPerformance(performanceData);
    } catch (error) {
      console.error("Error fetching staff performance:", error);
    }
  };

  const fetchRetentionMetrics = async () => {
    try {
      // Get all joined leads
      const { data: joinedLeads, error } = await supabase
        .from("hr_leads")
        .select("joining_date, status")
        .eq("status", "joined");

      if (error) throw error;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const totalJoined = joinedLeads?.length || 0;

      // For retention, we would need a separate "employee_status" or "left_date" field
      // For now, we'll calculate based on joining dates and assume active if still "joined" status
      const joinedThirtyDaysAgo = joinedLeads?.filter(
        (lead) => lead.joining_date && new Date(lead.joining_date) <= thirtyDaysAgo
      ).length || 0;

      const joinedSixtyDaysAgo = joinedLeads?.filter(
        (lead) => lead.joining_date && new Date(lead.joining_date) <= sixtyDaysAgo
      ).length || 0;

      const joinedNinetyDaysAgo = joinedLeads?.filter(
        (lead) => lead.joining_date && new Date(lead.joining_date) <= ninetyDaysAgo
      ).length || 0;

      // Calculate retention rates (assuming all "joined" status are still active)
      const retention30 = joinedThirtyDaysAgo > 0 ? (joinedThirtyDaysAgo / joinedThirtyDaysAgo) * 100 : 100;
      const retention60 = joinedSixtyDaysAgo > 0 ? (joinedSixtyDaysAgo / joinedSixtyDaysAgo) * 100 : 100;
      const retention90 = joinedNinetyDaysAgo > 0 ? (joinedNinetyDaysAgo / joinedNinetyDaysAgo) * 100 : 100;

      setRetentionMetrics({
        total_joined: totalJoined,
        active_after_30_days: joinedThirtyDaysAgo,
        active_after_60_days: joinedSixtyDaysAgo,
        active_after_90_days: joinedNinetyDaysAgo,
        retention_rate_30: retention30,
        retention_rate_60: retention60,
        retention_rate_90: retention90,
        churn_rate: 100 - retention90,
      });
    } catch (error) {
      console.error("Error fetching retention metrics:", error);
    }
  };

  const fetchConversionFunnel = async () => {
    try {
      const { startDate } = getDateRange();

      // Get leads by status
      const { data: allLeads, error } = await supabase
        .from("hr_leads")
        .select("status")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      const newLeads = allLeads?.filter((l) => l.status === "new").length || 0;
      const contacted = allLeads?.filter((l) => 
        ["contacted", "hot_lead", "callback", "joined"].includes(l.status)
      ).length || 0;
      const hotLeads = allLeads?.filter((l) => 
        ["hot_lead", "joined"].includes(l.status)
      ).length || 0;
      const joined = allLeads?.filter((l) => l.status === "joined").length || 0;

      const total = allLeads?.length || 0;
      const contactRate = total > 0 ? (contacted / total) * 100 : 0;
      const hotLeadRate = contacted > 0 ? (hotLeads / contacted) * 100 : 0;
      const conversionRate = total > 0 ? (joined / total) * 100 : 0;

      setConversionFunnel({
        new_leads: newLeads,
        contacted,
        hot_leads: hotLeads,
        joined,
        contact_rate: contactRate,
        hot_lead_rate: hotLeadRate,
        conversion_rate: conversionRate,
      });
    } catch (error) {
      console.error("Error fetching conversion funnel:", error);
    }
  };

  const fetchTeamMetrics = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get total staff count
      const { count: totalStaff } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "hr_staff");

      // Get staff who made calls today
      const { data: todayCalls } = await supabase
        .from("hr_call_tracking")
        .select("staff_user_id")
        .gte("called_date", today.toISOString().split("T")[0]);

      const activeStaffToday = new Set(todayCalls?.map((c) => c.staff_user_id)).size;

      // Get total leads
      const { count: totalLeads } = await supabase
        .from("hr_leads")
        .select("*", { count: "exact", head: true });

      // Get calls today count
      const totalCallsToday = todayCalls?.length || 0;

      // Calculate team averages
      const avgCallsPerStaff = activeStaffToday > 0 ? totalCallsToday / activeStaffToday : 0;

      // Get best performer (highest quality score)
      const bestPerformer = staffPerformance.length > 0 ? staffPerformance[0].staff_name : "N/A";

      // Calculate team conversion rate
      const { data: allLeads } = await supabase
        .from("hr_leads")
        .select("status");
      
      const joinedCount = allLeads?.filter((l) => l.status === "joined").length || 0;
      const teamConversionRate = (allLeads?.length || 0) > 0 ? (joinedCount / (allLeads?.length || 1)) * 100 : 0;

      // Calculate team efficiency score (average of all staff)
      const teamEfficiencyScore = staffPerformance.length > 0
        ? staffPerformance.reduce((sum, staff) => sum + staff.efficiency_score, 0) / staffPerformance.length
        : 0;

      setTeamMetrics({
        total_staff: totalStaff || 0,
        active_staff_today: activeStaffToday,
        total_leads: totalLeads || 0,
        total_calls_today: totalCallsToday,
        avg_calls_per_staff: avgCallsPerStaff,
        best_performer: bestPerformer,
        team_conversion_rate: teamConversionRate,
        team_efficiency_score: teamEfficiencyScore,
      });
    } catch (error) {
      console.error("Error fetching team metrics:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-blue-600 bg-blue-100";
    if (score >= 40) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4" />;
    if (score >= 60) return <Activity className="w-4 h-4" />;
    if (score >= 40) return <AlertCircle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-fleet-purple">
            Enhanced Performance Analytics
          </h2>
          <p className="text-gray-600">
            Comprehensive staff performance, retention, and conversion tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-48">
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
          <Button onClick={fetchAllMetrics} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Team Overview Cards */}
      {teamMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Active Staff Today</p>
                  <p className="text-3xl font-bold">
                    {teamMetrics.active_staff_today}/{teamMetrics.total_staff}
                  </p>
                </div>
                <Users className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Avg Calls/Staff</p>
                  <p className="text-3xl font-bold">
                    {teamMetrics.avg_calls_per_staff.toFixed(1)}
                  </p>
                </div>
                <PhoneCall className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Team Conversion</p>
                  <p className="text-3xl font-bold">
                    {teamMetrics.team_conversion_rate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Best Performer</p>
                  <p className="text-xl font-bold truncate">
                    {teamMetrics.best_performer}
                  </p>
                </div>
                <Award className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Retention & Conversion Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Metrics */}
        {retentionMetrics && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Customer Retention Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Joined</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {retentionMetrics.total_joined}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">30 Days Retention</span>
                      <span className="text-sm font-bold text-green-600">
                        {retentionMetrics.retention_rate_30.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                        style={{ width: `${retentionMetrics.retention_rate_30}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">60 Days Retention</span>
                      <span className="text-sm font-bold text-blue-600">
                        {retentionMetrics.retention_rate_60.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                        style={{ width: `${retentionMetrics.retention_rate_60}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">90 Days Retention</span>
                      <span className="text-sm font-bold text-purple-600">
                        {retentionMetrics.retention_rate_90.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                        style={{ width: `${retentionMetrics.retention_rate_90}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Churn Rate</p>
                      <p className="text-2xl font-bold text-red-700">
                        {retentionMetrics.churn_rate.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversion Funnel */}
        {conversionFunnel && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">New Leads</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {conversionFunnel.new_leads}
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex justify-center my-2">
                    <div className="text-center px-3 py-1 bg-green-100 rounded-full">
                      <span className="text-xs font-bold text-green-700">
                        {conversionFunnel.contact_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-300">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Contacted</p>
                      <p className="text-2xl font-bold text-green-900">
                        {conversionFunnel.contacted}
                      </p>
                    </div>
                    <Phone className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex justify-center my-2">
                    <div className="text-center px-3 py-1 bg-orange-100 rounded-full">
                      <span className="text-xs font-bold text-orange-700">
                        {conversionFunnel.hot_lead_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Hot Leads</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {conversionFunnel.hot_leads}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="flex justify-center my-2">
                    <div className="text-center px-3 py-1 bg-purple-100 rounded-full">
                      <span className="text-xs font-bold text-purple-700">
                        {conversionFunnel.conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Joined</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {conversionFunnel.joined}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">Rank</TableHead>
                  <TableHead className="font-bold">Staff Member</TableHead>
                  <TableHead className="font-bold text-center">Quality Score</TableHead>
                  <TableHead className="font-bold text-center">Efficiency</TableHead>
                  <TableHead className="font-bold text-center">Conversion %</TableHead>
                  <TableHead className="font-bold text-center">Total Calls</TableHead>
                  <TableHead className="font-bold text-center">Calls Today</TableHead>
                  <TableHead className="font-bold text-center">Leads</TableHead>
                  <TableHead className="font-bold text-center">Contacted</TableHead>
                  <TableHead className="font-bold text-center">Joined</TableHead>
                  <TableHead className="font-bold text-center">Avg Duration</TableHead>
                  <TableHead className="font-bold text-center">Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerformance.map((staff, index) => (
                  <TableRow key={staff.staff_user_id} className={index < 3 ? "bg-yellow-50" : ""}>
                    <TableCell className="font-bold">
                      {index === 0 && <span className="text-yellow-600">🥇</span>}
                      {index === 1 && <span className="text-gray-400">🥈</span>}
                      {index === 2 && <span className="text-orange-600">🥉</span>}
                      {index > 2 && `#${index + 1}`}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold text-gray-900">{staff.staff_name}</div>
                        <div className="text-xs text-gray-500">{staff.staff_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${getScoreColor(staff.quality_score)} font-bold`}>
                        {getScoreIcon(staff.quality_score)}
                        <span className="ml-1">{staff.quality_score}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${getScoreColor(staff.efficiency_score)} font-bold`}>
                        {staff.efficiency_score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-green-600">
                      {staff.conversion_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">{staff.total_calls}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{staff.calls_today}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{staff.total_leads_assigned}</TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">
                      {staff.leads_contacted}
                    </TableCell>
                    <TableCell className="text-center text-green-600 font-bold">
                      {staff.joined_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDuration(Math.round(staff.avg_call_duration))}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={staff.avg_response_time_hours < 24 ? "text-green-600" : "text-orange-600"}>
                        {staff.avg_response_time_hours.toFixed(1)}h
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {staffPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                      No performance data available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status & Source Breakdown */}
      {staffPerformance.length > 0 && selectedStaff !== "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(staffPerformance[0].status_breakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700 capitalize">
                      {status.replace("_", " ")}
                    </span>
                    <Badge variant="outline" className="font-bold">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Source Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(staffPerformance[0].source_breakdown).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700 capitalize">
                      {source}
                    </span>
                    <Badge variant="outline" className="font-bold">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HREnhancedAnalytics;

