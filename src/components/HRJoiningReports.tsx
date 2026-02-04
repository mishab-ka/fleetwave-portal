import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  UserPlus,
  Phone,
  User,
  Loader2,
  AlertCircle,
  Search,
  XCircle,
} from "lucide-react";
import {
  format,
  parseISO,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
} from "date-fns";

type DateFilterType = "today" | "tomorrow" | "this_week" | "this_month" | "all";

interface JoiningLead {
  id: string;
  name: string;
  phone: string;
  joining_date: string;
  status: string;
  source: string;
  assigned_staff_user_id: string | null;
  staff_name?: string;
}

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 10) return `+91${digits.slice(-10)}`;
  return input;
}

function isDateInRange(
  joiningDateStr: string,
  filter: DateFilterType
): boolean {
  const date = parseISO(joiningDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      return isSameDay(date, today);
    case "tomorrow": {
      const tomorrow = addDays(today, 1);
      return isSameDay(date, tomorrow);
    }
    case "this_week": {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      return date >= weekStart && date <= weekEnd;
    }
    case "this_month": {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      return date >= monthStart && date <= monthEnd;
    }
    case "all":
      return true;
    default:
      return true;
  }
}

const HRJoiningReports: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allLeads, setAllLeads] = useState<JoiningLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsJoined, setMarkingAsJoined] = useState<string | null>(null);
  const [markingAsNotJoined, setMarkingAsNotJoined] = useState<string | null>(
    null
  );

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [showAllConfirm, setShowAllConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Lead form state
  const [addLeadName, setAddLeadName] = useState("");
  const [addLeadPhone, setAddLeadPhone] = useState("");
  const [existingLead, setExistingLead] = useState<{
    id: string;
    name: string;
    phone: string;
    status: string;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from("hr_leads")
        .select("*")
        .not("joining_date", "is", null)
        .in("status", ["conform", "not_joined"])
        .order("joining_date", { ascending: true });

      if (error) throw error;

      const staffIds = [
        ...new Set(
          (leads || [])
            .map((l: any) => l.assigned_staff_user_id)
            .filter(Boolean)
        ),
      ];
      const staffNames: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", staffIds);
        staffData?.forEach((s: any) => {
          staffNames[s.id] = s.name;
        });
      }

      setAllLeads(
        (leads || []).map((lead: any) => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone || lead.phone_number,
          joining_date: lead.joining_date,
          status: lead.status,
          source: lead.source || "Unknown",
          assigned_staff_user_id: lead.assigned_staff_user_id,
          staff_name: staffNames[lead.assigned_staff_user_id] || "Unknown",
        }))
      );
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error",
        description: "Failed to load joining reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    let result = allLeads;

    // Date filter (skip if Show All is on)
    if (!showAllConfirm) {
      result = result.filter((lead) =>
        isDateInRange(lead.joining_date, dateFilter)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (lead) =>
          (lead.name || "").toLowerCase().includes(q) ||
          (lead.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    }

    return result;
  }, [allLeads, dateFilter, showAllConfirm, searchQuery]);

  const markAsJoined = async (leadId: string) => {
    setMarkingAsJoined(leadId);
    try {
      const { error: updateError } = await supabase
        .from("hr_leads")
        .update({ status: "joined" })
        .eq("id", leadId);

      if (updateError) throw updateError;

      await supabase.from("hr_lead_activities").insert([
        {
          lead_id: leadId,
          staff_user_id: user?.id,
          activity_type: "status_change",
          description: "Marked as joined from Joining Reports",
        },
      ]);

      toast({
        title: "Success",
        description: "Lead marked as joined successfully!",
      });
      await fetchLeads();
      setExistingLead(null);
      setAddLeadName("");
      setAddLeadPhone("");
    } catch (error) {
      console.error("Error marking as joined:", error);
      toast({
        title: "Error",
        description: "Failed to mark lead as joined",
        variant: "destructive",
      });
    } finally {
      setMarkingAsJoined(null);
    }
  };

  const markAsNotJoined = async (leadId: string) => {
    setMarkingAsNotJoined(leadId);
    try {
      const { error: updateError } = await supabase
        .from("hr_leads")
        .update({ status: "not_joined" })
        .eq("id", leadId);

      if (updateError) throw updateError;

      await supabase.from("hr_lead_activities").insert([
        {
          lead_id: leadId,
          staff_user_id: user?.id,
          activity_type: "status_change",
          description: "Marked as not joined from Joining Reports",
        },
      ]);

      toast({
        title: "Success",
        description: "Lead marked as not joined.",
      });
      await fetchLeads();
    } catch (error) {
      console.error("Error marking as not joined:", error);
      toast({
        title: "Error",
        description: "Failed to mark lead as not joined",
        variant: "destructive",
      });
    } finally {
      setMarkingAsNotJoined(null);
    }
  };

  const lookupLeadByPhone = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    const digitsOnly = normalized.replace(/\D/g, "").slice(-10);
    if (digitsOnly.length < 10) {
      setExistingLead(null);
      return;
    }

    setLookupLoading(true);
    setExistingLead(null);
    try {
      const variants = [
        normalized,
        `91${digitsOnly}`,
        digitsOnly,
        `+91${digitsOnly}`,
      ];

      const { data, error } = await supabase
        .from("hr_leads")
        .select("id, name, phone, status")
        .in("phone", variants)
        .limit(1);

      if (error) throw error;

      const lead = Array.isArray(data) ? data[0] : data;
      if (lead) {
        setExistingLead(lead);
        setAddLeadName(lead.name || "");
      } else {
        setExistingLead(null);
      }
    } catch (error) {
      console.error("Error looking up lead:", error);
      setExistingLead(null);
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!addLeadPhone || addLeadPhone.replace(/\D/g, "").length < 10) {
      setExistingLead(null);
      return;
    }
    const timer = setTimeout(() => {
      lookupLeadByPhone(addLeadPhone);
    }, 400);
    return () => clearTimeout(timer);
  }, [addLeadPhone, lookupLeadByPhone]);

  const handleAddLeadSubmit = async () => {
    const name = addLeadName.trim();
    const phone = normalizePhone(addLeadPhone);

    if (!phone || phone.length < 12) {
      toast({
        title: "Invalid phone",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    if (existingLead) {
      if (existingLead.status === "joined") {
        toast({
          title: "Already joined",
          description: "This lead is already marked as joined",
        });
        return;
      }
      await markAsJoined(existingLead.id);
      return;
    }

    setSubmitLoading(true);
    try {
      let assignedStaffId: string | null = null;
      const { data: staffAssignments } = await supabase
        .from("hr_staff_assignments")
        .select("hr_staff_user_id")
        .eq("hr_manager_user_id", user?.id)
        .eq("is_active", true);

      if (staffAssignments && staffAssignments.length > 0) {
        assignedStaffId = staffAssignments[0].hr_staff_user_id;
      } else {
        const { data: hrStaff } = await supabase
          .from("users")
          .select("id")
          .eq("role", "hr_staff")
          .limit(1)
          .maybeSingle();
        assignedStaffId = hrStaff?.id ?? null;
      }

      const { error } = await supabase.from("hr_leads").insert([
        {
          name: name || "Driver",
          phone,
          status: "joined",
          source: "referral",
          joining_date: todayStr,
          assigned_manager_user_id: user?.id,
          assigned_staff_user_id: assignedStaffId,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead added and marked as joined!",
      });
      setAddLeadName("");
      setAddLeadPhone("");
      setExistingLead(null);
      await fetchLeads();
    } catch (error) {
      console.error("Error adding lead:", error);
      toast({
        title: "Error",
        description: "Failed to add lead",
        variant: "destructive",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setAddLeadPhone(digits);
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";
      case "tomorrow":
        return "Tomorrow";
      case "this_week":
        return "This Week";
      case "this_month":
        return "This Month";
      case "all":
        return "All";
      default:
        return "Today";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-7 h-7 text-green-600" />
          Joining Reports
        </h2>
        <p className="text-gray-600 mt-1">
          Confirmed drivers (conform & not joined) — mark as joined or not
          joined
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-sm text-gray-600">
            Filter by date and search by name or phone number
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Date filter buttons */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["today", "Today"],
                  ["tomorrow", "Tomorrow"],
                  ["this_week", "This Week"],
                  ["this_month", "This Month"],
                  ["all", "All"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={
                    dateFilter === value && !showAllConfirm
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    setDateFilter(value);
                    setShowAllConfirm(false);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Show All Confirm Drivers button */}
            <Button
              variant={showAllConfirm ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllConfirm(!showAllConfirm)}
            >
              Show All Confirm Drivers
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Joining List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showAllConfirm
              ? `All Confirm Drivers (${filteredLeads.length})`
              : `${getDateFilterLabel()} (${filteredLeads.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No drivers found for the selected filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {lead.phone}
                        </a>
                      </p>
                      <p className="text-xs text-gray-500">
                        {lead.staff_name} •{" "}
                        {format(parseISO(lead.joining_date), "dd MMM yyyy")} •{" "}
                        <span
                          className={
                            lead.status === "not_joined"
                              ? "text-amber-600"
                              : "text-gray-600"
                          }
                        >
                          {lead.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      onClick={() => markAsJoined(lead.id)}
                      disabled={
                        markingAsJoined === lead.id || lead.status === "joined"
                      }
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {markingAsJoined === lead.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Joined
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => markAsNotJoined(lead.id)}
                      disabled={
                        markingAsNotJoined === lead.id ||
                        lead.status === "not_joined"
                      }
                      size="sm"
                      variant="outline"
                      className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    >
                      {markingAsNotJoined === lead.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Mark as Not Joined
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Lead (New Driver)
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add a driver who joined today but is not in the joining calendar
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="add-name">Driver Name</Label>
              <Input
                id="add-name"
                placeholder="Enter driver name"
                value={addLeadName}
                onChange={(e) => setAddLeadName(e.target.value)}
                disabled={!!existingLead}
              />
            </div>
            <div>
              <Label htmlFor="add-phone">Mobile Number (+91)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  +91
                </span>
                <Input
                  id="add-phone"
                  placeholder="9876543210"
                  value={addLeadPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="pl-12"
                  maxLength={10}
                />
                {lookupLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {existingLead && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Lead already exists: {existingLead.name}
                </p>
                <p className="text-xs text-amber-700">
                  {existingLead.status === "joined"
                    ? "Already marked as joined"
                    : "Click below to mark as joined with today's date"}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleAddLeadSubmit}
            disabled={
              submitLoading ||
              lookupLoading ||
              addLeadPhone.replace(/\D/g, "").length < 10
            }
            className="bg-green-600 hover:bg-green-700"
          >
            {submitLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : existingLead && existingLead.status !== "joined" ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Joined
              </>
            ) : existingLead && existingLead.status === "joined" ? (
              "Already Joined"
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add as Joined (Referral)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRJoiningReports;
