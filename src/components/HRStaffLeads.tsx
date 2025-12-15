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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  PhoneCall,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageCircle,
  Timer,
  Save,
  Calendar,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { logActivity } from "@/services/hrActivityTracker";

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

interface LeadStatus {
  id: string;
  name: string;
  display_name: string;
  description: string;
  color: string;
  is_active: boolean;
}

const HRStaffLeads: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection state for export
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Call tracking state
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [callData, setCallData] = useState({
    name: "",
    phone: "",
    status: "",
    calledDate: "",
    callbackDate: "",
    joiningDate: "",
    notes: "",
    source: "",
  });

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchLeadStatuses();
      // Log page view activity
      logActivity(user.id, "page_viewed", { page: "leads" });
    }
  }, [user]);

  useEffect(() => {
    filterLeads();
    // Reset to first page when search or filter changes
    setCurrentPage(1);
  }, [leads, searchTerm, statusFilter]);

  // Reset selection when filtered leads change
  useEffect(() => {
    setSelectedLeads(new Set());
    setSelectAll(false);
  }, [filteredLeads]);

  // Timer effect for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStartTime && isCallDialogOpen) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor(
          (now.getTime() - callStartTime.getTime()) / 1000
        );
        setCallDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStartTime, isCallDialogOpen]);

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
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.phone.includes(searchTerm) ||
          (lead.name && lead.name.toLowerCase().includes(searchLower))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  // Calculate pagination values
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const handleCall = async (lead: Lead) => {
    setSelectedLead(lead);
    setCallData({
      name: lead.name || "",
      phone: lead.phone,
      status: lead.status,
      calledDate: new Date().toISOString().split("T")[0],
      callbackDate: "",
      joiningDate: "",
      notes: "",
      source: "",
    });
    setCallStartTime(new Date());
    setCallDuration(0);
    setIsCallDialogOpen(true);
    
    // Log call started activity
    if (user) {
      await logActivity(user.id, "call_started", {
        lead_id: lead.id,
        phone: lead.phone,
      });
    }
  };

  const handleWhatsAppChat = (lead: Lead) => {
    const message = `Hi ${
      lead.name || "there"
    }, I'm calling from our HR team regarding your application.`;
    const whatsappUrl = `https://wa.me/${lead.phone.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const saveCallData = async () => {
    if (!selectedLead || isSaving) return;

    try {
      setIsSaving(true);

      // Save call data to database
      const { error: callError } = await supabase
        .from("hr_call_tracking")
        .insert([
          {
            lead_id: selectedLead.id,
            staff_user_id: user?.id,
            name: callData.name,
            phone: callData.phone,
            status: callData.status,
            called_date: callData.calledDate,
            callback_date: callData.callbackDate || null,
            joining_date: callData.joiningDate || null,
            notes: callData.notes,
            source: callData.source,
            call_duration: callDuration,
            created_at: new Date().toISOString(),
          },
        ]);

      if (callError) throw callError;

      // Update lead status and joining date
      const updateData: any = {};

      if (callData.status !== selectedLead.status) {
        updateData.status = callData.status;
      }

      if (callData.joiningDate) {
        updateData.joining_date = callData.joiningDate;
      }

      if (callData.callbackDate) {
        updateData.callback_date = callData.callbackDate;
      }

      // Update lead if there are changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("hr_leads")
          .update(updateData)
          .eq("id", selectedLead.id);

        if (updateError) {
          console.error("Error updating lead:", updateError);
        }
      }

      // Log the call activity
      await supabase.from("hr_lead_activities").insert([
        {
          lead_id: selectedLead.id,
          staff_user_id: user?.id,
          activity_type: "call_completed",
          description: `Call completed - Duration: ${formatTime(callDuration)}`,
        },
      ]);

      // Log call completed activity
      if (user) {
        await logActivity(user.id, "call_completed", {
          lead_id: selectedLead.id,
          duration: callDuration,
          status: callData.status,
        });
      }

      // Trigger daily stats aggregation
      try {
        const { error: statsError } = await supabase.rpc("aggregate_daily_stats", {
          p_staff_user_id: user?.id,
          p_date: callData.calledDate,
        });

        if (statsError) {
          console.error("Error aggregating daily stats:", statsError);
        }
      } catch (statsErr) {
        console.error("Error calling aggregate_daily_stats:", statsErr);
      }

      // Show success message briefly
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsCallDialogOpen(false);
        setCallStartTime(null);
        setCallDuration(0);
        fetchLeads();
      }, 1500);
    } catch (error) {
      console.error("Error saving call data:", error);
    } finally {
      setIsSaving(false);
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

      // Log activity
      if (user) {
        await logActivity(user.id, "status_updated", {
          lead_id: leadId,
          status_to: newStatus,
        });
      }

      await fetchLeads();
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

  // Selection handlers
  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect only current page leads
      const newSelected = new Set(selectedLeads);
      paginatedLeads.forEach((lead) => {
        newSelected.delete(lead.id);
      });
      setSelectedLeads(newSelected);
      setSelectAll(false);
    } else {
      // Select all leads on current page
      const newSelected = new Set(selectedLeads);
      paginatedLeads.forEach((lead) => {
        newSelected.add(lead.id);
      });
      setSelectedLeads(newSelected);
      setSelectAll(true);
    }
  };

  // Update selectAll state based on current page selection
  useEffect(() => {
    const allPageSelected = paginatedLeads.every((lead) =>
      selectedLeads.has(lead.id)
    );
    setSelectAll(allPageSelected && paginatedLeads.length > 0);
  }, [selectedLeads, paginatedLeads]);

  // Export functions
  const exportPhoneNumbers = () => {
    if (selectedLeads.size === 0) {
      toast.error("Please select at least one lead to export");
      return;
    }

    const selectedLeadsData = filteredLeads.filter((lead) =>
      selectedLeads.has(lead.id)
    );
    const phoneNumbers = selectedLeadsData.map((lead) => lead.phone).join("\n");

    // Create and download file
    const blob = new Blob([phoneNumbers], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `phone_numbers_${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedLeads.size} phone numbers successfully`);
  };

  const exportAsCSV = () => {
    if (selectedLeads.size === 0) {
      toast.error("Please select at least one lead to export");
      return;
    }

    const selectedLeadsData = filteredLeads.filter((lead) =>
      selectedLeads.has(lead.id)
    );
    const csvContent = [
      "Phone Number,Name,Status,Last Call Date,Callback Date,Joining Date",
      ...selectedLeadsData.map(
        (lead) =>
          `"${lead.phone}","${lead.name || ""}","${lead.status}","${
            lead.last_call_date || ""
          }","${lead.callback_date || ""}","${lead.joining_date || ""}"`
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedLeads.size} leads as CSV successfully`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by phone number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-gray-50 border-0 rounded-xl text-base focus:bg-white transition-all"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 bg-gray-50 border-0 rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {leadStatuses.map((status) => (
                <SelectItem key={status.id} value={status.name}>
                  {status.display_name || status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <div className="text-2xl font-bold">{filteredLeads.length}</div>
          <div className="text-xs opacity-90">Total Leads</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <div className="text-2xl font-bold">
            {filteredLeads.filter((l) => l.status === "joined").length}
          </div>
          <div className="text-xs opacity-90">Joined</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
          <div className="text-2xl font-bold">
            {filteredLeads.filter((l) => l.status === "hot_lead").length}
          </div>
          <div className="text-xs opacity-90">Hot Leads</div>
        </div>
      </div>

      {/* Export Controls */}
      {/* {filteredLeads.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedLeads.size} selected)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={exportPhoneNumbers}
                disabled={selectedLeads.size === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Phone Numbers
              </Button>
              <Button
                onClick={exportAsCSV}
                disabled={selectedLeads.size === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      )} */}

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-2">No leads found</p>
            <p className="text-gray-500 text-sm">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Your assigned leads will appear here"}
            </p>
          </div>
        ) : (
          paginatedLeads.map((lead) => (
            <div
              key={lead.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all ${
                selectedLeads.has(lead.id)
                  ? "ring-2 ring-purple-500 bg-purple-50"
                  : ""
              }`}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {lead.phone.slice(-2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">
                        {lead.phone}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(lead.status)} border-0`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(lead.status)}
                      <span className="text-xs font-medium">
                        {leadStatuses.find((s) => s.name === lead.status)
                          ?.display_name ||
                          lead.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </Badge>
                </div>

                {/* Info */}
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Last:{" "}
                      {lead.last_call_date
                        ? new Date(lead.last_call_date).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                  {lead.callback_date && (
                    <div className="flex items-center gap-1.5 text-orange-600">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Callback:{" "}
                        {new Date(lead.callback_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCall(lead)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl h-11 font-medium shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                  <Button
                    onClick={() => handleWhatsAppChat(lead)}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl h-11 px-4 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {filteredLeads.length > itemsPerPage && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredLeads.length)} of{" "}
              {filteredLeads.length} leads
            </div>

            <div className="flex items-center gap-2">
              {/* Items per page selector */}
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-gray-600">Per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-20 bg-gray-50 border-0 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Previous button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-9 h-9 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              {/* Next button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="h-9"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Call Tracking Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="space-y-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <div>
                <div>Call Tracking</div>
                <div className="text-sm font-normal text-gray-500">
                  {selectedLead?.phone}
                </div>
              </div>
            </DialogTitle>

            <Button
              onClick={() => window.open(`tel:${selectedLead?.phone}`, "_self")}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl h-14 text-base font-semibold shadow-lg"
            >
              <PhoneCall className="w-5 h-5 mr-2" />
              Start Call Now
            </Button>

            {isSaving && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">
                    Saving your call data...
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-900">Success!</div>
                    <div className="text-sm text-green-700">
                      Call data saved successfully
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Enhanced Timer Display */}
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 text-center shadow-lg">
              <div className="text-sm text-white/80 mb-2 font-medium uppercase tracking-wide">
                Call Duration
              </div>
              <div className="text-5xl font-bold text-white font-mono mb-2">
                {formatTime(callDuration)}
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm">Recording...</span>
              </div>
            </div>

            {/* Enhanced Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={callData.name}
                    onChange={(e) =>
                      setCallData({ ...callData, name: e.target.value })
                    }
                    placeholder="Enter name"
                    className="h-12 rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={callData.phone}
                    onChange={(e) =>
                      setCallData({ ...callData, phone: e.target.value })
                    }
                    placeholder="Phone number"
                    className="h-12 rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="status"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Status
                  </Label>
                  <Select
                    value={callData.status}
                    onValueChange={(value) =>
                      setCallData({ ...callData, status: value })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-0">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.name}>
                          {status.display_name || status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="source"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Source
                  </Label>
                  <Select
                    value={callData.source}
                    onValueChange={(value) =>
                      setCallData({ ...callData, source: value })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-0">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="calledDate"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Called Date
                  </Label>
                  <Input
                    id="calledDate"
                    type="date"
                    value={callData.calledDate}
                    onChange={(e) =>
                      setCallData({ ...callData, calledDate: e.target.value })
                    }
                    className="h-12 rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="callbackDate"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Callback Date
                  </Label>
                  <Input
                    id="callbackDate"
                    type="date"
                    value={callData.callbackDate}
                    onChange={(e) =>
                      setCallData({ ...callData, callbackDate: e.target.value })
                    }
                    className="h-12 rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="joiningDate"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Joining Date
                  </Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={callData.joiningDate}
                    onChange={(e) =>
                      setCallData({ ...callData, joiningDate: e.target.value })
                    }
                    className="h-12 rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="notes"
                  className="text-sm font-semibold text-gray-700"
                >
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={callData.notes}
                  onChange={(e) =>
                    setCallData({ ...callData, notes: e.target.value })
                  }
                  placeholder="Add call notes, observations, or important details..."
                  rows={4}
                  className="resize-none rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCallDialogOpen(false)}
              disabled={isSaving}
              className="w-full sm:w-auto h-12 rounded-xl border-2 font-semibold disabled:opacity-50 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={saveCallData}
              disabled={isSaving || saveSuccess}
              className="w-full sm:flex-1 h-12 rounded-xl font-semibold disabled:opacity-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving Data...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Saved Successfully!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Call Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRStaffLeads;
