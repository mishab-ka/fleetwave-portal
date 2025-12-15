import React, { useState, useEffect } from "react";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import VehicleStatusModal from "./VehicleStatusModal";

type VehicleStatus =
  | "running"
  | "stopped"
  | "breakdown"
  | "leave"
  | "offline"
  | "swapped"
  | "not_active";
type ShiftType = "morning" | "night";

interface Vehicle {
  vehicle_number: string;
  total_trips: number;
  online: boolean;
  fleet_name: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  vehicle_number: string;
  date: string;
  status: VehicleStatus;
  shift: ShiftType;
  notes?: string;
}

interface FleetReport {
  id: string;
  vehicle_number: string;
  rent_date: string;
  shift: ShiftType;
  status: string;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
}

interface DefaultAttendanceRecord {
  status: VehicleStatus;
  shift: ShiftType;
  notes?: string;
}

interface ShiftData {
  morning: AttendanceRecord | DefaultAttendanceRecord;
  night: AttendanceRecord | DefaultAttendanceRecord;
}

const VehicleAttendanceCalendar = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [fleetReports, setFleetReports] = useState<FleetReport[]>([]);
  const [vehicleFirstReportDates, setVehicleFirstReportDates] = useState<
    Map<string, string>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedVehicleNumber, setSelectedVehicleNumber] =
    useState<string>("");
  const [selectedShift, setSelectedShift] = useState<ShiftType>("morning");
  const [selectedStatus, setSelectedStatus] =
    useState<VehicleStatus>("running");
  const [selectedNotes, setSelectedNotes] = useState("");
  // const [isAdmin, setIsAdmin] = useState(false);

  const currentDate = new Date();
  const weekStart = startOfWeek(addDays(currentDate, weekOffset * 7), {
    weekStartsOn: 1,
  });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const initializeData = async () => {
      // await checkAdminStatus();
      await fetchVehicles();
      await fetchAttendanceData();
      await fetchFleetReports();
      await fetchVehicleFirstReportDates();
    };
    initializeData();
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchAttendanceData();
    fetchFleetReports();
    fetchVehicleFirstReportDates();
  }, [weekOffset, selectedVehicle]);

  // const checkAdminStatus = async () => {
  //   try {
  //     if (!user?.id) {
  //       setIsAdmin(false);
  //       return;
  //     }

  //     const { data: userData, error } = await supabase
  //       .from("users")
  //       .select("role")
  //       .eq("id", user.id)
  //       .single();

  //     if (error) {
  //       console.error("Error checking admin status:", error);
  //       setIsAdmin(false);
  //       return;
  //     }
  //     const isadmin = userData?.role === "admin" ? true : false;

  //     setIsAdmin(isadmin);
  //   } catch (error) {
  //     console.error("Error checking admin status:", error);
  //     setIsAdmin(false);
  //   }
  // };

  const fetchVehicles = async () => {
    try {
      // Calculate the current week dates
      const currentDate = new Date();
      const currentWeekStart = startOfWeek(
        addDays(currentDate, weekOffset * 7),
        {
          weekStartsOn: 1,
        }
      );

      // Get all vehicles that have submitted reports in the current week
      const startDate = format(currentWeekStart, "yyyy-MM-dd");
      const endDate = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

      // Get unique vehicles that have reports in this week
      const { data: reportsData, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("vehicle_number")
        .gte("rent_date", startDate)
        .lte("rent_date", endDate)
        .eq("status", "approved");

      if (reportsError) throw reportsError;

      const vehiclesWithReports = [
        ...new Set(reportsData?.map((r) => r.vehicle_number) || []),
      ];

      if (vehiclesWithReports.length === 0) {
        setVehicles([]);
        return;
      }

      // Get vehicle details only for vehicles that have reports this week
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_number, total_trips, online, fleet_name, created_at")
        .in("vehicle_number", vehiclesWithReports)
        .order("vehicle_number");

      if (error) throw error;

      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    }
  };

  const fetchFleetReports = async () => {
    try {
      // Calculate the current week dates
      const currentDate = new Date();
      const currentWeekStart = startOfWeek(
        addDays(currentDate, weekOffset * 7),
        {
          weekStartsOn: 1,
        }
      );

      const startDate = format(currentWeekStart, "yyyy-MM-dd");
      const endDate = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

      let query = supabase
        .from("fleet_reports")
        .select(
          "id, vehicle_number, rent_date, shift, status, driver_name, total_trips, total_earnings"
        )
        .gte("rent_date", startDate)
        .lte("rent_date", endDate)
        .eq("status", "approved");

      if (selectedVehicle !== "all") {
        query = query.eq("vehicle_number", selectedVehicle);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFleetReports(data || []);
    } catch (error) {
      console.error("Error fetching fleet reports:", error);
      toast.error("Failed to load fleet reports");
    }
  };

  const fetchVehicleFirstReportDates = async () => {
    try {
      // Get the earliest rent_date for each vehicle
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("vehicle_number, rent_date")
        .eq("status", "approved")
        .order("rent_date", { ascending: true });

      if (error) throw error;

      // Create a map of vehicle_number to first report date
      const firstDatesMap = new Map<string, string>();
      data?.forEach((report) => {
        if (!firstDatesMap.has(report.vehicle_number)) {
          firstDatesMap.set(report.vehicle_number, report.rent_date);
        }
      });

      setVehicleFirstReportDates(firstDatesMap);
    } catch (error) {
      console.error("Error fetching vehicle first report dates:", error);
      toast.error("Failed to load vehicle history");
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      // Calculate the current week dates
      const currentDate = new Date();
      const currentWeekStart = startOfWeek(
        addDays(currentDate, weekOffset * 7),
        {
          weekStartsOn: 1,
        }
      );

      const startDate = format(currentWeekStart, "yyyy-MM-dd");
      const endDate = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

      let query = supabase
        .from("vehicle_attendance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

      if (selectedVehicle !== "all") {
        query = query.eq("vehicle_number", selectedVehicle);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: VehicleStatus, notes: string) => {
    try {
      // if (!isAdmin) {
      //   toast.error("Only admins can update vehicle status");
      //   return;
      // }

      if (!selectedVehicleNumber) {
        toast.error("Please select a vehicle");
        return;
      }

      // First, check if a record exists for this vehicle, date, and shift
      const { data: existingRecord, error: fetchError } = await supabase
        .from("vehicle_attendance")
        .select("id")
        .eq("vehicle_number", selectedVehicleNumber)
        .eq("date", selectedDate)
        .eq("shift", selectedShift)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      const { error } = await supabase.from("vehicle_attendance").upsert(
        {
          id: existingRecord?.id,
          vehicle_number: selectedVehicleNumber,
          date: selectedDate,
          shift: selectedShift,
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "vehicle_number,date,shift",
        }
      );

      if (error) throw error;

      // Update the local state immediately
      setAttendanceData((prev) => {
        const filtered = prev.filter(
          (record) =>
            !(
              record.vehicle_number === selectedVehicleNumber &&
              record.date === selectedDate &&
              record.shift === selectedShift
            )
        );
        return [
          ...filtered,
          {
            id: existingRecord?.id || crypto.randomUUID(),
            vehicle_number: selectedVehicleNumber,
            date: selectedDate,
            shift: selectedShift,
            status,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          },
        ];
      });

      toast.success("Status updated successfully");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "stopped":
        return "bg-yellow-100 text-yellow-800";
      case "breakdown":
        return "bg-red-100 text-red-800";
      case "leave":
        return "bg-blue-100 text-blue-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      case "swapped":
        return "bg-purple-100 text-purple-800";
      case "not_active":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: VehicleStatus) => {
    switch (status) {
      case "running":
        return "R";
      case "stopped":
        return "S";
      case "breakdown":
        return "B";
      case "leave":
        return "L";
      case "offline":
        return "O";
      case "swapped":
        return "SW";
      case "not_active":
        return "NA";
      default:
        return status;
    }
  };

  const getShiftDataForDate = (
    vehicleNumber: string,
    date: string
  ): ShiftData => {
    const dateString = format(parseISO(date), "yyyy-MM-dd");

    // Find the vehicle to get its info
    const vehicle = vehicles.find((v) => v.vehicle_number === vehicleNumber);
    const targetDate = new Date(dateString);
    const today = new Date();

    // Get the first report date for this vehicle (when it became active)
    const firstReportDate = vehicleFirstReportDates.get(vehicleNumber);
    const vehicleActiveDate = firstReportDate
      ? new Date(firstReportDate)
      : null;

    // Check if the date is before the vehicle became active (first report submission)
    const isBeforeVehicleActive =
      vehicleActiveDate && targetDate < vehicleActiveDate;

    // Check for existing attendance records first
    const morningAttendance = attendanceData.find(
      (record) =>
        record.vehicle_number === vehicleNumber &&
        record.date === dateString &&
        record.shift === "morning"
    );

    const nightAttendance = attendanceData.find(
      (record) =>
        record.vehicle_number === vehicleNumber &&
        record.date === dateString &&
        record.shift === "night"
    );

    // If attendance records exist, use them
    if (morningAttendance && nightAttendance) {
      return {
        morning: morningAttendance,
        night: nightAttendance,
      };
    }

    // Otherwise, determine status based on fleet reports
    const morningReport = fleetReports.find(
      (report) =>
        report.vehicle_number === vehicleNumber &&
        report.rent_date === dateString &&
        report.shift === "morning"
    );

    const nightReport = fleetReports.find(
      (report) =>
        report.vehicle_number === vehicleNumber &&
        report.rent_date === dateString &&
        report.shift === "night"
    );

    // Determine status based on various conditions
    const getStatusForShift = (hasReport: boolean) => {
      if (isBeforeVehicleActive) {
        return "not_active"; // Vehicle didn't start submitting reports yet
      }
      if (hasReport) {
        return "running"; // Report submitted
      }
      if (targetDate >= today) {
        return "offline"; // Current/future date, no report
      }
      // Check if vehicle is currently offline but had reports before
      if (!vehicle?.online) {
        return "swapped"; // Vehicle was swapped/replaced
      }
      return "stopped"; // Past date, no report, but vehicle was active
    };

    return {
      morning: morningAttendance || {
        status: getStatusForShift(!!morningReport),
        shift: "morning",
        notes: morningReport
          ? `Driver: ${morningReport.driver_name}, Trips: ${morningReport.total_trips}`
          : isBeforeVehicleActive
          ? "Vehicle not yet active"
          : "No report submitted",
      },
      night: nightAttendance || {
        status: getStatusForShift(!!nightReport),
        shift: "night",
        notes: nightReport
          ? `Driver: ${nightReport.driver_name}, Trips: ${nightReport.total_trips}`
          : isBeforeVehicleActive
          ? "Vehicle not yet active"
          : "No report submitted",
      },
    };
  };

  const calculateWeeklyStatistics = () => {
    const stats = {
      running: 0,
      stopped: 0,
      breakdown: 0,
      leave: 0,
      offline: 0,
      swapped: 0,
      not_active: 0,
      total: 0,
    };

    const filteredVehicles = vehicles.filter(
      (vehicle) =>
        selectedVehicle === "all" || vehicle.vehicle_number === selectedVehicle
    );

    filteredVehicles.forEach((vehicle) => {
      weekDays.forEach((day) => {
        const shiftData = getShiftDataForDate(
          vehicle.vehicle_number,
          day.toISOString()
        );

        // Count morning shift
        stats[shiftData.morning.status]++;
        stats.total++;

        // Count night shift
        stats[shiftData.night.status]++;
        stats.total++;
      });
    });

    return stats;
  };

  const weeklyStats = calculateWeeklyStatistics();

  const handleCellClick = (
    vehicleNumber: string,
    date: string,
    shift: ShiftType
  ) => {
    // if (!isAdmin) return;

    const shiftData = getShiftDataForDate(vehicleNumber, date);
    const attendance = shiftData[shift];

    setSelectedDate(format(parseISO(date), "yyyy-MM-dd"));
    setSelectedVehicleNumber(vehicleNumber);
    setSelectedShift(shift);
    setSelectedStatus(attendance.status);
    setSelectedNotes(attendance.notes || "");
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Weekly Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {weeklyStats.running}
            </div>
            <div className="text-sm text-muted-foreground">Running</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {weeklyStats.stopped}
            </div>
            <div className="text-sm text-muted-foreground">Stopped</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {weeklyStats.breakdown}
            </div>
            <div className="text-sm text-muted-foreground">Breakdown</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {weeklyStats.leave}
            </div>
            <div className="text-sm text-muted-foreground">Leave</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {weeklyStats.offline}
            </div>
            <div className="text-sm text-muted-foreground">Offline</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {weeklyStats.swapped}
            </div>
            <div className="text-sm text-muted-foreground">Swapped</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">
              {weeklyStats.not_active}
            </div>
            <div className="text-sm text-muted-foreground">Not Active</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">
              {weeklyStats.total}
            </div>
            <div className="text-sm text-muted-foreground">Total Shifts</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center justify-between gap-4">
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem
                  key={vehicle.vehicle_number}
                  value={vehicle.vehicle_number}
                >
                  {vehicle.vehicle_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset(weekOffset - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset(weekOffset + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium">Legend:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-green-500"></span>
            <p className="text-sm">R = Running</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-yellow-500"></span>
            <p className="text-sm">S = Stopped</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-red-500"></span>
            <p className="text-sm">B = Breakdown</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-blue-500"></span>
            <p className="text-sm">L = Leave</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-gray-500"></span>
            <p className="text-sm">O = Offline</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-purple-500"></span>
            <p className="text-sm">SW = Swapped</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm h-4 w-4 rounded-full bg-slate-500"></span>
            <p className="text-sm">NA = Not Active</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium">M = Morning, N = Night</span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <div className="overflow-x-auto h-[600px]">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Vehicle</th>
                    {weekDays.map((day) => (
                      <th key={day.toString()} className="p-2 text-center">
                        <div className="text-sm font-medium">
                          {format(day, "EEE")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(day, "dd MMM")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles
                    .filter(
                      (vehicle) =>
                        selectedVehicle === "all" ||
                        vehicle.vehicle_number === selectedVehicle
                    )
                    .map((vehicle, index) => (
                      <React.Fragment key={vehicle.vehicle_number}>
                        {/* Morning Shift Row */}
                        <tr className="">
                          <td className="p-2 border-b-0">
                            <div className="font-medium">
                              {index + 1}.{vehicle.vehicle_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {vehicle.fleet_name}
                            </div>
                          </td>
                          {weekDays.map((day) => {
                            const shiftData = getShiftDataForDate(
                              vehicle.vehicle_number,
                              day.toISOString()
                            );
                            const morningAttendance = shiftData.morning;
                            const nightAttendance = shiftData.night;
                            return (
                              <td
                                key={`${day.toString()}-shifts`}
                                className="p-2 text-center  "
                              >
                                <div className="flex gap-2 items-center p-2 border-2 ">
                                  {/* Morning Shift Button */}
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "w-full  p-4 rounded-md text-xs",
                                      getStatusColor(morningAttendance.status)
                                    )}
                                    onClick={() =>
                                      handleCellClick(
                                        vehicle.vehicle_number,
                                        day.toISOString(),
                                        "morning"
                                      )
                                    }
                                  >
                                    <div className="font-medium">
                                      M-
                                      {getStatusLabel(morningAttendance.status)}
                                    </div>
                                  </Button>

                                  {/* Night Shift Button */}
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "w-full p-4 rounded-md text-xs",
                                      getStatusColor(nightAttendance.status)
                                    )}
                                    onClick={() =>
                                      handleCellClick(
                                        vehicle.vehicle_number,
                                        day.toISOString(),
                                        "night"
                                      )
                                    }
                                  >
                                    <div className="font-medium">
                                      N-{getStatusLabel(nightAttendance.status)}
                                    </div>
                                  </Button>
                                </div>
                              </td>
                            );
                          })}

                          {/* {weekDays.map((day) => {
                            const shiftData = getShiftDataForDate(
                              vehicle.vehicle_number,
                              day.toISOString()
                            );
                            const attendance = shiftData.night;
                            return (
                              
                            );
                          })} */}
                        </tr>
                        {/* Night Shift Row */}
                        {/* <tr>HIII</tr> */}
                        {/* Spacer row */}
                        <tr>
                          <td colSpan={8} className="h-2 bg-gray-50"></td>
                        </tr>
                      </React.Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <VehicleStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleStatusUpdate}
        vehicleNumber={selectedVehicleNumber}
        date={selectedDate}
        shift={selectedShift}
        currentStatus={selectedStatus}
        currentNotes={selectedNotes}
      />
    </div>
  );
};

export default VehicleAttendanceCalendar;
