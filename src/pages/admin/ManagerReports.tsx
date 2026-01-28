import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  FileText,
  Calendar,
  Search,
  Eye,
  Users,
  Car,
  AlertCircle,
  Phone,
  Mail,
  User,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Hash,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Edit, Save, X } from "lucide-react";

interface ShiftLeaveReport {
  id: string;
  report_date: string;
  shift: "morning" | "night" | null;
  total_active_vehicles: number;
  total_available_shifts: number;
  shifts_runned: number;
  shifts_leave: number;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface ShiftLeaveDetail {
  id: string;
  shift_leave_report_id: string;
  vehicle_number: string;
  driver_id: string | null;
  driver_name: string | null;
  leave_type: "leave" | "missed";
  reason: string | null;
  shift: string | null;
  created_at: string;
  driver_details?: {
    id: string;
    name: string;
    email: string;
    phone_number: string | null;
    driver_id: string | null;
    vehicle_number: string | null;
    shift: string | null;
    driver_category: string | null;
    online: boolean | null;
    joining_date: string | null;
    date_of_birth: string | null;
    total_earning: number | null;
    total_trip: number | null;
    pending_balance: number | null;
    email_id?: string | null;
  };
}

const ManagerReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ShiftLeaveReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ShiftLeaveReport[]>(
    []
  );
  const [selectedReport, setSelectedReport] = useState<ShiftLeaveReport | null>(
    null
  );
  const [reportDetails, setReportDetails] = useState<ShiftLeaveDetail[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReport, setEditingReport] = useState<ShiftLeaveReport | null>(
    null
  );
  const [editingDetails, setEditingDetails] = useState<ShiftLeaveDetail[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ShiftLeaveReport | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchReports();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === "admin" || data?.role === "super_admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, dateFilter]);

  // Group reports by date
  const groupReportsByDate = (reportsList: ShiftLeaveReport[]) => {
    const grouped: Record<
      string,
      { morning?: ShiftLeaveReport; night?: ShiftLeaveReport }
    > = {};

    reportsList.forEach((report) => {
      const dateKey = report.report_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }

      if (report.shift === "morning") {
        grouped[dateKey].morning = report;
      } else if (report.shift === "night") {
        grouped[dateKey].night = report;
      }
    });

    return grouped;
  };

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("shift_leave_reports")
        .select("*")
        .order("report_date", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch creator names separately
      const creatorIds = [
        ...new Set(
          (reportsData || [])
            .map((r: any) => r.created_by)
            .filter((id: string) => id)
        ),
      ];

      let creatorsMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: creatorsData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", creatorIds);

        if (creatorsData) {
          creatorsMap = creatorsData.reduce(
            (acc: Record<string, string>, user: any) => {
              acc[user.id] = user.name || "Unknown";
              return acc;
            },
            {}
          );
        }
      }

      const reportsWithCreator = (reportsData || []).map((report: any) => ({
        ...report,
        creator_name: creatorsMap[report.created_by] || "Unknown",
      }));

      setReports(reportsWithCreator);
      setFilteredReports(reportsWithCreator);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load manager reports");
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Filter by search query (creator name or date)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.creator_name?.toLowerCase().includes(query) ||
          format(new Date(report.report_date), "dd MMM yyyy")
            .toLowerCase()
            .includes(query)
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = format(yesterday, "yyyy-MM-dd");
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = format(weekAgo, "yyyy-MM-dd");
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = format(monthAgo, "yyyy-MM-dd");

