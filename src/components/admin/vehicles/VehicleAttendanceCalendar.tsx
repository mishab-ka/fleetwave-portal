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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import VehicleStatusModal from "./VehicleStatusModal";

type VehicleStatus = "running" | "stopped" | "breakdown" | "leave";

interface Vehicle {
  vehicle_number: string;
  total_trips: number;
  online_status: boolean;
  fleet_name: string;
}

interface AttendanceRecord {
  id: string;
  vehicle_number: string;
  date: string;
  status: VehicleStatus;
  notes?: string;
}

interface DefaultAttendanceRecord {
  status: VehicleStatus;
  notes?: string;
}

const VehicleAttendanceCalendar = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedVehicleNumber, setSelectedVehicleNumber] =
    useState<string>("");
  const [selectedStatus, setSelectedStatus] =
    useState<VehicleStatus>("running");
  const [selectedNotes, setSelectedNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const currentDate = new Date();
  const weekStart = startOfWeek(addDays(currentDate, weekOffset * 7), {
    weekStartsOn: 1,
  });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const initializeData = async () => {
      await checkAdminStatus();
      await fetchVehicles();
      await fetchAttendanceData();
    };
    initializeData();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [weekOffset, selectedVehicle]);

  const checkAdminStatus = async () => {
    try {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(userData?.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_number, total_trips, online, fleet_name")
        .order("vehicle_number")
        .eq("online", true);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

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
      if (!isAdmin) {
        toast.error("Only admins can update vehicle status");
        return;
      }

      if (!selectedVehicleNumber) {
        toast.error("Please select a vehicle");
        return;
      }

      // First, check if a record exists for this vehicle and date
      const { data: existingRecord, error: fetchError } = await supabase
        .from("vehicle_attendance")
        .select("id")
        .eq("vehicle_number", selectedVehicleNumber)
        .eq("date", selectedDate)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      const { error } = await supabase.from("vehicle_attendance").upsert(
        {
          id: existingRecord?.id,
          vehicle_number: selectedVehicleNumber,
          date: selectedDate,
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "vehicle_number,date",
        }
      );

      if (error) throw error;

      // Update the local state immediately
      setAttendanceData((prev) => {
        const filtered = prev.filter(
          (record) =>
            !(
              record.vehicle_number === selectedVehicleNumber &&
              record.date === selectedDate
            )
        );
        return [
          ...filtered,
          {
            id: existingRecord?.id || crypto.randomUUID(),
            vehicle_number: selectedVehicleNumber,
            date: selectedDate,
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: VehicleStatus) => {
    switch (status) {
      case "running":
        return "Running";
      case "stopped":
        return "Stopped";
      case "breakdown":
        return "Breakdown";
      case "leave":
        return "Leave";
      default:
        return status;
    }
  };

  const getAttendanceForDate = (
    vehicleNumber: string,
    date: string
  ): AttendanceRecord | DefaultAttendanceRecord => {
    const record = attendanceData.find(
      (record) =>
        record.vehicle_number === vehicleNumber &&
        record.date === format(parseISO(date), "yyyy-MM-dd")
    );
    return record || { status: "running" as VehicleStatus, notes: "" };
  };

  const handleCellClick = (vehicleNumber: string, date: string) => {
    if (!isAdmin) return;

    const attendance = getAttendanceForDate(vehicleNumber, date);
    setSelectedDate(format(parseISO(date), "yyyy-MM-dd"));
    setSelectedVehicleNumber(vehicleNumber);
    setSelectedStatus(attendance.status);
    setSelectedNotes(attendance.notes || "");
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
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
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    .map((vehicle) => (
                      <tr key={vehicle.vehicle_number}>
                        <td className="p-2">
                          <div className="font-medium">
                            {vehicle.vehicle_number}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.fleet_name} - {vehicle.total_trips} trips
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const attendance = getAttendanceForDate(
                            vehicle.vehicle_number,
                            day.toISOString()
                          );
                          return (
                            <td
                              key={day.toString()}
                              className="p-2 text-center"
                            >
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full h-full min-h-[60px] p-2 rounded-md",
                                  getStatusColor(attendance.status),
                                  isAdmin && "hover:opacity-80 cursor-pointer"
                                )}
                                onClick={() =>
                                  handleCellClick(
                                    vehicle.vehicle_number,
                                    day.toISOString()
                                  )
                                }
                                disabled={!isAdmin}
                              >
                                <div className="space-y-1">
                                  <div>{getStatusLabel(attendance.status)}</div>
                                  {attendance.notes && (
                                    <div className="text-xs truncate">
                                      {attendance.notes}
                                    </div>
                                  )}
                                </div>
                              </Button>
                            </td>
                          );
                        })}
                      </tr>
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
        currentStatus={selectedStatus}
        currentNotes={selectedNotes}
      />
    </div>
  );
};

export default VehicleAttendanceCalendar;
