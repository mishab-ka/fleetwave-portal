import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Clock,
  Users,
  Car,
  ArrowRight,
  Plus,
  Edit,
  Wifi,
  WifiOff,
  PhoneCall,
  AlertTriangle,
  AlertCircle,
  GripVertical,
  Move,
  Search,
  BadgeCheck,
  Copy,
  Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  processReportData,
  determineOverdueStatus,
} from "@/components/admin/calendar/CalendarUtils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Driver {
  id: string;
  name: string;
  online: boolean;
  vehicle_number?: string;
  shift?: string;
  is_verified?: boolean;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  online: boolean;
  online_drivers_count?: number;
  max_allowed?: number;
  available_slots?: number;
  is_full?: boolean;
  assigned_drivers?: string;
}

interface ShiftAssignment {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: "morning" | "night";
  start_time: string;
  end_time: string;
  online: boolean;
  phone_number?: string;
  is_verified?: boolean;
  user_driver_id?: string; // The actual driver_id from users table
}

interface VehicleGroup {
  vehicle_number: string;
  morningDriver?: ShiftAssignment;
  nightDriver?: ShiftAssignment;
}

const ShiftManagement = () => {
  const [currentShifts, setCurrentShifts] = useState<ShiftAssignment[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftAssignment[]>([]);
  const [noShiftDrivers, setNoShiftDrivers] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedShiftType, setSelectedShiftType] = useState<
    "morning" | "night" | "none"
  >("morning");
  const [editingShift, setEditingShift] = useState<ShiftAssignment | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    vehicle: string;
    currentDrivers: string[];
    message: string;
  } | null>(null);
  const [showOverdueWarning, setShowOverdueWarning] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [copiedDriverId, setCopiedDriverId] = useState<string | null>(null);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [overdueDriverName, setOverdueDriverName] = useState("");
  const [showLeaveResigningModal, setShowLeaveResigningModal] = useState(false);
  const [selectedDriverForStatus, setSelectedDriverForStatus] =
    useState<any>(null);
  const [showResignationReasonModal, setShowResignationReasonModal] =
    useState(false);
  const [resignationReason, setResignationReason] = useState("");
  const [showLeaveReturnDateModal, setShowLeaveReturnDateModal] =
    useState(false);
  const [leaveReturnDate, setLeaveReturnDate] = useState<Date | null>(null);
  const [draggedDriver, setDraggedDriver] = useState<ShiftAssignment | null>(
    null
  );
  const [dragOverTarget, setDragOverTarget] = useState<{
    vehicle: string;
    shift: "morning" | "night" | "none";
  } | null>(null);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState<string>("");
  const [shiftCounts, setShiftCounts] = useState({
    morning: 0,
    night: 0,
    noShift: 0,
  });

  const handleCopyDriverId = async (driverId: string) => {
    try {
      await navigator.clipboard.writeText(driverId);
      setCopiedDriverId(driverId);
      toast.success("Driver ID copied to clipboard");
      setTimeout(() => setCopiedDriverId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy Driver ID");
    }
  };

  const fetchShiftCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("shift")
        .eq("role", "user")
        .eq("online", true)
        .is("resigning_date", null);

      if (error) throw error;

      let morning = 0;
      let night = 0;
      let noShift = 0;
      (data || []).forEach((row) => {
        const s = (row.shift || "").toLowerCase().trim();
        if (s === "morning") morning++;
        else if (s === "night") night++;
        else noShift++;
      });
      setShiftCounts({ morning, night, noShift });
    } catch (e) {
      console.warn("Failed to fetch shift counts:", e);
    }
  };

  useEffect(() => {
    fetchDriversAndVehicles();
    updateShiftAssignments();
    fetchShiftCounts();
    const interval = setInterval(() => {
      updateShiftAssignments();
      fetchShiftCounts();
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Monitor dialog state changes
  useEffect(() => {
    console.log("showErrorDialog state changed:", showErrorDialog);
    if (showErrorDialog) {
      console.log("Error details:", errorDetails);
    }
  }, [showErrorDialog, errorDetails]);

  const fetchDriversAndVehicles = async () => {
    try {
      // Fetch online drivers
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select(
          "id, name, online, driver_id, phone_number, vehicle_number, shift, is_verified"
        )
        .eq("online", true)
        .eq("role", "user");

      if (driversError) throw driversError;

      // Fetch available vehicles with assignment status
      const { data: vehiclesData, error: vehiclesError } = await supabase.rpc(
        "get_vehicle_assignment_status"
      );

      if (vehiclesError) throw vehiclesError;

      setOnlineDrivers(
        driversData?.map((driver) => ({
          id: driver.id,
          name: driver.name || driver.driver_id,
          online: driver.online,
          vehicle_number: driver.vehicle_number,
          shift: driver.shift,
          is_verified: driver.is_verified || false,
        })) || []
      );

      setAvailableVehicles(
        vehiclesData?.map((vehicle) => ({
          id: vehicle.vehicle_number || "",
          vehicle_number: vehicle.vehicle_number,
          online: true, // All vehicles from the function are online
          online_drivers_count: vehicle.online_drivers_count,
          max_allowed: vehicle.max_allowed,
          available_slots: vehicle.available_slots,
          is_full: vehicle.is_full,
          assigned_drivers: vehicle.assigned_drivers,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching drivers and vehicles:", error);
      toast.error("Failed to load drivers and vehicles data");
    } finally {
      setLoading(false);
    }
  };

  const updateShiftAssignments = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const isCurrentShiftMorning = currentHour >= 4 && currentHour < 16;
    const currentShiftType = isCurrentShiftMorning ? "morning" : "night";
    const upcomingShiftType = isCurrentShiftMorning ? "night" : "morning";

    try {
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("users")
        .select(
          "id, name, driver_id, vehicle_number, online, shift, phone_number, is_verified"
        )
        .eq("online", true)
        .eq("role", "user");

      if (shiftsError) throw shiftsError;

      const currentShiftAssignments = shiftsData
        ?.filter((user) => user.shift === currentShiftType)
        .map((user) => ({
          id: user.id,
          driver_id: user.id,
          driver_name: user.name || user.driver_id,
          vehicle_number: user.vehicle_number || "",
          shift_type: user.shift as "morning" | "night",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          online: user.online,
          phone_number: user.phone_number,
          is_verified: user.is_verified || false,
          user_driver_id: user.driver_id, // The actual driver_id from users table
        }));

      console.log("Current Shift Assignments:", currentShiftAssignments);

      const upcomingShiftAssignments = shiftsData
        ?.filter((user) => user.shift === upcomingShiftType)
        .map((user) => ({
          id: user.id,
          driver_id: user.id,
          driver_name: user.name || user.driver_id,
          vehicle_number: user.vehicle_number || "",
          shift_type: user.shift as "morning" | "night",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          online: user.online,
          phone_number: user.phone_number,
          is_verified: user.is_verified || false,
          user_driver_id: user.driver_id, // The actual driver_id from users table
        }));

      // Get drivers with no shift (null or empty)
      const noShiftAssignments = shiftsData
        ?.filter(
          (user) => !user.shift || user.shift === "none" || user.shift === ""
        )
        .map((user) => ({
          id: user.id,
          driver_id: user.id,
          driver_name: user.name || user.driver_id,
          vehicle_number: user.vehicle_number || "",
          shift_type: "morning" as "morning" | "night", // Default value
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          online: user.online,
          phone_number: user.phone_number,
          is_verified: user.is_verified || false,
          user_driver_id: user.driver_id, // The actual driver_id from users table
        }));

      setCurrentShifts(currentShiftAssignments || []);
      setUpcomingShifts(upcomingShiftAssignments || []);
      setNoShiftDrivers(noShiftAssignments || []);
      await fetchShiftCounts();
    } catch (error) {
      console.error("Error updating shift assignments:", error);
      toast.error("Failed to update shift assignments");
    }
  };

  const getDriverBlockingIssues = async (
    driver: any
  ): Promise<{
    overdueCount: number;
    rejectedCount: number;
  }> => {
    if (!driver) return { overdueCount: 0, rejectedCount: 0 };

    try {
      const today = new Date();

      // Determine start date: last 30 days or from joining date, whichever is later
      const baseStart = new Date();
      baseStart.setDate(baseStart.getDate() - 30);

      const joiningDate = driver.joining_date
        ? new Date(driver.joining_date)
        : null;

      let startDate = baseStart;
      if (joiningDate && joiningDate > startDate) {
        startDate = new Date(
          joiningDate.getFullYear(),
          joiningDate.getMonth(),
          joiningDate.getDate()
        );
      }

      const endDate = today;
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      // Fetch all reports for this driver in the date range
      const { data: reports, error: reportsError } = await supabase
        .from("fleet_reports")
        .select(
          `
          *,
          users:user_id (
            id,
            name,
            online,
            joining_date,
            offline_from_date,
            online_from_date,
            shift
          )
        `
        )
        .eq("user_id", driver.id)
        .gte("rent_date", startDateStr)
        .lte("rent_date", endDateStr)
        .order("rent_date", { ascending: true });

      if (reportsError) throw reportsError;

      // Group reports by date
      const reportsByDate: Record<string, any[]> = {};
      reports?.forEach((report) => {
        const dateStr = report.rent_date;
        if (!reportsByDate[dateStr]) {
          reportsByDate[dateStr] = [];
        }
        reportsByDate[dateStr].push(report);
      });

      let overdueCount = 0;
      let rejectedCount = 0;
      const cursor = new Date(startDate);

      // Iterate each day in the range and apply same logic as calendar:
      while (cursor <= today) {
        const dateStr = cursor.toISOString().split("T")[0];
        const dayReports = reportsByDate[dateStr];

        if (dayReports && dayReports.length > 0) {
          dayReports.forEach((report) => {
            const processed = processReportData(report);
            if (processed.status === "overdue") {
              overdueCount += 1;
            } else if (processed.status === "rejected") {
              rejectedCount += 1;
            }
          });
        } else {
          // No report for this date – use calendar overdue rules for empty days
          // For drivers with no shift, still check for overdue using default deadline
          const driverShift = driver.shift || "none";
          const status = determineOverdueStatus(
            dateStr,
            driverShift,
            driver.joining_date || undefined,
            driver.online,
            driver.offline_from_date || undefined,
            driver.online_from_date || undefined
          );
          if (status === "overdue") {
            overdueCount += 1;
          }
        }

        cursor.setDate(cursor.getDate() + 1);
      }

      return { overdueCount, rejectedCount };
    } catch (error) {
      console.error("Error checking blocking issues:", error);
      return { overdueCount: 0, rejectedCount: 0 };
    }
  };

  const handleToggleOnline = async (
    driverId: string,
    currentStatus: boolean
  ) => {
    // If trying to take driver offline, check for overdue reports
    if (currentStatus) {
      // Find the driver in current shifts, upcoming shifts, or no shift drivers
      const driver = [
        ...currentShifts,
        ...upcomingShifts,
        ...noShiftDrivers,
      ].find((d) => d.id === driverId);

      if (driver) {
        // Get full driver data from database
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("*")
          .eq("id", driverId)
          .single();

        if (!driverError && driverData) {
          const blockingIssues = await getDriverBlockingIssues(driverData);
          if (
            blockingIssues.overdueCount > 0 ||
            blockingIssues.rejectedCount > 0
          ) {
            setOverdueCount(blockingIssues.overdueCount);
            setRejectedCount(blockingIssues.rejectedCount);
            setOverdueDriverName(
              driverData?.name || driverData?.driver_id || "Unknown Driver"
            );
            setShowOverdueWarning(true);
            return; // Block offline action when overdue or rejected reports exist
          }

          // No overdue/rejected, show leave/resigning/offline status modal
          setSelectedDriverForStatus(driverData);
          setShowLeaveResigningModal(true);
          return; // Don't proceed with offline action yet
        }
      }
    }

    try {
      setIsUpdating(driverId);
      const { error } = await supabase
        .from("users")
        .update({ online: !currentStatus })
        .eq("id", driverId);

      if (error) throw error;

      // Log the driver ID being toggled
      console.log("Toggling online status for driver:", driverId);

      // Update shifts in state to reflect the change
      setCurrentShifts((prev) =>
        prev.map((shift) =>
          shift.id === driverId ? { ...shift, online: !currentStatus } : shift
        )
      );

      setUpcomingShifts((prev) =>
        prev.map((shift) =>
          shift.id === driverId ? { ...shift, online: !currentStatus } : shift
        )
      );

      // If toggling offline, remove from online drivers list
      if (currentStatus) {
        setOnlineDrivers((prev) =>
          prev.filter((driver) => driver.id !== driverId)
        );
      }

      await Promise.all([updateShiftAssignments(), fetchDriversAndVehicles()]);

      toast.success(`Driver is now ${!currentStatus ? "online" : "offline"}`);
    } catch (error) {
      console.error("Error updating online status:", error);
      toast.error("Failed to update online status");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleLeaveResigningSelection = async (
    status: "leave" | "resigning" | "offline"
  ) => {
    if (!selectedDriverForStatus) return;

    // If resigning, show reason popup first
    if (status === "resigning") {
      setShowLeaveResigningModal(false);
      setResignationReason("");
      setShowResignationReasonModal(true);
      return;
    }

    // If leave, show return date popup first
    if (status === "leave") {
      setShowLeaveResigningModal(false);
      setLeaveReturnDate(null);
      setShowLeaveReturnDateModal(true);
      return;
    }

    // For offline, proceed directly
    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowLeaveResigningModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
        driver_status: null, // Just offline, no status
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success(`Driver is now offline`);

      // Refresh data
      await Promise.all([updateShiftAssignments(), fetchDriversAndVehicles()]);
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
    }
  };

  const handleLeaveReturnDateSubmit = async () => {
    if (!selectedDriverForStatus) return;

    if (!leaveReturnDate) {
      toast.error("Please select a return date");
      return;
    }

    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowLeaveReturnDateModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
        driver_status: "leave",
        leave_return_date: format(leaveReturnDate, "yyyy-MM-dd"),
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success(
        `Driver is now on leave. Return date: ${format(
          leaveReturnDate,
          "dd MMM yyyy"
        )}`
      );

      // Refresh data
      await Promise.all([updateShiftAssignments(), fetchDriversAndVehicles()]);
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
      setLeaveReturnDate(null);
    }
  };

  const handleResignationSubmit = async () => {
    if (!selectedDriverForStatus) return;

    if (!resignationReason.trim()) {
      toast.error("Please provide a resignation reason");
      return;
    }

    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowResignationReasonModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
        driver_status: "resigning",
        resigning_date: new Date().toISOString().split("T")[0],
        resignation_reason: resignationReason.trim(),
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Driver status updated to resigning");

      // Refresh data
      await Promise.all([updateShiftAssignments(), fetchDriversAndVehicles()]);
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
      setResignationReason("");
    }
  };

  const handleToggleVehicleStatus = async (
    vehicleNumber: string,
    currentStatus: boolean
  ) => {
    try {
      setIsUpdating(vehicleNumber);

      const { error } = await supabase
        .from("vehicles")
        .update({ online: !currentStatus })
        .eq("vehicle_number", vehicleNumber);

      if (error) throw error;

      toast.success(
        `Vehicle ${vehicleNumber} is now ${
          !currentStatus ? "active" : "inactive"
        }`
      );

      // Refresh data
      await fetchDriversAndVehicles();
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      toast.error("Failed to update vehicle status");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEditShift = async () => {
    if (!editingShift || !selectedDriver) {
      toast.error("Please select a driver");
      return;
    }

    // Check for overdue reports if changing to "none" shift OR removing vehicle (N/A) with no shift
    const isRemovingShift = selectedShiftType === "none";
    const isRemovingVehicle = selectedVehicle === "No Vehicle";
    
    if (isRemovingShift) {
      try {
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("id, name, driver_id, shift, joining_date, online, offline_from_date, online_from_date")
          .eq("id", editingShift.id)
          .single();

        if (driverError) throw driverError;

        const blockingIssues = await getDriverBlockingIssues(driverData);
        if (blockingIssues.overdueCount > 0) {
          setOverdueCount(blockingIssues.overdueCount);
          setRejectedCount(0);
          setOverdueDriverName(
            driverData?.name || driverData?.driver_id || "Unknown Driver"
          );
          setShowOverdueWarning(true);
          return; // Block shift change to "none" when overdue reports exist
        }
      } catch (error) {
        console.error("Error checking for overdue reports:", error);
      }
    }

    // Handle "No Vehicle" selection or when shift is "none"
    if (selectedVehicle === "No Vehicle" || selectedShiftType === "none") {
      try {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            shift: selectedShiftType,
            vehicle_number: null,
          })
          .eq("id", editingShift.id);

        if (updateError) throw updateError;

        toast.success(
          selectedShiftType === "none"
            ? "Shift updated to 'No Shift' with vehicle cleared"
            : "Shift updated successfully without vehicle"
        );
        await updateShiftAssignments();
        setIsEditDialogOpen(false);
        setEditingShift(null);
        setSelectedDriver("");
        setSelectedVehicle("");
        return;
      } catch (error) {
        console.error("Error updating shift without vehicle:", error);
        toast.error("Failed to update shift");
        return;
      }
    }

    // Handle vehicle assignment
    if (!selectedVehicle) {
      toast.error("Please select a vehicle");
      return;
    }

    // Skip vehicle validation if "No Vehicle" is selected
    if (selectedVehicle !== "No Vehicle") {
      // Shift conflict validation for edit
      const currentDriversForVehicle = onlineDrivers.filter(
        (d) =>
          d.vehicle_number === selectedVehicle &&
          d.online &&
          d.id !== editingShift.id
      );

      // Check if there's already a driver with the same shift on this vehicle
      const existingDriverWithSameShift = currentDriversForVehicle.find(
        (d) => d.shift === selectedShiftType
      );

      console.log("Edit shift validation:", {
        vehicle: selectedVehicle,
        selectedShift: selectedShiftType,
        currentDrivers: currentDriversForVehicle.length,
        driverNames: currentDriversForVehicle.map((d) => d.name),
        existingDriverWithSameShift: existingDriverWithSameShift?.name,
      });

      // Check if there's already a driver with the same shift
      if (existingDriverWithSameShift) {
        toast.error(
          `Cannot assign ${selectedShiftType} shift driver to ${selectedVehicle}. Vehicle already has a ${selectedShiftType} shift driver: ${existingDriverWithSameShift.name}`
        );
        return;
      }
    }

    try {
      console.log("About to edit shift with vehicle:", selectedVehicle);
      const { error: updateError } = await supabase
        .from("users")
        .update({
          shift: selectedShiftType,
          vehicle_number:
            selectedVehicle === "No Vehicle" ? null : selectedVehicle,
        })
        .eq("id", editingShift.id);

      console.log("Edit shift update result:", { updateError });

      if (updateError) {
        console.log("Edit shift error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });

        // Check if this is a vehicle assignment limit error
        console.log("Checking edit shift error message:", updateError.message);
        console.log(
          "Error includes 'already has':",
          updateError.message.includes("already has")
        );
        console.log(
          "Error includes 'online drivers assigned':",
          updateError.message.includes("online drivers assigned")
        );

        if (
          updateError.message &&
          (updateError.message.includes("already has") ||
            updateError.message.includes("online drivers assigned") ||
            updateError.message.includes("Maximum allowed is 2"))
        ) {
          console.log("Vehicle assignment limit error detected in edit shift");

          // Extract vehicle number from error message
          const vehicleMatch = updateError.message.match(
            /Vehicle ([A-Z0-9]+) already has/
          );
          const vehicleNumber = vehicleMatch ? vehicleMatch[1] : "Unknown";

          // Get current drivers for this vehicle
          const currentDriversForVehicle = onlineDrivers.filter(
            (d) => d.vehicle_number === vehicleNumber && d.online
          );

          console.log("Setting error details for edit shift dialog:", {
            vehicle: vehicleNumber,
            currentDrivers: currentDriversForVehicle.map((d) => d.name),
            message: updateError.message,
          });

          setErrorDetails({
            vehicle: vehicleNumber,
            currentDrivers: currentDriversForVehicle.map((d) => d.name),
            message: updateError.message,
          });
          setShowErrorDialog(true);
          console.log("Edit shift dialog state set to true");
          return;
        }

        throw updateError;
      }

      await updateShiftAssignments();
      setIsEditDialogOpen(false);
      setEditingShift(null);
      setSelectedDriver("");
      setSelectedVehicle("");
      toast.success("Shift updated successfully");
    } catch (error: any) {
      console.error("Error updating shift:", error);

      // Check if this is a vehicle assignment limit error in catch block
      if (
        error.message &&
        (error.message.includes("already has") ||
          error.message.includes("online drivers assigned") ||
          error.message.includes("Maximum allowed is 2"))
      ) {
        console.log(
          "Vehicle assignment limit error detected in edit shift catch block:",
          error.message
        );

        // Extract vehicle number from error message
        const vehicleMatch = error.message.match(
          /Vehicle ([A-Z0-9]+) already has/
        );
        const vehicleNumber = vehicleMatch ? vehicleMatch[1] : "Unknown";

        // Get current drivers for this vehicle
        const currentDriversForVehicle = onlineDrivers.filter(
          (d) => d.vehicle_number === vehicleNumber && d.online
        );

        console.log("Setting error details in edit shift catch block:", {
          vehicle: vehicleNumber,
          currentDrivers: currentDriversForVehicle.map((d) => d.name),
          message: error.message,
        });

        setErrorDetails({
          vehicle: vehicleNumber,
          currentDrivers: currentDriversForVehicle.map((d) => d.name),
          message: error.message,
        });
        setShowErrorDialog(true);
        console.log("Edit shift dialog state set to true in catch block");
      } else {
        console.log(
          "Non-vehicle assignment error in edit shift:",
          error.message
        );
        toast.error("Failed to update shift");
      }
    }
  };

  const handleAssignShift = async () => {
    if (!selectedDriver) {
      toast.error("Please select a driver");
      return;
    }

    const driver = onlineDrivers.find((d) => d.id === selectedDriver);
    if (!driver) {
      toast.error("Invalid driver selection");
      return;
    }

    // Check for overdue reports if assigning "none" shift
    if (selectedShiftType === "none") {
      try {
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("id, name, driver_id, shift, joining_date, online, offline_from_date, online_from_date")
          .eq("id", driver.id)
          .single();

        if (driverError) throw driverError;

        const blockingIssues = await getDriverBlockingIssues(driverData);
        if (blockingIssues.overdueCount > 0) {
          setOverdueCount(blockingIssues.overdueCount);
          setRejectedCount(0);
          setOverdueDriverName(
            driverData?.name || driverData?.driver_id || "Unknown Driver"
          );
          setShowOverdueWarning(true);
          return; // Block shift assignment to "none" when overdue reports exist
        }
      } catch (error) {
        console.error("Error checking for overdue reports:", error);
      }
    }

    // Handle "No Vehicle" selection
    if (selectedVehicle === "No Vehicle") {
      try {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            shift: selectedShiftType,
            vehicle_number: null,
          })
          .eq("id", driver.id);

        if (updateError) throw updateError;

        toast.success(`Shift assigned to ${driver.name} without vehicle`);
        setShowDialog(false);
        setSelectedDriver("");
        setSelectedVehicle("");
        setSelectedShiftType("morning");
        await Promise.all([
          updateShiftAssignments(),
          fetchDriversAndVehicles(),
        ]);
        return;
      } catch (error) {
        console.error("Error assigning shift without vehicle:", error);
        toast.error("Failed to assign shift");
        return;
      }
    }

    // Handle vehicle assignment
    if (!selectedVehicle) {
      toast.error("Please select a vehicle");
      return;
    }

    const vehicle = availableVehicles.find(
      (v) => v.vehicle_number === selectedVehicle
    );

    if (!vehicle) {
      toast.error("Invalid vehicle selection");
      return;
    }

    // Double-check if driver is already assigned to this vehicle
    const isAlreadyAssigned = driver.vehicle_number === vehicle.vehicle_number;
    if (isAlreadyAssigned) {
      toast.error(
        `Driver ${driver.name} is already assigned to vehicle ${vehicle.vehicle_number}`
      );
      return;
    }

    // Check if vehicle is already full
    if (vehicle.is_full) {
      const assignedDrivers = vehicle.assigned_drivers || "Unknown drivers";
      toast.error(
        `Vehicle ${vehicle.vehicle_number} is in use. Already assigned to: ${assignedDrivers}`
      );
      return;
    }

    // Additional validation: Check if vehicle will exceed 2 drivers
    if (vehicle.online_drivers_count && vehicle.online_drivers_count >= 2) {
      const assignedDrivers = vehicle.assigned_drivers || "Unknown drivers";
      toast.error(
        `Cannot assign driver to ${vehicle.vehicle_number}. Vehicle already has 2 online drivers: ${assignedDrivers}`
      );
      return;
    }

    // Real-time validation: Check shift conflicts for this vehicle
    const currentDriversForVehicle = onlineDrivers.filter(
      (d) => d.vehicle_number === vehicle.vehicle_number && d.online
    );

    // Check if there's already a driver with the same shift on this vehicle
    const existingDriverWithSameShift = currentDriversForVehicle.find(
      (d) => d.shift === selectedShiftType
    );

    console.log("Vehicle assignment validation:", {
      vehicle: vehicle.vehicle_number,
      selectedShift: selectedShiftType,
      currentDrivers: currentDriversForVehicle.length,
      driverNames: currentDriversForVehicle.map((d) => d.name),
      existingDriverWithSameShift: existingDriverWithSameShift?.name,
      vehicleData: vehicle,
    });

    // Check if vehicle already has 2 drivers (morning + night)
    if (currentDriversForVehicle.length >= 2) {
      const driverNames = currentDriversForVehicle
        .map((d) => d.name)
        .join(", ");
      toast.error(
        `Cannot assign driver to ${vehicle.vehicle_number}. Vehicle already has 2 online drivers: ${driverNames}`
      );
      return;
    }

    // Check if there's already a driver with the same shift
    if (existingDriverWithSameShift) {
      toast.error(
        `Cannot assign ${selectedShiftType} shift driver to ${vehicle.vehicle_number}. Vehicle already has a ${selectedShiftType} shift driver: ${existingDriverWithSameShift.name}`
      );
      return;
    }

    try {
      // Check vehicle assignment limit using database function (if available)
      try {
        const { data: limitCheck, error: limitError } = await supabase.rpc(
          "check_vehicle_assignment_limit",
          {
            p_vehicle_number: vehicle.vehicle_number,
            p_driver_id: driver.id,
          }
        );

        if (limitError) {
          console.log(
            "Database function not available, using frontend validation only"
          );
        } else if (
          limitCheck &&
          limitCheck.length > 0 &&
          !limitCheck[0].can_assign
        ) {
          toast.error(limitCheck[0].message);
          return;
        }
      } catch (dbError) {
        console.log(
          "Database function error, using frontend validation:",
          dbError
        );
        // Continue with frontend validation only
      }

      // Update user's shift and vehicle assignment
      console.log("About to update user with vehicle:", vehicle.vehicle_number);
      const { error: updateError } = await supabase
        .from("users")
        .update({
          shift: selectedShiftType,
          vehicle_number: vehicle.vehicle_number,
        })
        .eq("id", driver.id);

      console.log("Update result:", { updateError });

      if (updateError) {
        console.log("Update error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });

        // Check if this is a vehicle assignment limit error
        console.log("Checking error message:", updateError.message);
        console.log(
          "Error includes 'already has':",
          updateError.message.includes("already has")
        );
        console.log(
          "Error includes 'online drivers assigned':",
          updateError.message.includes("online drivers assigned")
        );

        if (
          updateError.message &&
          (updateError.message.includes("already has") ||
            updateError.message.includes("online drivers assigned"))
        ) {
          console.log("Vehicle assignment limit error detected in updateError");

          // Extract vehicle number from error message
          const vehicleMatch = updateError.message.match(
            /Vehicle ([A-Z0-9]+) already has/
          );
          const vehicleNumber = vehicleMatch ? vehicleMatch[1] : "Unknown";

          // Get current drivers for this vehicle
          const currentDriversForVehicle = onlineDrivers.filter(
            (d) => d.vehicle_number === vehicleNumber && d.online
          );

          console.log("Setting error details for dialog:", {
            vehicle: vehicleNumber,
            currentDrivers: currentDriversForVehicle.map((d) => d.name),
            message: updateError.message,
          });

          setErrorDetails({
            vehicle: vehicleNumber,
            currentDrivers: currentDriversForVehicle.map((d) => d.name),
            message: updateError.message,
          });
          setShowErrorDialog(true);
          console.log("Dialog state set to true");
          return;
        }

        // If it's not a vehicle assignment error, throw it
        console.log("Throwing non-vehicle assignment error");
        throw updateError;
      }

      // Update shift assignments
      await updateShiftAssignments();

      setShowDialog(false);
      setSelectedDriver("");
      setSelectedVehicle("");
      toast.success("Shift assigned successfully");
    } catch (error: any) {
      console.error("Error assigning shift:", error);

      // Check if this is a vehicle assignment limit error
      console.log("Catch block error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (
        error.message &&
        (error.message.includes("already has") ||
          error.message.includes("online drivers assigned") ||
          error.message.includes("Maximum allowed is 2"))
      ) {
        console.log(
          "Vehicle assignment limit error detected in catch block:",
          error.message
        );

        // Extract vehicle number from error message
        const vehicleMatch = error.message.match(
          /Vehicle ([A-Z0-9]+) already has/
        );
        const vehicleNumber = vehicleMatch ? vehicleMatch[1] : "Unknown";

        // Get current drivers for this vehicle
        const currentDriversForVehicle = onlineDrivers.filter(
          (d) => d.vehicle_number === vehicleNumber && d.online
        );

        console.log("Setting error details in catch block:", {
          vehicle: vehicleNumber,
          currentDrivers: currentDriversForVehicle.map((d) => d.name),
          message: error.message,
        });

        setErrorDetails({
          vehicle: vehicleNumber,
          currentDrivers: currentDriversForVehicle.map((d) => d.name),
          message: error.message,
        });
        setShowErrorDialog(true);
        console.log("Dialog state set to true in catch block");
      } else {
        console.log("Non-vehicle assignment error:", error.message);
        toast.error("Failed to assign shift");
      }
    }
  };

  const getShiftTiming = (shiftType: "morning" | "night") => {
    return shiftType === "morning" ? "4:00 AM - 4:00 PM" : "4:00 PM - 4:00 AM";
  };

  const getNextShiftTime = (shiftType: "morning" | "night") => {
    const now = new Date();
    const currentHour = now.getHours();
    let nextShiftDate = new Date();

    if (shiftType === "morning") {
      // If current time is past 4 AM, set to next day
      if (currentHour >= 4) {
        nextShiftDate.setDate(nextShiftDate.getDate() + 1);
      }
      nextShiftDate.setHours(4, 0, 0, 0);
    } else {
      // If current time is past 4 PM, set to next day
      if (currentHour >= 16) {
        nextShiftDate.setDate(nextShiftDate.getDate() + 1);
      }
      nextShiftDate.setHours(16, 0, 0, 0);
    }

    return format(nextShiftDate, "PPp");
  };

  // Group drivers by vehicle
  const groupDriversByVehicle = (
    drivers: ShiftAssignment[]
  ): VehicleGroup[] => {
    const vehicleMap = new Map<string, VehicleGroup>();

    drivers.forEach((driver) => {
      if (!driver.vehicle_number) return;

      if (!vehicleMap.has(driver.vehicle_number)) {
        vehicleMap.set(driver.vehicle_number, {
          vehicle_number: driver.vehicle_number,
        });
      }

      const group = vehicleMap.get(driver.vehicle_number)!;
      if (driver.shift_type === "morning") {
        group.morningDriver = driver;
      } else {
        group.nightDriver = driver;
      }
    });

    return Array.from(vehicleMap.values());
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, driver: ShiftAssignment) => {
    setDraggedDriver(driver);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.innerHTML);
    // Add visual feedback
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
    setDraggedDriver(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (
    e: React.DragEvent,
    vehicle: string,
    shift: "morning" | "night" | "none"
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget({ vehicle, shift });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetVehicle: string,
    targetShift: "morning" | "night" | "none"
  ) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (!draggedDriver) return;

    // Handle "No Shift No Vehicle" drop
    if (targetVehicle === "no-shift-no-vehicle") {
      try {
        setIsUpdating(draggedDriver.id);

        // Check for overdue or rejected reports before allowing shift removal
        const { data: driverData } = await supabase
          .from("users")
          .select("name, driver_id")
          .eq("id", draggedDriver.id)
          .single();

        const { data: fullDriverData, error: driverError } = await supabase
          .from("users")
          .select("id, name, driver_id, shift, joining_date, online, offline_from_date, online_from_date")
          .eq("id", draggedDriver.id)
          .single();

        if (driverError) throw driverError;

        const blockingIssues = await getDriverBlockingIssues(fullDriverData);
        if (blockingIssues.overdueCount > 0) {
          setOverdueCount(blockingIssues.overdueCount);
          setRejectedCount(0);
          setOverdueDriverName(
            fullDriverData?.name || fullDriverData?.driver_id || "Unknown Driver"
          );
          setShowOverdueWarning(true);
          setIsUpdating(null);
          setDraggedDriver(null);
          return; // Block shift removal when overdue reports exist
        }

        // Update driver to remove shift and vehicle assignment
        const { error } = await supabase
          .from("users")
          .update({
            shift: null,
            vehicle_number: null,
          })
          .eq("id", draggedDriver.id);

        if (error) throw error;

        toast.success(
          `${draggedDriver.driver_name} removed from shift and vehicle assignment`
        );

        // Refresh data
        await updateShiftAssignments();
        await fetchDriversAndVehicles();
      } catch (error: any) {
        console.error("Error removing shift assignment:", error);
        toast.error("Failed to remove shift assignment");
      } finally {
        setIsUpdating(null);
        setDraggedDriver(null);
      }
      return;
    }

    // Don't do anything if dropped on same position
    if (
      draggedDriver.vehicle_number === targetVehicle &&
      draggedDriver.shift_type === targetShift
    ) {
      toast.info("Driver is already in this position");
      return;
    }

    // Check if target slot is occupied
    const allDrivers = [...currentShifts, ...upcomingShifts];
    const existingDriver = allDrivers.find(
      (d) => d.vehicle_number === targetVehicle && d.shift_type === targetShift
    );

    if (existingDriver) {
      toast.error(
        `${targetShift} shift on ${targetVehicle} is already assigned to ${existingDriver.driver_name}`
      );
      return;
    }

    try {
      setIsUpdating(draggedDriver.id);

      // Update driver's shift and vehicle
      const { error } = await supabase
        .from("users")
        .update({
          shift: targetShift,
          vehicle_number: targetVehicle,
        })
        .eq("id", draggedDriver.id);

      if (error) throw error;

      toast.success(
        `${draggedDriver.driver_name} assigned to ${targetShift} shift on ${targetVehicle}`
      );

      // Refresh data
      await updateShiftAssignments();
      await fetchDriversAndVehicles();
    } catch (error: any) {
      console.error("Error updating shift via drag and drop:", error);
      toast.error("Failed to assign shift");
    } finally {
      setIsUpdating(null);
      setDraggedDriver(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  // Calculate statistics
  const totalShifts = [...currentShifts, ...upcomingShifts].length;
  const totalNoShift = noShiftDrivers.length;
  const vehicleGroups = groupDriversByVehicle([
    ...currentShifts,
    ...upcomingShifts,
  ]);

  // Calculate total active vehicles (all online vehicles)
  const totalActiveVehicles = availableVehicles.filter((v) => v.online).length;

  // Calculate total slots based on all active vehicles (each has 2 slots: morning + night)
  const totalSlots = totalActiveVehicles * 2;
  const availableSlots = totalSlots - totalShifts;

  // Filter vehicles based on search query
  const filteredVehicles = availableVehicles.filter((vehicle) =>
    vehicle.vehicle_number
      .toLowerCase()
      .includes(vehicleSearchQuery.toLowerCase())
  );

  // Get all available vehicles from the database, not just from assigned drivers
  // This will show vehicles even if they don't have any drivers assigned yet

  return (
    <div className="space-y-6">
      {/* Total drivers by shift (Morning / Night / No Shift) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-100">
                  Total Morning Drivers
                </p>
                <p className="text-3xl font-bold">{shiftCounts.morning}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-100">
                  Total Night Drivers
                </p>
                <p className="text-3xl font-bold">{shiftCounts.night}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">
                  Total No Shift Drivers
                </p>
                <p className="text-3xl font-bold">{shiftCounts.noShift}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Total Assigned
                </p>
                <p className="text-3xl font-bold">{totalShifts}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">
                  Available Slots
                </p>
                <p className="text-3xl font-bold">{availableSlots}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">
                  No Shift (N/A)
                </p>
                <p className="text-3xl font-bold">{totalNoShift}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">
                  Total Vehicles
                </p>
                <p className="text-3xl font-bold">{totalActiveVehicles}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Car className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles with Available Slots (1 or 2 slots available) */}
      {availableVehicles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-cyan-500" />
                Vehicles with Available Shift Slots
              </CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search vehicles..."
                  value={vehicleSearchQuery}
                  onChange={(e) => setVehicleSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVehicles
                .map((vehicle) => {
                  // Find if this vehicle has any assigned drivers
                  const assignedDrivers = [
                    ...currentShifts,
                    ...upcomingShifts,
                  ].filter((d) => d.vehicle_number === vehicle.vehicle_number);
                  const morningDriver = assignedDrivers.find(
                    (d) => d.shift_type === "morning"
                  );
                  const nightDriver = assignedDrivers.find(
                    (d) => d.shift_type === "night"
                  );

                  // Only show if at least one slot is available (not both assigned)
                  const hasAvailableSlot = !morningDriver || !nightDriver;

                  return {
                    vehicle,
                    morningDriver,
                    nightDriver,
                    hasAvailableSlot,
                  };
                })
                .filter((item) => item.hasAvailableSlot)
                .map(({ vehicle, morningDriver, nightDriver }) => (
                  <Card
                    key={`vehicle-${vehicle.vehicle_number}`}
                    className="bg-white border-2 border-gray-300 hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-4">
                      {/* Vehicle Header with Status Toggle */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b-2 border-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-black rounded-lg">
                            <Car className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-black">
                            {vehicle.vehicle_number}
                          </span>
                        </div>

                        {/* Active/Inactive Toggle */}
                        <div className="flex items-center gap-1">
                          {isUpdating === vehicle.vehicle_number ? (
                            <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-gray-500 animate-spin"></div>
                          ) : (
                            <>
                              {vehicle.online ? (
                                <Wifi className="h-3 w-3 text-green-600" />
                              ) : (
                                <WifiOff className="h-3 w-3 text-red-600" />
                              )}
                              <Switch
                                checked={vehicle.online}
                                onCheckedChange={() =>
                                  handleToggleVehicleStatus(
                                    vehicle.vehicle_number,
                                    vehicle.online
                                  )
                                }
                                disabled={isUpdating === vehicle.vehicle_number}
                                className="data-[state=checked]:bg-green-500 scale-75"
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Shift Slots Status */}
                      <div className="space-y-2">
                        {/* Morning Slot */}
                        {morningDriver ? (
                          <div className="p-2 bg-gray-100 rounded-lg border border-gray-300 opacity-70">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-gray-400 text-white text-xs">
                                ☀️ Morning
                              </Badge>
                              <div className="flex items-center gap-1">
                                <div className="flex flex-col">
                                <span className="text-xs text-gray-700 font-medium truncate ml-2">
                                  {morningDriver.driver_name}
                                </span>
                                  {morningDriver.user_driver_id && (
                                    <div className="flex items-center gap-1 ml-2">
                                      <span className="text-[10px] font-mono text-gray-600">
                                        ID: {morningDriver.user_driver_id}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyDriverId(
                                            morningDriver.user_driver_id!
                                          );
                                        }}
                                        className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                        title="Copy Driver ID"
                                      >
                                        {copiedDriverId ===
                                        morningDriver.user_driver_id ? (
                                          <Check className="h-2.5 w-2.5 text-green-600" />
                                        ) : (
                                          <Copy className="h-2.5 w-2.5 text-gray-500" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {morningDriver.is_verified && (
                                  <BadgeCheck className="h-3 w-3 text-white bg-green-600 rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-gray-100 rounded-lg border-2 border-gray-400">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-600 text-white text-xs">
                                ☀️ Morning
                              </Badge>
                              <span className="text-xs text-gray-900 font-semibold">
                                Available
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Night Slot */}
                        {nightDriver ? (
                          <div className="p-2 bg-gray-100 rounded-lg border border-gray-300 opacity-70">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-gray-400 text-white text-xs">
                                🌙 Night
                              </Badge>
                              <div className="flex items-center gap-1">
                                <div className="flex flex-col">
                                <span className="text-xs text-gray-700 font-medium truncate ml-2">
                                  {nightDriver.driver_name}
                                </span>
                                  {nightDriver.user_driver_id && (
                                    <div className="flex items-center gap-1 ml-2">
                                      <span className="text-[10px] font-mono text-gray-600">
                                        ID: {nightDriver.user_driver_id}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyDriverId(
                                            nightDriver.user_driver_id!
                                          );
                                        }}
                                        className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                        title="Copy Driver ID"
                                      >
                                        {copiedDriverId ===
                                        nightDriver.user_driver_id ? (
                                          <Check className="h-2.5 w-2.5 text-green-600" />
                                        ) : (
                                          <Copy className="h-2.5 w-2.5 text-gray-500" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {nightDriver.is_verified && (
                                  <BadgeCheck className="h-3 w-3 text-white bg-green-600 rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-gray-100 rounded-lg border-2 border-gray-400">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-600 text-white text-xs">
                                🌙 Night
                              </Badge>
                              <span className="text-xs text-gray-900 font-semibold">
                                Available
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary Badges */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div
                          className={`text-xs font-semibold rounded px-2 py-1 flex items-center gap-1 ${
                            vehicle.online
                              ? "bg-green-200 text-green-700"
                              : "bg-red-200 text-red-700"
                          }`}
                        >
                          {vehicle.online ? (
                            <>
                              <Wifi className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-700 font-semibold bg-gray-200 rounded px-2 py-1">
                          {!morningDriver && !nightDriver
                            ? "2 slots"
                            : morningDriver && nightDriver
                            ? "Full"
                            : "1 slot"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Shift No Vehicle Drop Zone */}
      <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600">
            <AlertTriangle className="h-5 w-5" />
            No Shift No Vehicle
          </CardTitle>
          <p className="text-sm text-gray-500">
            Drag drivers here to remove their shift and vehicle assignments
          </p>
        </CardHeader>
        <CardContent>
          <div
            className={`min-h-[120px] p-6 rounded-lg border-2 border-dashed transition-all ${
              dragOverTarget?.vehicle === "no-shift-no-vehicle"
                ? "border-red-500 bg-red-100 scale-105 shadow-lg"
                : "border-gray-400 bg-gray-50"
            }`}
            onDragOver={(e) => handleDragOver(e, "no-shift-no-vehicle", "none")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "no-shift-no-vehicle", "none")}
          >
            {dragOverTarget?.vehicle === "no-shift-no-vehicle" ? (
              <div className="text-center text-red-700 font-bold flex items-center justify-center gap-2 h-full">
                <Move className="h-6 w-6" />
                Drop here to remove shift and vehicle
              </div>
            ) : (
              <div className="text-center text-gray-500 italic h-full flex items-center justify-center">
                Drag drivers here to unassign them from shifts and vehicles
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drivers with No Shift */}
      {noShiftDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Drivers Without Shift Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {noShiftDrivers.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="bg-white border-2 border-gray-300 shadow-md hover:shadow-xl transition-shadow cursor-move"
                  draggable
                  onDragStart={(e) => handleDragStart(e, assignment)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-700 cursor-grab" />
                        <Badge
                          variant="secondary"
                          className="bg-gray-700 text-white border-0"
                        >
                          ⚠️ N/A
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async (e) => {
                            e.stopPropagation();
                            
                            // Check for overdue reports before opening edit dialog
                            try {
                              const { data: driverData, error: driverError } = await supabase
                                .from("users")
                                .select("id, name, driver_id, shift, joining_date, online, offline_from_date, online_from_date")
                                .eq("id", assignment.id)
                                .single();

                              if (driverError) throw driverError;

                              const blockingIssues = await getDriverBlockingIssues(driverData);
                              if (blockingIssues.overdueCount > 0) {
                                setOverdueCount(blockingIssues.overdueCount);
                                setRejectedCount(0);
                                setOverdueDriverName(
                                  driverData?.name || driverData?.driver_id || "Unknown Driver"
                                );
                                setShowOverdueWarning(true);
                                return; // Block edit dialog from opening
                              }
                            } catch (error) {
                              console.error("Error checking for overdue reports:", error);
                            }

                            setEditingShift(assignment);
                            setSelectedDriver(assignment.id);
                            setSelectedVehicle(assignment.vehicle_number || "");
                            setSelectedShiftType("morning");
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {assignment.phone_number && (
                          <a
                            href={`tel://${assignment.phone_number}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isUpdating === assignment.id ? (
                          <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-gray-500 animate-spin"></div>
                        ) : (
                          <>
                            {assignment.online ? (
                              <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                            <Switch
                              checked={assignment.online}
                              onCheckedChange={() =>
                                handleToggleOnline(
                                  assignment.id,
                                  assignment.online
                                )
                              }
                              disabled={isUpdating === assignment.id}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-700" />
                        <div className="flex flex-col">
                        <span className="font-semibold text-black">
                          {assignment.driver_name}
                        </span>
                          {assignment.user_driver_id && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-gray-600">
                                ID: {assignment.user_driver_id}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyDriverId(
                                    assignment.user_driver_id!
                                  );
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                title="Copy Driver ID"
                              >
                                {copiedDriverId === assignment.user_driver_id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 text-gray-500" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        {assignment.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-white bg-green-600 rounded-full " />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-700" />
                        <span className="text-black font-medium">
                          {assignment.vehicle_number || "Not assigned"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 bg-gray-200 rounded px-2 py-1 font-semibold mt-2 flex items-center gap-1 justify-center border border-gray-300">
                        <Move className="h-3 w-3" />
                        Drag to assign shift
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple/90">
              <Plus className="h-4 w-4 mr-2" />
              Assign Shift (Manual)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign New Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Shift Type</label>
                <Select
                  value={selectedShiftType}
                  onValueChange={(value: "morning" | "night") =>
                    setSelectedShiftType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning Shift</SelectItem>
                    <SelectItem value="night">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Driver (No Shift Assigned)
                </label>
                <Select
                  value={selectedDriver}
                  onValueChange={setSelectedDriver}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {noShiftDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.driver_name}
                        {driver.user_driver_id
                          ? ` (ID: ${driver.user_driver_id})`
                          : ""}
                      </SelectItem>
                    ))}
                    {noShiftDrivers.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                        No drivers without shift assignments
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle</label>
                <Select
                  value={selectedVehicle}
                  onValueChange={setSelectedVehicle}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="no-vehicle" value="No Vehicle">
                      N/A
                    </SelectItem>
                    {availableVehicles.map((vehicle) => (
                      <SelectItem
                        key={vehicle.vehicle_number}
                        value={vehicle.vehicle_number}
                        disabled={vehicle.is_full}
                        className={vehicle.is_full ? "opacity-50" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{vehicle.vehicle_number}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground">
                              {vehicle.online_drivers_count}/
                              {vehicle.max_allowed} drivers
                            </span>
                            {vehicle.is_full && vehicle.assigned_drivers && (
                              <span className="text-xs text-red-500">
                                Assigned: {vehicle.assigned_drivers}
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicle && (
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const vehicle = availableVehicles.find(
                        (v) => v.vehicle_number === selectedVehicle
                      );
                      if (vehicle) {
                        if (vehicle.is_full) {
                          return `Vehicle is full (${
                            vehicle.online_drivers_count
                          }/${vehicle.max_allowed} drivers) - Assigned: ${
                            vehicle.assigned_drivers || "None"
                          }`;
                        } else {
                          return `Available slots: ${vehicle.available_slots}/${
                            vehicle.max_allowed
                          } drivers${
                            vehicle.assigned_drivers
                              ? ` - Current drivers: ${vehicle.assigned_drivers}`
                              : ""
                          }`;
                        }
                      }
                      return "";
                    })()}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleAssignShift}
                  className="bg-fleet-purple hover:bg-fleet-purple/90"
                >
                  Assign Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vehicles with Assigned Drivers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Assignments
            </CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search vehicles..."
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {groupDriversByVehicle([...currentShifts, ...upcomingShifts])
              .filter((vg) =>
                vg.vehicle_number
                  .toLowerCase()
                  .includes(vehicleSearchQuery.toLowerCase())
              )
              .map((vehicleGroup) => (
                <Card
                  key={vehicleGroup.vehicle_number}
                  className="bg-white border-2 border-gray-300 shadow-md hover:shadow-xl transition-shadow"
                >
                  <CardContent className="p-4">
                    {/* Vehicle Header */}
                    <div className="flex items-center justify-center gap-2 mb-4 pb-3 border-b-2 border-gray-300">
                      <div className="p-2 bg-black rounded-lg">
                        <Car className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-black">
                        {vehicleGroup.vehicle_number}
                      </span>
                    </div>

                    {/* Morning Shift Driver - Drop Zone */}
                    <div
                      className={`mb-3 p-3 bg-gray-100 rounded-lg border-2 transition-all ${
                        dragOverTarget?.vehicle ===
                          vehicleGroup.vehicle_number &&
                        dragOverTarget?.shift === "morning"
                          ? "border-black border-dashed bg-gray-200 scale-105 shadow-lg"
                          : "border-gray-400"
                      }`}
                      onDragOver={(e) =>
                        handleDragOver(
                          e,
                          vehicleGroup.vehicle_number,
                          "morning"
                        )
                      }
                      onDragLeave={handleDragLeave}
                      onDrop={(e) =>
                        handleDrop(e, vehicleGroup.vehicle_number, "morning")
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-700 text-white border-0">
                            ☀️ Morning (4AM-4PM)
                          </Badge>
                        </div>
                      </div>
                      {vehicleGroup.morningDriver ? (
                        <div
                          className="space-y-2 cursor-move hover:bg-gray-200 p-2 rounded transition-colors shadow-sm"
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, vehicleGroup.morningDriver!)
                          }
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-gray-700 cursor-grab" />
                              <Users className="h-4 w-4 text-gray-700" />
                              <div className="flex flex-col">
                              <span className="font-semibold text-black">
                                {vehicleGroup.morningDriver.driver_name}
                              </span>
                                {vehicleGroup.morningDriver.user_driver_id && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-mono text-gray-600">
                                      ID: {vehicleGroup.morningDriver.user_driver_id}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyDriverId(
                                          vehicleGroup.morningDriver.user_driver_id!
                                        );
                                      }}
                                      className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                      title="Copy Driver ID"
                                    >
                                      {copiedDriverId ===
                                      vehicleGroup.morningDriver.user_driver_id ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3 text-gray-500" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                              {vehicleGroup.morningDriver.is_verified && (
                                <BadgeCheck className="h-4 w-4 text-white bg-green-600 rounded-full" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {vehicleGroup.morningDriver.phone_number && (
                                <a
                                  href={`tel://${vehicleGroup.morningDriver.phone_number}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                  >
                                    <PhoneCall className="h-3 w-3" />
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  // Check for overdue reports before opening edit dialog
                                  try {
                                    const { data: driverData, error: driverError } = await supabase
                                      .from("users")
                                      .select("id, name, driver_id, shift, joining_date, online, offline_from_date, online_from_date")
                                      .eq("id", vehicleGroup.morningDriver!.id)
                                      .single();

                                    if (driverError) throw driverError;

                                    const blockingIssues = await getDriverBlockingIssues(driverData);
                                    if (blockingIssues.overdueCount > 0) {
                                      setOverdueCount(blockingIssues.overdueCount);
                                      setRejectedCount(0);
                                      setOverdueDriverName(
                                        driverData?.name || driverData?.driver_id || "Unknown Driver"
                                      );
                                      setShowOverdueWarning(true);
                                      return; // Block edit dialog from opening
                                    }
                                  } catch (error) {
                                    console.error("Error checking for overdue reports:", error);
                                  }

                                  setEditingShift(vehicleGroup.morningDriver!);
                                  setSelectedDriver(
                                    vehicleGroup.morningDriver!.id
                                  );
                                  setSelectedVehicle(
                                    vehicleGroup.vehicle_number
                                  );
                                  setSelectedShiftType("morning");
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {isUpdating === vehicleGroup.morningDriver.id ? (
                                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-gray-500 animate-spin"></div>
                              ) : (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Switch
                                    checked={vehicleGroup.morningDriver.online}
                                    onCheckedChange={() =>
                                      handleToggleOnline(
                                        vehicleGroup.morningDriver!.id,
                                        vehicleGroup.morningDriver!.online
                                      )
                                    }
                                    disabled={
                                      isUpdating ===
                                      vehicleGroup.morningDriver.id
                                    }
                                    className="data-[state=checked]:bg-green-500 scale-75"
                                  />
                                  {vehicleGroup.morningDriver.online ? (
                                    <Wifi className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <WifiOff className="h-3 w-3 text-red-600" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 font-medium italic text-center py-2">
                          {dragOverTarget?.vehicle ===
                            vehicleGroup.vehicle_number &&
                          dragOverTarget?.shift === "morning" ? (
                            <span className="text-black font-bold flex items-center justify-center gap-2">
                              <Move className="h-4 w-4" />
                              Drop here to assign
                            </span>
                          ) : (
                            "No driver assigned - Drag & drop here"
                          )}
                        </div>
                      )}
                    </div>

                    {/* Night Shift Driver - Drop Zone */}
                    <div
                      className={`p-3 bg-gray-100 rounded-lg border-2 transition-all ${
                        dragOverTarget?.vehicle ===
                          vehicleGroup.vehicle_number &&
                        dragOverTarget?.shift === "night"
                          ? "border-black border-dashed bg-gray-200 scale-105 shadow-lg"
                          : "border-gray-400"
                      }`}
                      onDragOver={(e) =>
                        handleDragOver(e, vehicleGroup.vehicle_number, "night")
                      }
                      onDragLeave={handleDragLeave}
                      onDrop={(e) =>
                        handleDrop(e, vehicleGroup.vehicle_number, "night")
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-700 text-white border-0">
                            🌙 Night (4PM-4AM)
                          </Badge>
                        </div>
                      </div>
                      {vehicleGroup.nightDriver ? (
                        <div
                          className="space-y-2 cursor-move hover:bg-gray-200 p-2 rounded transition-colors shadow-sm"
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, vehicleGroup.nightDriver!)
                          }
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-gray-700 cursor-grab" />
                              <Users className="h-4 w-4 text-gray-700" />
                              <div className="flex flex-col">
                              <span className="font-semibold text-black">
                                {vehicleGroup.nightDriver.driver_name}
                              </span>
                                {vehicleGroup.nightDriver.user_driver_id && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-mono text-gray-600">
                                      ID: {vehicleGroup.nightDriver.user_driver_id}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyDriverId(
                                          vehicleGroup.nightDriver.user_driver_id!
                                        );
                                      }}
                                      className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                      title="Copy Driver ID"
                                    >
                                      {copiedDriverId ===
                                      vehicleGroup.nightDriver.user_driver_id ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3 text-gray-500" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                              {vehicleGroup.nightDriver.is_verified && (
                                <BadgeCheck className="h-4 w-4 text-white bg-green-600 rounded-full" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {vehicleGroup.nightDriver.phone_number && (
                                <a
                                  href={`tel://${vehicleGroup.nightDriver.phone_number}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                  >
                                    <PhoneCall className="h-3 w-3" />
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  // Check for overdue reports before opening edit dialog
                                  try {
                                    const { data: driverData, error: driverError } = await supabase
                                      .from("users")
                                      .select("id, name, driver_id, shift, joining_date, online, offline_from_date, online_from_date")
                                      .eq("id", vehicleGroup.nightDriver!.id)
                                      .single();

                                    if (driverError) throw driverError;

                                    const blockingIssues = await getDriverBlockingIssues(driverData);
                                    if (blockingIssues.overdueCount > 0) {
                                      setOverdueCount(blockingIssues.overdueCount);
                                      setRejectedCount(0);
                                      setOverdueDriverName(
                                        driverData?.name || driverData?.driver_id || "Unknown Driver"
                                      );
                                      setShowOverdueWarning(true);
                                      return; // Block edit dialog from opening
                                    }
                                  } catch (error) {
                                    console.error("Error checking for overdue reports:", error);
                                  }

                                  setEditingShift(vehicleGroup.nightDriver!);
                                  setSelectedDriver(
                                    vehicleGroup.nightDriver!.id
                                  );
                                  setSelectedVehicle(
                                    vehicleGroup.vehicle_number
                                  );
                                  setSelectedShiftType("night");
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {isUpdating === vehicleGroup.nightDriver.id ? (
                                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-gray-500 animate-spin"></div>
                              ) : (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Switch
                                    checked={vehicleGroup.nightDriver.online}
                                    onCheckedChange={() =>
                                      handleToggleOnline(
                                        vehicleGroup.nightDriver!.id,
                                        vehicleGroup.nightDriver!.online
                                      )
                                    }
                                    disabled={
                                      isUpdating === vehicleGroup.nightDriver.id
                                    }
                                    className="data-[state=checked]:bg-green-500 scale-75"
                                  />
                                  {vehicleGroup.nightDriver.online ? (
                                    <Wifi className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <WifiOff className="h-3 w-3 text-red-600" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 font-medium italic text-center py-2">
                          {dragOverTarget?.vehicle ===
                            vehicleGroup.vehicle_number &&
                          dragOverTarget?.shift === "night" ? (
                            <span className="text-black font-bold flex items-center justify-center gap-2">
                              <Move className="h-4 w-4" />
                              Drop here to assign
                            </span>
                          ) : (
                            "No driver assigned - Drag & drop here"
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Shift Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift Type</label>
              <Select
                value={selectedShiftType}
                onValueChange={(value: "morning" | "night" | "none") => {
                  setSelectedShiftType(value);
                  // Automatically set vehicle to "No Vehicle" when shift is "none"
                  if (value === "none") {
                    setSelectedVehicle("No Vehicle");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                  <SelectItem value="none">No Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle</label>
              <Select
                value={selectedVehicle}
                onValueChange={setSelectedVehicle}
                disabled={selectedShiftType === "none"} // Disable vehicle selection when shift is "none"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="no-vehicle" value="No Vehicle">
                    N/A
                  </SelectItem>
                  {availableVehicles.map((vehicle) => (
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

            <div className="flex justify-end">
              <Button
                onClick={handleEditShift}
                className="bg-fleet-purple hover:bg-fleet-purple/90"
              >
                Update Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog for Vehicle Assignment Limit */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Car className="h-5 w-5" />
              Vehicle Assignment Limit Exceeded
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {errorDetails && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-red-500" />
                    <span className="font-medium">
                      Vehicle: {errorDetails.vehicle}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This vehicle already has the maximum number of online
                    drivers assigned.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Currently Assigned Drivers:
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2">
                    {errorDetails.currentDrivers.length > 0 ? (
                      errorDetails.currentDrivers.map((driver, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{driver}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No drivers found
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700 font-medium">
                    Error Details:
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {errorDetails.message}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>• Maximum 2 online drivers allowed per vehicle</p>
                  <p>• Only online drivers count toward the limit</p>
                  <p>• Offline drivers can be assigned without restriction</p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowErrorDialog(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overdue/Rejected Warning Popup */}
      <Dialog open={showOverdueWarning} onOpenChange={setShowOverdueWarning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Cannot Remove Driver from Shift/Vehicle
            </DialogTitle>
            <DialogDescription>
              This driver has overdue or rejected reports and cannot be removed from
              shift or vehicle assignments until all issues are resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Driver: {overdueDriverName}</span>
              </div>
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    Overdue Count: {overdueCount}
                  </span>
                </div>
              )}
              {rejectedCount > 0 && (
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    Rejected Count: {rejectedCount}
                  </span>
                </div>
              )}
              <p className="text-sm text-red-600 mt-2">
                Please ensure all overdue and rejected reports are resolved
                before removing this driver from shift or vehicle assignments.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                • Driver must submit all pending reports before shift/vehicle removal
              </p>
              <p>
                • You can review their reports in the calendar or reports section
              </p>
              <p>• Once all reports are submitted and approved, you can proceed</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOverdueWarning(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave/Resigning Selection Dialog */}
      <Dialog
        open={showLeaveResigningModal}
        onOpenChange={setShowLeaveResigningModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Users className="h-5 w-5" />
              Set Driver Status
            </DialogTitle>
            <DialogDescription>
              Please select the reason for taking{" "}
              {selectedDriverForStatus?.name || "this driver"} offline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <p className="text-sm text-indigo-600 mt-2">
                Select whether the driver is going on leave or resigning. This
                will help track driver status accurately.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("leave")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-orange-600">Leave</span>
                  <span className="text-sm text-gray-500">
                    Driver is going on leave
                  </span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("resigning")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-purple-600">
                    Resigning
                  </span>
                  <span className="text-sm text-gray-500">
                    Driver is resigning from the company
                  </span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("offline")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-gray-600">
                    Just Offline
                  </span>
                  <span className="text-sm text-gray-500">
                    No specific status, just taking offline
                  </span>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLeaveResigningModal(false);
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Return Date Dialog */}
      <Dialog
        open={showLeaveReturnDateModal}
        onOpenChange={setShowLeaveReturnDateModal}
      >
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Calendar className="h-5 w-5" />
              Set Leave Return Date
            </DialogTitle>
            <DialogDescription>
              Please select the expected return date for{" "}
              {selectedDriverForStatus?.name || "this driver"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                This return date will help you know when to call the driver to
                come back. You can view all drivers on leave with their return
                dates in the drivers list.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-return-date">Expected Return Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !leaveReturnDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {leaveReturnDate ? (
                      format(leaveReturnDate, "dd MMM yyyy")
                    ) : (
                      <span>Select return date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[100]"
                  align="start"
                  side="top"
                  sideOffset={4}
                  collisionPadding={8}
                >
                  <Calendar
                    mode="single"
                    selected={leaveReturnDate || undefined}
                    onSelect={(date) => setLeaveReturnDate(date || null)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                Select the date when the driver is expected to return from
                leave.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLeaveReturnDateModal(false);
                setLeaveReturnDate(null);
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLeaveReturnDateSubmit}
              disabled={
                isUpdating === selectedDriverForStatus?.id || !leaveReturnDate
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isUpdating === selectedDriverForStatus?.id
                ? "Saving..."
                : "Set Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resignation Reason Dialog */}
      <Dialog
        open={showResignationReasonModal}
        onOpenChange={setShowResignationReasonModal}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Users className="h-5 w-5" />
              Resignation Reason
            </DialogTitle>
            <DialogDescription>
              Please provide the reason for{" "}
              {selectedDriverForStatus?.name || "this driver"}'s resignation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <p className="text-sm text-purple-600 mt-2">
                This reason will be saved in the driver's record for future
                reference.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resignation-reason">Resignation Reason *</Label>
              <Textarea
                id="resignation-reason"
                placeholder="Enter the reason for resignation..."
                value={resignationReason}
                onChange={(e) => setResignationReason(e.target.value)}
                className="min-h-[120px]"
                required
              />
              <p className="text-xs text-gray-500">
                Please provide a clear reason for the driver's resignation.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowResignationReasonModal(false);
                setResignationReason("");
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResignationSubmit}
              disabled={
                isUpdating === selectedDriverForStatus?.id ||
                !resignationReason.trim()
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUpdating === selectedDriverForStatus?.id
                ? "Saving..."
                : "Save Resignation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftManagement;
