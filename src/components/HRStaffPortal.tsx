import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  PhoneCall,
  Search,
  Filter,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  created_at: string;
  last_call_date?: string;
  callback_date?: string;
  joining_date?: string;
}

interface CallStats {
  totalCalls: number;
  todayCalls: number;
  weekCalls: number;
  monthCalls: number;
  successfulCalls: number;
  missedCalls: number;
}

interface LeadStatus {
  id: string;
  name: string;
  display_name: string;
  description: string;
  color: string;
  is_active: boolean;
}

const HRStaffPortal: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("daily");
  const [callStats, setCallStats] = useState<CallStats>({
    totalCalls: 0,
    todayCalls: 0,
    weekCalls: 0,
    monthCalls: 0,
    successfulCalls: 0,
    missedCalls: 0,
  });

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchCallStats();
      fetchLeadStatuses();
    }
  }, [user, timeFilter]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_leads")
        .select("*")
        .eq("assigned_staff_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallStats = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get call activities for this staff member
      const { data: activities, error } = await supabase
        .from("hr_lead_activities")
        .select("*")
        .eq("staff_user_id", user?.id)
        .eq("activity_type", "call");

      if (error) throw error;

      const todayCalls =
        activities?.filter(
          (activity) => new Date(activity.created_at) >= startOfDay
        ).length || 0;

      const weekCalls =
        activities?.filter(
          (activity) => new Date(activity.created_at) >= startOfWeek
        ).length || 0;

      const monthCalls =
        activities?.filter(
          (activity) => new Date(activity.created_at) >= startOfMonth
        ).length || 0;

      const successfulCalls =
        activities?.filter(
          (activity) =>
            activity.description?.toLowerCase().includes("successful") ||
            activity.description?.toLowerCase().includes("answered")
        ).length || 0;

      const missedCalls =
        activities?.filter(
          (activity) =>
            activity.description?.toLowerCase().includes("missed") ||
            activity.description?.toLowerCase().includes("no answer")
        ).length || 0;

      setCallStats({
        totalCalls: activities?.length || 0,
        todayCalls,
        weekCalls,
        monthCalls,
        successfulCalls,
        missedCalls,
      });
    } catch (error) {
      console.error("Error fetching call stats:", error);
    }
  };

  const fetchLeadStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_lead_statuses")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setLeadStatuses(data || []);
    } catch (error) {
      console.error("Error fetching lead statuses:", error);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (searchTerm) {
      filtered = filtered.filter((lead) => lead.phone.includes(searchTerm));
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  const handleCall = async (lead: Lead) => {
    try {
      // Log the call attempt
      const { error } = await supabase.from("hr_lead_activities").insert([
        {
          lead_id: lead.id,
          staff_user_id: user?.id,
          activity_type: "call",
          description: `Call attempted to ${lead.phone}`,
        },
      ]);

      if (error) throw error;

      // Open phone dialer
      window.open(`tel:${lead.phone}`, "_self");

      // Refresh stats
      await fetchCallStats();
    } catch (error) {
      console.error("Error logging call:", error);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("hr_leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      // Log status change
      await supabase.from("hr_lead_activities").insert([
        {
          lead_id: leadId,
          staff_user_id: user?.id,
          activity_type: "status_change",
          description: `Status changed to ${newStatus}`,
        },
      ]);

      await fetchLeads();
      await fetchCallStats();
    } catch (error) {
      console.error("Error updating lead status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = leadStatuses.find((s) => s.name === status);
    if (statusObj) {
      // Convert hex color to Tailwind classes
      const color = statusObj.color;
      if (color === "#3b82f6") return "bg-blue-100 text-blue-800";
      if (color === "#10b981") return "bg-green-100 text-green-800";
      if (color === "#f59e0b") return "bg-yellow-100 text-yellow-800";
      if (color === "#ef4444") return "bg-red-100 text-red-800";
      if (color === "#8b5cf6") return "bg-purple-100 text-purple-800";
      if (color === "#ec4899") return "bg-pink-100 text-pink-800";
      if (color === "#6366f1") return "bg-indigo-100 text-indigo-800";
      if (color === "#6b7280") return "bg-gray-100 text-gray-800";
      if (color === "#f97316") return "bg-orange-100 text-orange-800";
      if (color === "#14b8a6") return "bg-teal-100 text-teal-800";
    }

    // Fallback to hardcoded colors for backward compatibility
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-green-100 text-green-800",
      hot_lead: "bg-orange-100 text-orange-800",
      cold_lead: "bg-gray-100 text-gray-800",
      callback: "bg-purple-100 text-purple-800",
      joined: "bg-emerald-100 text-emerald-800",
      not_interested: "bg-red-100 text-red-800",
      call_not_picked: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "joined":
        return <CheckCircle className="w-4 h-4" />;
      case "not_interested":
        return <XCircle className="w-4 h-4" />;
      case "callback":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
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
      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-fleet-purple">
            Daily Performance
          </h2>
          <p className="text-gray-600">
            Track your daily calling progress and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-fleet-purple/10 rounded-full flex items-center justify-center">
            <Phone className="w-5 h-5 text-fleet-purple" />
          </div>
        </div>
      </div> */}

      {/* Call Statistics */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Today's Calls</p>
                <p className="text-2xl font-bold">{callStats.todayCalls}</p>
              </div>
              <PhoneCall className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Successful</p>
                <p className="text-2xl font-bold">
                  {callStats.successfulCalls}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Week Calls</p>
                <p className="text-2xl font-bold">{callStats.weekCalls}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Month Calls</p>
                <p className="text-2xl font-bold">{callStats.monthCalls}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="items-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Phone className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              className="h-20  bg-gradient-to-r from-fleet-purple to-purple-600 hover:from-purple-600 hover:to-fleet-purple text-white"
              onClick={() => (window.location.href = "#performance")}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6" />
                <div className="text-start">
                  <div className="font-semibold">My Performance</div>
                  <div className="text-sm opacity-90">
                    View your performance
                  </div>
                </div>
              </div>
            </Button>
            <Button
              className="h-20 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white"
              onClick={() => (window.location.href = "#my-leads")}
            >
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6" />
                <div className="text-start">
                  <div className="font-semibold">My Leads</div>
                  <div className="text-sm opacity-90">View your leads</div>
                </div>
              </div>
            </Button>
            <Button
              className="h-20 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white"
              onClick={() => (window.location.href = "#whatsapp")}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6" />
                <div className="text-start">
                  <div className="font-semibold">WhatsApp</div>
                  <div className="text-sm opacity-90">
                    Manage WhatsApp numbers
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRStaffPortal;
