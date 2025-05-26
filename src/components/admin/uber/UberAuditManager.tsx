import { useState, useEffect } from "react";
import { format, endOfWeek, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Search,
  Users,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/context/AdminContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type AuditStatus = "not_verified" | "pending" | "verified";

interface UberAudit {
  id: string;
  user_id: string;
  week_end_date: string;
  audit_status: AuditStatus;
  description: string;
  is_online: boolean;
  updated_at: string;
  user: {
    name: string;
    email_id: string;
    phone_number: string;
    joining_date: string;
    online: boolean;
  };
}

export function UberAuditManager() {
  const [audits, setAudits] = useState<UberAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(
    format(endOfWeek(new Date()), "yyyy-MM-dd")
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AuditStatus[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<UberAudit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState<AuditStatus>("not_verified");
  const [tempDescription, setTempDescription] = useState("");
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      return;
    }
    fetchAudits();
  }, [selectedWeek, isAdmin, adminLoading]);

  const fetchAudits = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      console.log("Fetching audits for week:", selectedWeek);

      // First, get all drivers with their details
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email_id, phone_number, online, joining_date")
        // .eq("role", "driver")
        .eq("online", true);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      if (!users || users.length === 0) {
        setAudits([]);
        return;
      }

      // Then, get existing audits for the selected week
      const { data: existingAudits, error: auditsError } = await supabase
        .from("uber_weekly_audits")
        .select("*")
        .eq("week_end_date", selectedWeek);

      if (auditsError) {
        console.error("Error fetching existing audits:", auditsError);
        throw auditsError;
      }

      // Create a map of existing audits by user_id
      const auditMap = new Map(
        existingAudits?.map((audit) => [audit.user_id, audit]) || []
      );

      // Create audit records for all drivers, using existing data if available
      const allAudits = users
        .filter((user) => user && user.id) // Filter out any invalid users
        .map((user) => {
          const existingAudit = auditMap.get(user.id);
          return {
            id: existingAudit?.id || null,
            user_id: user.id,
            week_end_date: selectedWeek,
            audit_status: existingAudit?.audit_status || "not_verified",
            description: existingAudit?.description || "",
            is_online: user.online || false,
            updated_at: existingAudit?.updated_at || "",
            user: {
              name: user.name || "Unknown",
              email_id: user.email_id || "No email",
              phone_number: user.phone_number || "No phone",
              joining_date: user.joining_date || "",
              online: user.online || false,
            },
          };
        });

      console.log("Processed audits:", allAudits);
      setAudits(allAudits);
    } catch (error) {
      console.error("Error in fetchAudits:", error);
      toast({
        title: "Error",
        description: "Failed to fetch audit records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAuditStatus = async (
    userId: string,
    status: AuditStatus,
    description: string
  ) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current user's ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update audit status",
          variant: "destructive",
        });
        return;
      }

      // First, check if an audit record already exists for this user and week
      const { data: existingAudit, error: checkError } = await supabase
        .from("uber_weekly_audits")
        .select("id")
        .eq("user_id", userId)
        .eq("week_end_date", selectedWeek)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" error
        throw checkError;
      }

      if (existingAudit) {
        // Update existing audit
        const { error } = await supabase
          .from("uber_weekly_audits")
          .update({
            audit_status: status,
            description: description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAudit.id);

        if (error) throw error;
      } else {
        // Create new audit
        const { error } = await supabase.from("uber_weekly_audits").insert({
          user_id: userId,
          week_end_date: selectedWeek,
          audit_status: status,
          description: description,
          is_online: true,
          created_by: user.id,
        });

        if (error) {
          console.error("Error creating audit:", error);
          throw error;
        }
      }

      // Update local state
      setAudits(
        audits.map((audit) =>
          audit.user_id === userId
            ? { ...audit, audit_status: status, description: description }
            : audit
        )
      );

      toast({
        title: "Success",
        description: "Audit status updated successfully",
      });
    } catch (error) {
      console.error("Error updating audit status:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update audit status",
        variant: "destructive",
      });
    }
  };

  const handleOnlineToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ online: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      setAudits(
        audits.map((audit) => {
          if (audit.user_id === userId) {
            return {
              ...audit,
              user: {
                ...audit.user,
                online: !currentStatus,
              },
            };
          }
          return audit;
        })
      );

      toast({
        title: "Success",
        description: `Driver marked as ${
          !currentStatus ? "online" : "offline"
        }`,
      });
    } catch (error) {
      console.error("Error updating online status:", error);
      toast({
        title: "Error",
        description: "Failed to update online status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: AuditStatus) => {
    const variants = {
      not_verified: {
        bg: "bg-red-50",
        text: "text-red-700",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
      },
      pending: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
      },
      verified: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      },
    };

    const { bg, text, icon } = variants[status];

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
          bg,
          text
        )}
      >
        {icon}
        {status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}
      </div>
    );
  };

  const getFilteredAudits = () => {
    return audits.filter((audit) => {
      const matchesSearch =
        searchQuery === "" ||
        audit.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.user.email_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.user.phone_number.includes(searchQuery);

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(audit.audit_status);

      return matchesSearch && matchesStatus;
    });
  };

  const getSummary = () => {
    const summary = {
      total: audits.length,
      verified: 0,
      pending: 0,
      notVerified: 0,
    };

    audits.forEach((audit) => {
      switch (audit.audit_status) {
        case "verified":
          summary.verified++;
          break;
        case "pending":
          summary.pending++;
          break;
        case "not_verified":
          summary.notVerified++;
          break;
      }
    });

    return summary;
  };

  const filteredAudits = getFilteredAudits();
  const summary = getSummary();

  const navigateWeek = (direction: "next" | "prev") => {
    const currentDate = new Date(selectedWeek);
    const newDate =
      direction === "next"
        ? addWeeks(currentDate, 1)
        : subWeeks(currentDate, 1);
    setSelectedWeek(format(endOfWeek(newDate), "yyyy-MM-dd"));
  };

  const handleVerifyClick = (audit: UberAudit) => {
    setSelectedAudit(audit);
    setTempStatus(audit.audit_status);
    setTempDescription(audit.description);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedAudit) return;

    try {
      await updateAuditStatus(
        selectedAudit.user_id,
        tempStatus,
        tempDescription
      );
      setIsModalOpen(false);
      setSelectedAudit(null);
    } catch (error) {
      console.error("Error updating audit:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Uber Weekly Audit</h2>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("not_verified")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "not_verified"]
                      : prev.filter((s) => s !== "not_verified")
                  );
                }}
              >
                Not Verified
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("pending")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "pending"]
                      : prev.filter((s) => s !== "pending")
                  );
                }}
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("verified")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "verified"]
                      : prev.filter((s) => s !== "verified")
                  );
                }}
              >
                Verified
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedWeek && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedWeek
                  ? format(new Date(selectedWeek), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={new Date(selectedWeek)}
                onSelect={(date) => {
                  if (date) {
                    setSelectedWeek(format(endOfWeek(date), "yyyy-MM-dd"));
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Total Drivers</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.total}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Verified</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.verified}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h3 className="font-medium">Pending</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.pending}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-medium">Not Verified</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.notVerified}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter Status
                {statusFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {statusFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("not_verified")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "not_verified"]
                      : prev.filter((s) => s !== "not_verified")
                  );
                }}
              >
                Not Verified
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("pending")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "pending"]
                      : prev.filter((s) => s !== "pending")
                  );
                }}
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("verified")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "verified"]
                      : prev.filter((s) => s !== "verified")
                  );
                }}
              >
                Verified
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <XCircle className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No drivers found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "No drivers available for this week"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-slate-50">
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Driver Name
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Joining Date
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Phone
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Status
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Last Verified
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Online Status
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit, index) => (
                  <TableRow
                    key={audit.user_id}
                    className={cn(
                      "border-b border-border transition-colors",
                      "hover:bg-slate-50/50",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    <TableCell className="py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-slate-600">
                            {audit.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {audit.user.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {audit.user.email_id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {audit.user.joining_date
                            ? format(
                                new Date(audit.user.joining_date),
                                "MMM dd, yyyy"
                              )
                            : "Not available"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm text-slate-600">
                        {audit.user.phone_number}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      {getStatusBadge(audit.audit_status)}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {audit.updated_at
                            ? format(
                                new Date(audit.updated_at),
                                "MMM dd, yyyy HH:mm"
                              )
                            : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={audit.user.online}
                          onCheckedChange={() =>
                            handleOnlineToggle(audit.user_id, audit.user.online)
                          }
                        />
                        <span
                          className={cn(
                            "text-xs font-medium",
                            audit.user.online
                              ? "text-green-600"
                              : "text-slate-500"
                          )}
                        >
                          {audit.user.online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyClick(audit)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:bg-slate-100"
                      >
                        <Check className="h-4 w-4" />
                        Verify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Verify Driver Audit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Driver Information</Label>
              <div className="text-sm">
                <p>
                  <span className="font-medium">Name:</span>{" "}
                  {selectedAudit?.user.name}
                </p>
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {selectedAudit?.user.email_id}
                </p>
                <p>
                  <span className="font-medium">Phone:</span>{" "}
                  {selectedAudit?.user.phone_number}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audit Status</Label>
              <Select
                value={tempStatus}
                onValueChange={(value: AuditStatus) => setTempStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_verified">Not Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                placeholder="Add notes about the audit..."
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