      filtered = filtered.filter((report) => {
        const reportDate = report.report_date;
        switch (dateFilter) {
          case "today":
            return reportDate === todayStr;
          case "yesterday":
            return reportDate === yesterdayStr;
          case "week":
            return reportDate >= weekAgoStr;
          case "month":
            return reportDate >= monthAgoStr;
          default:
            return true;
        }
      });
    }

    setFilteredReports(filtered);
  };

  const fetchReportDetails = async (reportId: string) => {
    try {
      setLoadingDetails(true);

      // Fetch leave details
      const { data: detailsData, error: detailsError } = await supabase
        .from("shift_leave_details")
        .select("*")
        .eq("shift_leave_report_id", reportId)
        .order("created_at", { ascending: true });

      if (detailsError) throw detailsError;

      // Get all unique driver IDs from the details
      const driverIds = [
        ...new Set(
          (detailsData || [])
            .map((d: any) => d.driver_id)
            .filter((id: string) => id)
        ),
      ];

      // Fetch full driver details for all drivers
      let driversMap: Record<string, any> = {};
      if (driverIds.length > 0) {
        const { data: driversData, error: driversError } = await supabase
          .from("users")
          .select(
            "id, name, email_id, phone_number, driver_id, vehicle_number, shift, driver_category, online, joining_date, date_of_birth, total_earning, total_trip, pending_balance"
          )
          .in("id", driverIds);

        if (driversError) {
          console.error("Error fetching driver details:", driversError);
        } else if (driversData) {
          driversMap = driversData.reduce(
            (acc: Record<string, any>, driver: any) => {
              acc[driver.id] = driver;
              return acc;
            },
            {}
          );
        }
      }

      // Combine leave details with driver information
      const detailsWithDrivers = (detailsData || []).map((detail: any) => ({
        ...detail,
        driver_details: detail.driver_id ? driversMap[detail.driver_id] : null,
      }));

      setReportDetails(detailsWithDrivers);
    } catch (error) {
      console.error("Error fetching report details:", error);
      toast.error("Failed to load report details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (report: ShiftLeaveReport) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
    setIsEditMode(false);
    await fetchReportDetails(report.id);
  };

  const handleEditReport = async (report: ShiftLeaveReport) => {
    setEditingReport({ ...report });
    setIsEditMode(true);
    await fetchReportDetails(report.id);
    setEditingDetails([...reportDetails]);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingReport(null);
    setEditingDetails([]);
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;

    setIsSaving(true);
    try {
      // Update the main report
      const { error: reportError } = await supabase
        .from("shift_leave_reports")
        .update({
          report_date: format(
            new Date(editingReport.report_date),
            "yyyy-MM-dd"
          ),
          shift: editingReport.shift,
          total_active_vehicles: editingReport.total_active_vehicles,
          total_available_shifts: editingReport.total_available_shifts,
          shifts_runned: editingReport.shifts_runned,
          shifts_leave: editingReport.shifts_leave,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingReport.id);

      if (reportError) throw reportError;

      // Delete existing details
      await supabase
        .from("shift_leave_details")
        .delete()
        .eq("shift_leave_report_id", editingReport.id);

      // Insert updated details
      if (editingDetails.length > 0) {
        const detailsToInsert = editingDetails.map((detail) => ({
          shift_leave_report_id: editingReport.id,
          vehicle_number: detail.vehicle_number,
          driver_id: detail.driver_id || null,
          driver_name: detail.driver_name || null,
          leave_type: detail.leave_type,
          reason: detail.reason || null,
          shift: detail.shift || null,
        }));

        const { error: detailsError } = await supabase
          .from("shift_leave_details")
          .insert(detailsToInsert);

        if (detailsError) throw detailsError;
      }

      toast.success("Report updated successfully!");
      setIsEditMode(false);
      setEditingReport(null);
      setEditingDetails([]);
      await fetchReports();
      if (selectedReport) {
        await fetchReportDetails(selectedReport.id);
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast.error(error.message || "Failed to update report");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetailChange = (
    index: number,
    field: keyof ShiftLeaveDetail,
    value: any
  ) => {
    const updated = [...editingDetails];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setEditingDetails(updated);
  };

  const handleDeleteClick = (report: ShiftLeaveReport) => {
    setReportToDelete(report);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
      // First delete all related details
      const { error: detailsError } = await supabase
        .from("shift_leave_details")
        .delete()
        .eq("shift_leave_report_id", reportToDelete.id);

      if (detailsError) throw detailsError;

      // Then delete the report
      const { error: reportError } = await supabase
        .from("shift_leave_reports")
        .delete()
        .eq("id", reportToDelete.id);

      if (reportError) throw reportError;

      toast.success("Report deleted successfully!");
      setShowDeleteDialog(false);
      setReportToDelete(null);
      await fetchReports();
    } catch (error: any) {
      console.error("Error deleting report:", error);
      toast.error(error.message || "Failed to delete report");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Manager Reports">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manager Reports">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Shift Leave Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by creator or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-filter">Filter by Date</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  Showing {filteredReports.length} of {reports.length} reports
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grouped by Date */}
        <Card>
          <CardContent className="p-0">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No reports found</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Accordion type="multiple" className="w-full">
                  {(() => {
                    const groupedReports = groupReportsByDate(filteredReports);
                    const sortedDates = Object.keys(groupedReports).sort(
                      (a, b) => new Date(b).getTime() - new Date(a).getTime()
                    );

                    return sortedDates.map((dateKey) => {
                      const dateReports = groupedReports[dateKey];
                      const hasMorning = !!dateReports.morning;
                      const hasNight = !!dateReports.night;

                      // Calculate combined totals
                      const totalShiftsRun =
                        (dateReports.morning?.shifts_runned || 0) +
                        (dateReports.night?.shifts_runned || 0);
                      const totalShiftsMissed =
                        (dateReports.morning?.shifts_leave || 0) +
                        (dateReports.night?.shifts_leave || 0);
                      const totalAvailableShifts =
                        (dateReports.morning?.total_available_shifts || 0) +
                        (dateReports.night?.total_available_shifts || 0);
                      const combinedUsagePercentage =
                        totalAvailableShifts > 0
                          ? Math.round(
                              (totalShiftsRun / totalAvailableShifts) * 100
                            )
                          : 0;

                      const renderReportCard = (
                        report: ShiftLeaveReport | undefined,
                        shiftLabel: string
                      ) => {
                        if (!report) return null;

                        const usagePercentage =
                          report.total_available_shifts > 0
                            ? Math.round(
                                (report.shifts_runned /
                                  report.total_available_shifts) *
                                  100
                              )
                            : 0;

                        return (
                          <TableRow key={report.id}>
                            <TableCell>
                              <Badge
                                variant={
                                  report.shift === "morning"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-sm"
                              >
                                {shiftLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                  {report.creator_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Car className="h-4 w-4 text-blue-500" />
                                <span>{report.total_active_vehicles}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {report.total_available_shifts}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-500">
                                {report.shifts_runned}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {report.shifts_leave}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  usagePercentage >= 80
                                    ? "default"
                                    : usagePercentage >= 50
                                    ? "secondary"
                                    : "outline"
                                }
                                className={
                                  usagePercentage >= 80
                                    ? "bg-green-500"
                                    : usagePercentage >= 50
                                    ? "bg-yellow-500"
                                    : ""
                                }
                              >
                                {usagePercentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(report)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                {isAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditReport(report)}
                                      className="text-orange-600 hover:text-orange-700"
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteClick(report)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      };

                      return (
                        <AccordionItem
                          key={dateKey}
                          value={dateKey}
                          className="border-b"
                        >
                          <AccordionTrigger className="hover:no-underline px-6 py-4">
                            <div className="flex justify-evenly gap-3 w-full">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                <span className="font-semibold text-lg">
                                  {format(new Date(dateKey), "dd MMM yyyy")}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <Badge
                                    variant="default"
                                    className="bg-green-500 "
                                  >
                                    {totalShiftsRun}
                                  </Badge>
                                </div>
                                <div className="text-center">
                                  <Badge variant="destructive" className="">
                                    {totalShiftsMissed}
                                  </Badge>
                                </div>
                                <div className="text-center">
                                  <Badge
                                    variant={
                                      combinedUsagePercentage >= 80
                                        ? "default"
                                        : combinedUsagePercentage >= 50
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={
                                      combinedUsagePercentage >= 95
                                        ? "bg-green-500 "
                                        : combinedUsagePercentage >= 96
                                        ? "bg-yellow-500 "
                                        : "bg-red-500 text-white"
                                    }
                                  >
                                    {combinedUsagePercentage}%
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-auto mr-4">
                                {hasMorning && (
                                  <Badge variant="default" className="text-xs">
                                    Morning
                                  </Badge>
                                )}
                                {hasNight && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Night
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-4">
                            <div className="space-y-4 pt-2">
                              {/* Combined Totals Summary */}

                              {/* Reports Table */}
                              <Card>
                                <CardContent className="p-0">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Shift</TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead>Active Vehicles</TableHead>
                                        <TableHead>Available Shifts</TableHead>
                                        <TableHead>Shifts Run</TableHead>
                                        <TableHead>Shifts Leave</TableHead>
                                        <TableHead>Vehicle Usage</TableHead>
                                        <TableHead className="text-right">
                                          Actions
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {hasMorning &&
                                        renderReportCard(
                                          dateReports.morning,
                                          "Morning"
                                        )}
                                      {hasNight &&
                                        renderReportCard(
                                          dateReports.night,
                                          "Night"
                                        )}
                                    </TableBody>
                                  </Table>
                                </CardContent>
                              </Card>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    });
                  })()}
                </Accordion>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Report Details Modal */}
        <Dialog
          open={isDetailModalOpen}
          onOpenChange={(open) => {
            setIsDetailModalOpen(open);
            if (!open) {
              setIsEditMode(false);
              setEditingReport(null);
              setEditingDetails([]);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {isEditMode ? "Edit Report" : "Report Details"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedReport &&
                      `Report for ${format(
                        new Date(selectedReport.report_date),
                        "dd MMM yyyy"
                      )}${
                        selectedReport.shift ? ` (${selectedReport.shift})` : ""
                      } by ${selectedReport.creator_name}`}
                  </DialogDescription>
                </div>
                {isAdmin && !isEditMode && selectedReport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditReport(selectedReport)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
              </div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditMode && editingReport ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Report Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {editingReport.report_date
                                      ? format(
                                          new Date(editingReport.report_date),
                                          "dd MMM yyyy"
                                        )
                                      : "Pick a date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <CalendarComponent
                                    mode="single"
                                    selected={
                                      editingReport.report_date
                                        ? new Date(editingReport.report_date)
                                        : undefined
                                    }
                                    onSelect={(date) => {
                                      if (date && editingReport) {
                                        setEditingReport({
                                          ...editingReport,
                                          report_date: format(
                                            date,
                                            "yyyy-MM-dd"
                                          ),
                                        });
                                      }
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <Label>Shift</Label>
                              <Select
                                value={editingReport.shift || "morning"}
                                onValueChange={(value: "morning" | "night") => {
                                  if (editingReport) {
                                    setEditingReport({
                                      ...editingReport,
                                      shift: value,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="morning">
                                    Morning
                                  </SelectItem>
                                  <SelectItem value="night">Night</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Active Vehicles</Label>
                              <Input
                                type="number"
                                value={editingReport.total_active_vehicles}
                                onChange={(e) => {
                                  if (editingReport) {
                                    const vehicles =
                                      parseInt(e.target.value) || 0;
                                    setEditingReport({
                                      ...editingReport,
                                      total_active_vehicles: vehicles,
                                      total_available_shifts: vehicles, // Each vehicle = 1 shift per report
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Available Shifts</Label>
                              <Input
                                type="number"
                                value={editingReport.total_available_shifts}
                                onChange={(e) => {
                                  if (editingReport) {
                                    setEditingReport({
                                      ...editingReport,
                                      total_available_shifts:
                                        parseInt(e.target.value) || 0,
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Shifts Runned</Label>
                              <Input
                                type="number"
                                value={editingReport.shifts_runned}
                                onChange={(e) => {
                                  if (editingReport) {
                                    setEditingReport({
                                      ...editingReport,
                                      shifts_runned:
                                        parseInt(e.target.value) || 0,
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Shifts Leave</Label>
                              <Input
                                type="number"
                                value={editingReport.shifts_leave}
                                onChange={(e) => {
                                  if (editingReport) {
                                    setEditingReport({
                                      ...editingReport,
                                      shifts_leave:
                                        parseInt(e.target.value) || 0,
                                    });
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Active Vehicles
                            </p>
                            <p className="text-lg font-bold">
                              {selectedReport?.total_active_vehicles}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Available Shifts
                            </p>
                            <p className="text-lg font-bold">
                              {selectedReport?.total_available_shifts}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Shifts Runned
                            </p>
                            <p className="text-lg font-bold text-green-600">
                              {selectedReport?.shifts_runned}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Shifts Leave
                            </p>
                            <p className="text-lg font-bold text-red-600">
                              {selectedReport?.shifts_leave}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Leave Details */}
                  {(isEditMode ? editingDetails : reportDetails).length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Leave Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(isEditMode ? editingDetails : reportDetails).map(
                            (detail, index) => (
                              <Card key={detail.id} className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <h4 className="font-medium">
                                    Leave #{index + 1}
                                  </h4>
                                  <Badge
                                    variant={
                                      detail.leave_type === "leave"
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {detail.leave_type === "leave"
                                      ? "Leave"
                                      : "Missed"}
                                  </Badge>
                                </div>
                                <div className="space-y-4">
                                  {/* Basic Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {isEditMode ? (
                                      <>
                                        <div className="space-y-2">
                                          <Label>Vehicle</Label>
                                          <Input
                                            value={detail.vehicle_number}
                                            onChange={(e) =>
                                              handleDetailChange(
                                                index,
                                                "vehicle_number",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Shift</Label>
                                          <Select
                                            value={detail.shift || ""}
                                            onValueChange={(value) =>
                                              handleDetailChange(
                                                index,
                                                "shift",
                                                value
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select shift" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="morning">
                                                Morning
                                              </SelectItem>
                                              <SelectItem value="night">
                                                Night
                                              </SelectItem>
                                              <SelectItem value="24hr">
                                                24 Hours
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                          <Label>Leave Type</Label>
                                          <Select
                                            value={detail.leave_type}
                                            onValueChange={(
                                              value: "leave" | "missed"
                                            ) =>
                                              handleDetailChange(
                                                index,
                                                "leave_type",
                                                value
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="leave">
                                                Leave
                                              </SelectItem>
                                              <SelectItem value="missed">
                                                Missed
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                          <Label>Reason / Notes</Label>
                                          <Textarea
                                            value={detail.reason || ""}
                                            onChange={(e) =>
                                              handleDetailChange(
                                                index,
                                                "reason",
                                                e.target.value
                                              )
                                            }
                                            rows={3}
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div>
                                          <p className="text-sm text-gray-500">
                                            Vehicle
                                          </p>
                                          <p className="font-medium flex items-center gap-2">
                                            <Car className="h-4 w-4" />
                                            {detail.vehicle_number}
                                          </p>
                                        </div>
                                        {detail.shift && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Shift
                                            </p>
                                            <p className="font-medium flex items-center gap-2">
                                              <CalendarDays className="h-4 w-4" />
                                              {detail.shift}
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* Driver Information Section */}
                                  {detail.driver_details ? (
                                    <div className="border-t pt-4">
                                      <h5 className="font-semibold mb-3 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Driver Information
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-gray-500">
                                            Driver Name
                                          </p>
                                          <p className="font-medium flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            {detail.driver_details.name}
                                          </p>
                                        </div>
                                        {detail.driver_details.driver_id && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Driver ID
                                            </p>
                                            <p className="font-medium flex items-center gap-2">
                                              <Hash className="h-4 w-4" />
                                              {detail.driver_details.driver_id}
                                            </p>
                                          </div>
                                        )}
                                        {detail.driver_details.email_id && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Email
                                            </p>
                                            <p className="font-medium flex items-center gap-2">
                                              <Mail className="h-4 w-4" />
                                              {detail.driver_details.email_id}
                                            </p>
                                          </div>
                                        )}
                                        {detail.driver_details.phone_number && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Phone Number
                                            </p>
                                            <p className="font-medium flex items-center gap-2">
                                              <Phone className="h-4 w-4" />
                                              {
                                                detail.driver_details
                                                  .phone_number
                                              }
                                            </p>
                                          </div>
                                        )}
                                        {detail.driver_details
                                          .vehicle_number && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Assigned Vehicle
                                            </p>
                                            <p className="font-medium flex items-center gap-2">
                                              <Car className="h-4 w-4" />
                                              {
                                                detail.driver_details
                                                  .vehicle_number
                                              }
                                            </p>
                                          </div>
                                        )}
                                        {detail.driver_details.shift && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Driver Shift
                                            </p>
                                            <p className="font-medium flex items-center gap-2">
                                              <CalendarDays className="h-4 w-4" />
                                              {detail.driver_details.shift}
                                            </p>
                                          </div>
                                        )}
                                        {detail.driver_details
                                          .driver_category && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Driver Category
                                            </p>
                                            <Badge variant="outline">
                                              {
                                                detail.driver_details
                                                  .driver_category
                                              }
                                            </Badge>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-sm text-gray-500">
                                            Status
                                          </p>
                                          <Badge
                                            variant={
                                              detail.driver_details.online
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {detail.driver_details.online
                                              ? "Online"
                                              : "Offline"}
                                          </Badge>
                                        </div>
                                        {detail.driver_details.joining_date && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Joining Date
                                            </p>
                                            <p className="font-medium">
                                              {format(
                                                new Date(
                                                  detail.driver_details.joining_date
                                                ),
                                                "dd MMM yyyy"
                                              )}
                                            </p>
                                          </div>
                                        )}
                                        {detail.driver_details
                                          .date_of_birth && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Date of Birth
                                            </p>
                                            <p className="font-medium">
                                              {format(
                                                new Date(
                                                  detail.driver_details.date_of_birth
                                                ),
                                                "dd MMM yyyy"
                                              )}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Driver Statistics */}
                                      {(detail.driver_details.total_earning !==
                                        null ||
                                        detail.driver_details.total_trip !==
                                          null ||
                                        detail.driver_details
                                          .pending_balance !== null) && (
                                        <div className="border-t pt-4 mt-4">
                                          <h5 className="font-semibold mb-3 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Driver Statistics
                                          </h5>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {detail.driver_details
                                              .total_earning !== null && (
                                              <div className="p-3 bg-green-50 rounded-lg">
                                                <p className="text-sm text-gray-500">
                                                  Total Earnings
                                                </p>
                                                <p className="text-lg font-bold text-green-600 flex items-center gap-2">
                                                  <DollarSign className="h-4 w-4" />
                                                  ₹
                                                  {detail.driver_details.total_earning.toLocaleString()}
                                                </p>
                                              </div>
                                            )}
                                            {detail.driver_details
                                              .total_trip !== null && (
                                              <div className="p-3 bg-blue-50 rounded-lg">
                                                <p className="text-sm text-gray-500">
                                                  Total Trips
                                                </p>
                                                <p className="text-lg font-bold text-blue-600">
                                                  {
                                                    detail.driver_details
                                                      .total_trip
                                                  }
                                                </p>
                                              </div>
                                            )}
                                            {detail.driver_details
                                              .pending_balance !== null && (
                                              <div className="p-3 bg-orange-50 rounded-lg">
                                                <p className="text-sm text-gray-500">
                                                  Pending Balance
                                                </p>
                                                <p className="text-lg font-bold text-orange-600 flex items-center gap-2">
                                                  <DollarSign className="h-4 w-4" />
                                                  ₹
                                                  {detail.driver_details.pending_balance.toLocaleString()}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : detail.driver_name ? (
                                    <div className="border-t pt-4">
                                      <p className="text-sm text-gray-500">
                                        Driver
                                      </p>
                                      <p className="font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        {detail.driver_name}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Full driver details not available
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="border-t pt-4">
                                      <p className="text-sm text-gray-500">
                                        No driver assigned to this vehicle
                                      </p>
                                    </div>
                                  )}

                                  {/* Reason Section */}
                                  {!isEditMode && detail.reason && (
                                    <div className="border-t pt-4">
                                      <p className="text-sm text-gray-500 mb-2">
                                        Reason / Notes
                                      </p>
                                      <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="font-medium">
                                          {detail.reason}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-gray-500">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        No leave details found for this report
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete Report
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this report? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            {reportToDelete && (
              <div className="space-y-4 py-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="font-medium">
                        Date:{" "}
                        {format(
                          new Date(reportToDelete.report_date),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                    {reportToDelete.shift && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-red-600" />
                        <span className="font-medium">
                          Shift: {reportToDelete.shift}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-red-600" />
                      <span className="font-medium">
                        Created by: {reportToDelete.creator_name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">This will delete:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>The main report record</li>
                    <li>All associated leave details</li>
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setReportToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ManagerReports;
