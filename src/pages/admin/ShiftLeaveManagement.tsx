import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Car,
  Users,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Search,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Vehicle {
  vehicle_number: string;
}

interface Driver {
  id: string;
  name: string;
  shift: string;
}

interface LeaveDetail {
  id: string;
  vehicle_number: string;
  driver_id: string | null;
  driver_name: string | null;
  leave_type: "leave" | "missed";
  reason: string;
  shift: string;
}

const ShiftLeaveManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeVehicles, setActiveVehicles] = useState<Vehicle[]>([]);
  const [totalActiveVehicles, setTotalActiveVehicles] = useState(0);
  const [totalAvailableShifts, setTotalAvailableShifts] = useState(0);
  const [shiftsRunned, setShiftsRunned] = useState<number>(0);
  const [shiftsLeave, setShiftsLeave] = useState<number>(0);
  const [availableShiftsRemaining, setAvailableShiftsRemaining] = useState(0);
  const [leaveDetails, setLeaveDetails] = useState<LeaveDetail[]>([]);
  const [vehicleDrivers, setVehicleDrivers] = useState<
    Record<string, Driver[]>
  >({});
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [reportShift, setReportShift] = useState<"morning" | "night">(
    "morning"
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [existingReports, setExistingReports] = useState<any[]>([]);
  const [searchReportDate, setSearchReportDate] = useState<Date | null>(null);
  const [searchReportShift, setSearchReportShift] = useState<
    "morning" | "night" | "all"
  >("all");

  useEffect(() => {
    fetchActiveVehicles();
    fetchExistingReports();
  }, []);

  const fetchExistingReports = async () => {
    try {
      const { data, error } = await supabase
        .from("shift_leave_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setExistingReports(data || []);
    } catch (error) {
      console.error("Error fetching existing reports:", error);
    }
  };

  const loadReportForEdit = async (reportId: string) => {
    try {
      setLoading(true);

      // Fetch report
      const { data: report, error: reportError } = await supabase
        .from("shift_leave_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (reportError) throw reportError;

      // Fetch report details
      const { data: details, error: detailsError } = await supabase
        .from("shift_leave_details")
        .select("*")
        .eq("shift_leave_report_id", reportId)
        .order("created_at", { ascending: true });

      if (detailsError) throw detailsError;

      // Populate form with report data
      setReportDate(new Date(report.report_date));
      setReportShift(report.shift || "morning");
      setTotalActiveVehicles(report.total_active_vehicles);
      setTotalAvailableShifts(report.total_available_shifts);
      setShiftsRunned(report.shifts_runned);
      setShiftsLeave(report.shifts_leave);

      // Populate leave details
      const loadedDetails: LeaveDetail[] = (details || []).map(
        (detail, index) => ({
          id: detail.id || `loaded-${index}`,
          vehicle_number: detail.vehicle_number,
          driver_id: detail.driver_id,
          driver_name: detail.driver_name,
          leave_type: detail.leave_type,
          reason: detail.reason || "",
          shift: detail.shift || "",
        })
      );

      setLeaveDetails(loadedDetails);

      // Fetch drivers for vehicles in loaded details
      const uniqueVehicles = [
        ...new Set(loadedDetails.map((d) => d.vehicle_number).filter(Boolean)),
      ];
      for (const vehicleNumber of uniqueVehicles) {
        await fetchDriversForVehicle(vehicleNumber);
      }

      setEditingReportId(reportId);
      setIsEditMode(true);

      toast.success("Report loaded for editing");
    } catch (error: any) {
      console.error("Error loading report:", error);
      toast.error(error.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleNewReport = () => {
    setIsEditMode(false);
    setEditingReportId(null);
    setReportDate(new Date());
    setReportShift("morning");
    setShiftsRunned(0);
    setShiftsLeave(0);
    setLeaveDetails([]);
    setVehicleDrivers({});
    fetchActiveVehicles();
  };

  useEffect(() => {
    // Calculate available shifts remaining
    const remaining = totalAvailableShifts - shiftsRunned;
    setAvailableShiftsRemaining(Math.max(0, remaining));
  }, [totalAvailableShifts, shiftsRunned]);

  useEffect(() => {
    // When shiftsLeave changes, update leaveDetails array
    if (shiftsLeave > leaveDetails.length) {
      // Add new leave detail entries
      const newDetails: LeaveDetail[] = [];
      for (let i = leaveDetails.length; i < shiftsLeave; i++) {
        newDetails.push({
          id: `temp-${i}`,
          vehicle_number: "",
          driver_id: null,
          driver_name: null,
          leave_type: "leave",
          reason: "",
          shift: "",
        });
      }
      setLeaveDetails([...leaveDetails, ...newDetails]);
    } else if (shiftsLeave < leaveDetails.length) {
      // Remove excess leave detail entries
      setLeaveDetails(leaveDetails.slice(0, shiftsLeave));
    }
  }, [shiftsLeave]);

  const fetchActiveVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_number")
        .eq("online", true)
        .order("vehicle_number");

      if (error) throw error;

      const vehicles = data || [];
      setActiveVehicles(vehicles);
      setTotalActiveVehicles(vehicles.length);
      setTotalAvailableShifts(vehicles.length); // Each vehicle = 1 shift per report
    } catch (error) {
      console.error("Error fetching active vehicles:", error);
      toast.error("Failed to load active vehicles");
    } finally {
      setLoading(false);
    }
  };

  const fetchDriversForVehicle = async (vehicleNumber: string) => {
    if (!vehicleNumber) return [];

    // Check if we already have this data cached
    if (vehicleDrivers[vehicleNumber]) {
      return vehicleDrivers[vehicleNumber];
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, shift")
        .eq("vehicle_number", vehicleNumber)
        .eq("online", true)
        .eq("role", "user");

      if (error) throw error;

      const drivers = (data || []) as Driver[];
      setVehicleDrivers((prev) => ({
        ...prev,
        [vehicleNumber]: drivers,
      }));

      return drivers;
    } catch (error) {
      console.error("Error fetching drivers for vehicle:", error);
      toast.error("Failed to load drivers for vehicle");
      return [];
    }
  };

  const handleVehicleChange = async (index: number, vehicleNumber: string) => {
    const updatedDetails = [...leaveDetails];
    updatedDetails[index] = {
      ...updatedDetails[index],
      vehicle_number: vehicleNumber,
      driver_id: null,
      driver_name: null,
      shift: "",
    };

    // Fetch drivers for the selected vehicle
    const drivers = await fetchDriversForVehicle(vehicleNumber);
    // Don't auto-select driver - let user choose or select N/A
    updatedDetails[index] = {
      ...updatedDetails[index],
      driver_id: null,
      driver_name: null,
      shift: "",
      leave_type: "missed", // Default to missed until driver is selected
    };

    setLeaveDetails(updatedDetails);
  };

  const handleLeaveDetailChange = (
    index: number,
    field: keyof LeaveDetail,
    value: string
  ) => {
    const updatedDetails = [...leaveDetails];
    updatedDetails[index] = {
      ...updatedDetails[index],
      [field]: value,
    };
    setLeaveDetails(updatedDetails);
  };

  const handleRemoveLeaveDetail = (index: number) => {
    const updatedDetails = leaveDetails.filter((_, i) => i !== index);
    setLeaveDetails(updatedDetails);
    setShiftsLeave(updatedDetails.length);
  };

  const validateForm = (): boolean => {
    // Validate shifts runned
    if (shiftsRunned < 0 || shiftsRunned > totalAvailableShifts) {
      toast.error(
        `Shifts runned must be between 0 and ${totalAvailableShifts}`
      );
      return false;
    }

    // Validate shifts leave
    if (shiftsLeave < 0) {
      toast.error("Shifts leave cannot be negative");
      return false;
    }

    // Validate total doesn't exceed available
    if (shiftsRunned + shiftsLeave > totalAvailableShifts) {
      toast.error(
        `Total shifts (runned + leave) cannot exceed ${totalAvailableShifts}`
      );
      return false;
    }

    // Validate each leave detail
    for (let i = 0; i < leaveDetails.length; i++) {
      const detail = leaveDetails[i];
      if (!detail.vehicle_number) {
        toast.error(`Please select a vehicle for leave shift #${i + 1}`);
        return false;
      }

      // If leave type is "leave", driver must be selected (not N/A)
      if (
        detail.leave_type === "leave" &&
        (!detail.driver_id || detail.driver_id === "")
      ) {
        toast.error(
          `Please select a driver for leave shift #${
            i + 1
          } or change leave type to "Missed"`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setSubmitting(true);

    try {
      // Check if report already exists for selected date and shift
      const selectedDate = format(reportDate, "yyyy-MM-dd");
      const { data: existingReport } = await supabase
        .from("shift_leave_reports")
        .select("id")
        .eq("report_date", selectedDate)
        .eq("shift", reportShift)
        .maybeSingle();

      let reportId: string;

      if (isEditMode && editingReportId) {
        // Update existing report in edit mode
        const reportData = {
          report_date: selectedDate,
          shift: reportShift,
          total_active_vehicles: totalActiveVehicles,
          total_available_shifts: totalAvailableShifts,
          shifts_runned: shiftsRunned,
          shifts_leave: shiftsLeave,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("shift_leave_reports")
          .update(reportData)
          .eq("id", editingReportId)
          .select()
          .single();

        if (error) throw error;
        reportId = editingReportId;

        // Get existing detail IDs to preserve
        const { data: existingDetails } = await supabase
          .from("shift_leave_details")
          .select("id")
          .eq("shift_leave_report_id", reportId);

        const existingDetailIds = (existingDetails || []).map((d) => d.id);

        // Separate new and existing details
        const newDetails = leaveDetails.filter(
          (d) => !d.id || !existingDetailIds.includes(d.id)
        );
        const updatedDetails = leaveDetails.filter(
          (d) => d.id && existingDetailIds.includes(d.id)
        );

        // Update existing details
        for (const detail of updatedDetails) {
          await supabase
            .from("shift_leave_details")
            .update({
              vehicle_number: detail.vehicle_number,
              driver_id: detail.driver_id || null,
              driver_name: detail.driver_name || null,
              leave_type: detail.leave_type,
              reason: detail.reason || null,
              shift: detail.shift || null,
            })
            .eq("id", detail.id);
        }

        // Insert new details
        if (newDetails.length > 0) {
          const detailsToInsert = newDetails.map((detail) => ({
            shift_leave_report_id: reportId,
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
      } else {
        // New report or update existing (non-edit mode)
        const { data: existingReport } = await supabase
          .from("shift_leave_reports")
          .select("id")
          .eq("report_date", selectedDate)
          .eq("shift", reportShift)
          .maybeSingle();

        if (existingReport) {
          const confirm = window.confirm(
            `A report already exists for ${format(
              reportDate,
              "dd MMM yyyy"
            )} (${reportShift} shift). Do you want to update it?`
          );
          if (!confirm) {
            setSubmitting(false);
            return;
          }
        }

        // Insert or update shift_leave_reports
        const reportData = {
          report_date: selectedDate,
          shift: reportShift,
          total_active_vehicles: totalActiveVehicles,
          total_available_shifts: totalAvailableShifts,
          shifts_runned: shiftsRunned,
          shifts_leave: shiftsLeave,
          created_by: user.id,
        };

        if (existingReport) {
          // Update existing report
          const { data, error } = await supabase
            .from("shift_leave_reports")
            .update(reportData)
            .eq("id", existingReport.id)
            .select()
            .single();

          if (error) throw error;
          reportId = data.id;

          // Delete existing details
          await supabase
            .from("shift_leave_details")
            .delete()
            .eq("shift_leave_report_id", reportId);
        } else {
          // Insert new report
          const { data, error } = await supabase
            .from("shift_leave_reports")
            .insert(reportData)
            .select()
            .single();

          if (error) throw error;
          reportId = data.id;
        }

        // Insert shift_leave_details
        const detailsToInsert = leaveDetails.map((detail) => ({
          shift_leave_report_id: reportId,
          vehicle_number: detail.vehicle_number,
          driver_id: detail.driver_id || null,
          driver_name: detail.driver_name || null,
          leave_type: detail.leave_type,
          reason: detail.reason || null,
          shift: detail.shift || null,
        }));

        if (detailsToInsert.length > 0) {
          const { error: detailsError } = await supabase
            .from("shift_leave_details")
            .insert(detailsToInsert);

          if (detailsError) throw detailsError;
        }
      }

      // Create fleet_reports for leave types with assigned drivers (not N/A)
      const leaveReportsToCreate = leaveDetails.filter(
        (detail) =>
          detail.leave_type === "leave" &&
          detail.driver_id &&
          detail.driver_id !== "" &&
          detail.vehicle_number
      );

      for (const detail of leaveReportsToCreate) {
        // Check if fleet report already exists for this driver and date
        const { data: existingFleetReport } = await supabase
          .from("fleet_reports")
          .select("id")
          .eq("user_id", detail.driver_id)
          .eq("rent_date", selectedDate)
          .single();

        if (!existingFleetReport) {
          // Get driver details
          const { data: driverData } = await supabase
            .from("users")
            .select("name, shift")
            .eq("id", detail.driver_id)
            .single();

          const fleetReportData = {
            user_id: detail.driver_id,
            driver_name: detail.driver_name || driverData?.name || "Unknown",
            vehicle_number: detail.vehicle_number,
            rent_date: selectedDate,
            shift: detail.shift || driverData?.shift || reportShift,
            status: "leave",
            remarks:
              detail.reason ||
              `Shift leave marked by admin/manager (${reportShift} shift)`,
            total_trips: 0,
            total_earnings: 0,
            toll: 0,
            total_cashcollect: 0,
            platform_fee: 0,
            net_fare: 0,
            rent_paid_amount: 0,
            deposit_cutting_amount: 0,
            is_service_day: false,
          };

          const { error: fleetReportError } = await supabase
            .from("fleet_reports")
            .insert(fleetReportData);

          if (fleetReportError) {
            console.error(
              "Error creating fleet report for driver:",
              detail.driver_id,
              fleetReportError
            );
            // Don't throw, just log - continue with other reports
          }
        }
      }

      toast.success(
        isEditMode
          ? "Shift leave report updated successfully!"
          : "Shift leave report submitted successfully!"
      );

      // Reset form if not in edit mode
      if (!isEditMode) {
        setShiftsRunned(0);
        setShiftsLeave(0);
        setLeaveDetails([]);
        setVehicleDrivers({});
        setReportDate(new Date());
        setReportShift("morning");
      } else {
        // Refresh existing reports list
        await fetchExistingReports();
      }
    } catch (error: any) {
      console.error("Error submitting shift leave report:", error);
      toast.error(error.message || "Failed to submit shift leave report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Shift Leave Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  const filteredExistingReports = existingReports.filter((report) => {
    if (searchReportDate) {
      const reportDateStr = format(new Date(report.report_date), "yyyy-MM-dd");
      const searchDateStr = format(searchReportDate, "yyyy-MM-dd");
      if (reportDateStr !== searchDateStr) return false;
    }
    if (searchReportShift !== "all" && report.shift !== searchReportShift) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout title="Shift Leave Management">
      <div className="space-y-6">
        {/* Edit Mode Banner */}
        {isEditMode && editingReportId && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Editing Report - {format(reportDate, "dd MMM yyyy")} (
                    {reportShift} shift)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewReport}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  New Report
                </Button>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                You can add new missed shifts or modify existing ones. Changes
                will be saved when you submit.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Load Existing Report Section */}
        {!isEditMode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Load Existing Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search by Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !searchReportDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {searchReportDate ? (
                            format(searchReportDate, "dd MMM yyyy")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={searchReportDate || undefined}
                          onSelect={(date) => setSearchReportDate(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Shift</Label>
                    <Select
                      value={searchReportShift}
                      onValueChange={(value: "morning" | "night" | "all") =>
                        setSearchReportShift(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shifts</SelectItem>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchReportDate(null);
                        setSearchReportShift("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {filteredExistingReports.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Report to Edit</Label>
                    <ScrollArea className="h-48 border rounded-lg p-2">
                      <div className="space-y-2">
                        {filteredExistingReports.map((report) => (
                          <div
                            key={report.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                            onClick={() => loadReportForEdit(report.id)}
                          >
                            <div>
                              <p className="font-medium">
                                {format(
                                  new Date(report.report_date),
                                  "dd MMM yyyy"
                                )}{" "}
                                - {report.shift || "N/A"}
                              </p>
                              <p className="text-sm text-gray-500">
                                Runned: {report.shifts_runned} | Leave:{" "}
                                {report.shifts_leave}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadReportForEdit(report.id);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {filteredExistingReports.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No reports found. Create a new report below.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                <Car className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Total Active Vehicles
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {totalActiveVehicles}
                </span>
              </div>
              <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                <Users className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Total Available Shifts
                </span>
                <span className="text-2xl font-bold text-green-600">
                  {totalAvailableShifts}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  (Same as Active Vehicles)
                </span>
              </div>
              <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
                <AlertCircle className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Available Shifts Remaining
                </span>
                <span className="text-2xl font-bold text-purple-600">
                  {availableShiftsRemaining}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Leave Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date and Shift Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-date">Report Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reportDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {reportDate ? (
                        format(reportDate, "dd MMM yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={reportDate}
                      onSelect={(date) => {
                        if (date) setReportDate(date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-shift">Shift *</Label>
                <Select
                  value={reportShift}
                  onValueChange={(value: "morning" | "night") =>
                    setReportShift(value)
                  }
                >
                  <SelectTrigger id="report-shift">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Select the shift for this report (Morning or Night)
                </p>
              </div>
            </div>

            {/* Shifts Runned Input */}
            <div className="space-y-2">
              <Label htmlFor="shifts-runned">How many shifts runned?</Label>
              <Input
                id="shifts-runned"
                type="number"
                min="0"
                max={totalAvailableShifts}
                value={shiftsRunned}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  const runned = Math.max(
                    0,
                    Math.min(value, totalAvailableShifts)
                  );
                  setShiftsRunned(runned);

                  // Automatically calculate and set shifts leave
                  const remaining = totalAvailableShifts - runned;
                  if (remaining >= 0) {
                    setShiftsLeave(remaining);
                  }
                }}
                placeholder="Enter number of shifts runned"
              />
              <p className="text-sm text-gray-500">
                Maximum: {totalAvailableShifts} shifts
              </p>
            </div>

            {/* Available Shifts Remaining Display */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Available Shifts Remaining:</span>
                <span className="text-2xl font-bold text-purple-600">
                  {availableShiftsRemaining}
                </span>
              </div>
            </div>

            {/* Shifts Leave Input - Auto-filled but editable */}
            <div className="space-y-2">
              <Label htmlFor="shifts-leave">
                How many shifts leave? (Auto-filled from remaining shifts)
              </Label>
              <Input
                id="shifts-leave"
                type="number"
                min="0"
                value={shiftsLeave}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setShiftsLeave(Math.max(0, value));
                }}
                placeholder="Enter number of shifts leave"
                className="bg-blue-50"
              />
              <p className="text-sm text-blue-600">
                Automatically set to remaining shifts. You can edit if needed.
              </p>
            </div>

            {/* Leave Details Section */}
            {leaveDetails.length > 0 && (
              <div className="space-y-4">
                <Label>Leave Shift Details</Label>
                {leaveDetails.map((detail, index) => (
                  <Card key={detail.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Leave Shift #{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLeaveDetail(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vehicle Selection */}
                      <div className="space-y-2">
                        <Label>Vehicle *</Label>
                        <Select
                          value={detail.vehicle_number}
                          onValueChange={(value) =>
                            handleVehicleChange(index, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeVehicles.map((vehicle) => (
                              <SelectItem
                                key={vehicle.vehicle_number}
                                value={vehicle.vehicle_number}
                              >
                                {vehicle.vehicle_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Driver Selection */}
                      <div className="space-y-2">
                        <Label>Assigned Driver *</Label>
                        {detail.vehicle_number ? (
                          vehicleDrivers[detail.vehicle_number]?.length > 0 ? (
                            <Select
                              value={
                                detail.driver_id && detail.driver_id !== ""
                                  ? detail.driver_id
                                  : "N/A"
                              }
                              onValueChange={(value) => {
                                if (value === "N/A") {
                                  // Set N/A - clear driver and auto-set to missed
                                  const updatedDetails = [...leaveDetails];
                                  updatedDetails[index] = {
                                    ...updatedDetails[index],
                                    driver_id: null,
                                    driver_name: null,
                                    shift: "",
                                    leave_type: "missed",
                                  };
                                  setLeaveDetails(updatedDetails);
                                } else {
                                  // Driver selected - set driver info and allow leave type
                                  const selectedDriver = vehicleDrivers[
                                    detail.vehicle_number
                                  ].find((d) => d.id === value);
                                  if (selectedDriver) {
                                    const updatedDetails = [...leaveDetails];
                                    updatedDetails[index] = {
                                      ...updatedDetails[index],
                                      driver_id: selectedDriver.id,
                                      driver_name: selectedDriver.name,
                                      shift: selectedDriver.shift || "",
                                      leave_type:
                                        updatedDetails[index].leave_type ===
                                        "missed"
                                          ? "leave"
                                          : updatedDetails[index].leave_type,
                                    };
                                    setLeaveDetails(updatedDetails);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="N/A">N/A</SelectItem>
                                {vehicleDrivers[detail.vehicle_number].map(
                                  (driver) => (
                                    <SelectItem
                                      key={driver.id}
                                      value={driver.id}
                                    >
                                      {driver.name} ({driver.shift})
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              value={
                                detail.driver_id && detail.driver_id !== ""
                                  ? detail.driver_id
                                  : "N/A"
                              }
                              onValueChange={(value) => {
                                if (value === "N/A") {
                                  // Set N/A - clear driver and auto-set to missed
                                  const updatedDetails = [...leaveDetails];
                                  updatedDetails[index] = {
                                    ...updatedDetails[index],
                                    driver_id: "",
                                    driver_name: "",
                                    shift: "",
                                    leave_type: "missed",
                                  };
                                  setLeaveDetails(updatedDetails);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="N/A">N/A</SelectItem>
                              </SelectContent>
                            </Select>
                          )
                        ) : (
                          <p className="text-sm text-gray-500">
                            Select a vehicle first
                          </p>
                        )}
                        {detail.driver_id === null ||
                        detail.driver_id === "" ? (
                          <p className="text-xs text-orange-600">
                            Leave type automatically set to "Missed" when N/A is
                            selected
                          </p>
                        ) : (
                          <p className="text-xs text-blue-600">
                            Fleet report will be created for this driver
                          </p>
                        )}
                      </div>

                      {/* Leave Type */}
                      <div className="space-y-2">
                        <Label>Leave Type *</Label>
                        <Select
                          value={detail.leave_type}
                          onValueChange={(value: "leave" | "missed") =>
                            handleLeaveDetailChange(index, "leave_type", value)
                          }
                          disabled={
                            !detail.driver_id || detail.driver_id === ""
                          }
                        >
                          <SelectTrigger
                            className={
                              !detail.driver_id || detail.driver_id === ""
                                ? "bg-gray-100"
                                : ""
                            }
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                          </SelectContent>
                        </Select>
                        {(!detail.driver_id || detail.driver_id === "") && (
                          <p className="text-xs text-gray-500">
                            Leave type is "Missed" when N/A driver is selected
                          </p>
                        )}
                        {detail.driver_id && detail.driver_id !== "" && (
                          <p className="text-xs text-blue-600">
                            Select "Leave" to create fleet report for driver
                          </p>
                        )}
                      </div>

                      {/* Shift Selection */}
                      <div className="space-y-2">
                        <Label>Shift</Label>
                        <Select
                          value={detail.shift}
                          onValueChange={(value) =>
                            handleLeaveDetailChange(index, "shift", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="night">Night</SelectItem>
                            <SelectItem value="24hr">24 Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Reason */}
                      <div className="space-y-2 md:col-span-2">
                        <Label>Reason / Notes</Label>
                        <Textarea
                          value={detail.reason}
                          onChange={(e) =>
                            handleLeaveDetailChange(
                              index,
                              "reason",
                              e.target.value
                            )
                          }
                          placeholder="Enter reason for leave/missed shift..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              {isEditMode && (
                <Button
                  variant="outline"
                  onClick={handleNewReport}
                  disabled={submitting}
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="min-w-[150px]"
              >
                {submitting
                  ? isEditMode
                    ? "Updating..."
                    : "Submitting..."
                  : isEditMode
                  ? "Update Report"
                  : "Submit Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ShiftLeaveManagement;
