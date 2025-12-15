import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Bed,
  Users,
  Home,
  Plus,
  UserPlus,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Room {
  id: string;
  room_number: number;
  room_name: string;
  total_beds: number;
  status: string;
}

interface Bed {
  id: string;
  room_id: string;
  bed_number: number;
  bed_name: string;
  status: string;
  daily_rent: number;
  morning_driver?: {
    id: string;
    name: string;
  };
  night_driver?: {
    id: string;
    name: string;
  };
}

interface Driver {
  id: string;
  name: string;
  phone_number: string;
  shift: string;
  current_room_id?: string;
  current_bed_id?: string;
}

interface RentSummary {
  total_rent: number;
  occupied_beds: number;
  available_beds: number;
  monthly_rent: number;
}

const RoomBedManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rentSummary, setRentSummary] = useState<RentSummary>({
    total_rent: 0,
    occupied_beds: 0,
    available_beds: 0,
    monthly_rent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedBed, setSelectedBed] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Fetch all data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRooms(),
        fetchBeds(),
        fetchDrivers(),
        fetchRentSummary(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load room and bed data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("room_number");

    if (error) throw error;
    setRooms(data || []);
  };

  const fetchBeds = async () => {
    // First, get all beds
    const { data: bedsData, error: bedsError } = await supabase
      .from("beds")
      .select("*")
      .order("room_id, bed_number");

    if (bedsError) throw bedsError;

    // Then, get all active bed assignments
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from("bed_assignments")
      .select(
        `
        *,
        user:users(id, name, phone_number),
        bed:beds(id, bed_name, room_id)
      `
      )
      .eq("status", "active")
      .is("end_date", null);

    if (assignmentsError) throw assignmentsError;

    // Process the data to get current assignments
    const processedBeds = (bedsData || []).map((bed) => {
      // Find morning assignment for this bed
      const morningAssignment = assignmentsData?.find(
        (assignment: any) =>
          assignment.bed_id === bed.id &&
          assignment.shift === "morning" &&
          assignment.status === "active" &&
          !assignment.end_date
      );

      // Find night assignment for this bed
      const nightAssignment = assignmentsData?.find(
        (assignment: any) =>
          assignment.bed_id === bed.id &&
          assignment.shift === "night" &&
          assignment.status === "active" &&
          !assignment.end_date
      );

      const processedBed = {
        ...bed,
        morning_driver: morningAssignment?.user || null,
        night_driver: nightAssignment?.user || null,
      };

      // Debug logging for first few beds
      if (bed.bed_number <= 2) {
        console.log(`Bed ${bed.bed_name}:`, {
          bedId: bed.id,
          morningAssignment: morningAssignment?.user?.name || "None",
          nightAssignment: nightAssignment?.user?.name || "None",
          allAssignments: assignmentsData?.filter((a) => a.bed_id === bed.id),
        });
      }

      return processedBed;
    });

    console.log("All assignments data:", assignmentsData);
    setBeds(processedBeds);
  };

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, phone_number, shift, current_room_id, current_bed_id")

      .eq("online", true)
      .order("name");

    if (error) throw error;
    setDrivers(data || []);
  };

  const fetchRentSummary = async () => {
    try {
      // Get current month's rent calculation
      const currentMonth = new Date();
      const { data: reports, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("user_id, rent_date")
        .gte(
          "rent_date",
          new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            1
          ).toISOString()
        )
        .lt(
          "rent_date",
          new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            1
          ).toISOString()
        );

      if (reportsError) throw reportsError;

      const totalReports = reports?.length || 0;
      const monthlyRent = totalReports * 100; // ₹100 per report

      // Get bed occupancy
      const occupiedBeds = beds.filter(
        (bed) => bed.morning_driver || bed.night_driver
      ).length;
      const availableBeds = 30 - occupiedBeds;

      setRentSummary({
        total_rent: monthlyRent,
        occupied_beds: occupiedBeds,
        available_beds: availableBeds,
        monthly_rent: monthlyRent,
      });
    } catch (error) {
      console.error("Error calculating rent summary:", error);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedBed || !selectedDriver || !selectedShift) {
      toast.error("Please select bed, driver, and shift");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if bed is already occupied for this shift and date
      const { data: existingAssignment, error: checkError } = await supabase
        .from("bed_assignments")
        .select("id, user:users(name), status, end_date")
        .eq("bed_id", selectedBed)
        .eq("shift", selectedShift)
        .eq("assigned_date", today)
        .eq("status", "active")
        .is("end_date", null)
        .single();

      if (existingAssignment) {
        toast.error(
          `This bed is already occupied by ${
            existingAssignment.user?.name || "another driver"
          } for the selected shift today`
        );
        return;
      }

      // Check if this driver is already assigned to another bed for this shift today
      const { data: driverAssignment, error: driverCheckError } = await supabase
        .from("bed_assignments")
        .select("id, bed:beds(bed_name, room:rooms(room_name))")
        .eq("user_id", selectedDriver)
        .eq("shift", selectedShift)
        .eq("assigned_date", today)
        .eq("status", "active")
        .is("end_date", null)
        .single();

      if (driverAssignment) {
        toast.error(
          `This driver is already assigned to ${driverAssignment.bed?.bed_name} in ${driverAssignment.bed?.room?.room_name} for the selected shift today`
        );
        return;
      }

      // Check if there's an existing assignment for this bed/shift/date (even if ended)
      const { data: existingRecord, error: existingError } = await supabase
        .from("bed_assignments")
        .select("id, status, end_date")
        .eq("bed_id", selectedBed)
        .eq("shift", selectedShift)
        .eq("assigned_date", today)
        .single();

      if (existingRecord) {
        // Update existing record to make it active again
        const { error: updateError } = await supabase
          .from("bed_assignments")
          .update({
            user_id: selectedDriver,
            status: "active",
            end_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRecord.id);

        if (updateError) throw updateError;
      } else {
        // Create new assignment
        const { error: assignError } = await supabase
          .from("bed_assignments")
          .insert({
            bed_id: selectedBed,
            user_id: selectedDriver,
            shift: selectedShift,
            assigned_date: today,
          });

        if (assignError) {
          if (assignError.code === "23505") {
            toast.error(
              "This bed is already assigned for the selected shift today"
            );
            return;
          }
          throw assignError;
        }
      }

      // Update user's current room and bed
      const selectedBedData = beds.find((b) => b.id === selectedBed);
      const { error: updateError } = await supabase
        .from("users")
        .update({
          current_room_id: selectedBedData?.room_id,
          current_bed_id: selectedBed,
          current_shift: selectedShift,
        })
        .eq("id", selectedDriver);

      if (updateError) throw updateError;

      toast.success("Driver assigned successfully!");
      setShowAssignDialog(false);
      setSelectedBed("");
      setSelectedDriver("");
      setSelectedShift("");
      fetchData();
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("Failed to assign driver");
    }
  };

  const handleUnassignDriver = async (bedId: string, shift: string) => {
    try {
      // End the current assignment
      const { error: endError } = await supabase
        .from("bed_assignments")
        .update({
          status: "ended",
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("bed_id", bedId)
        .eq("shift", shift)
        .eq("status", "active")
        .is("end_date", null);

      if (endError) throw endError;

      // Clear user's current room and bed
      const bed = beds.find((b) => b.id === bedId);
      const driver =
        shift === "morning" ? bed?.morning_driver : bed?.night_driver;

      if (driver) {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            current_room_id: null,
            current_bed_id: null,
            current_shift: null,
          })
          .eq("id", driver.id);

        if (updateError) throw updateError;
      }

      toast.success("Driver unassigned successfully!");
      fetchData();
    } catch (error) {
      console.error("Error unassigning driver:", error);
      toast.error("Failed to unassign driver");
    }
  };

  const handleToggleRoomStatus = async (
    roomId: string,
    currentStatus: string
  ) => {
    try {
      const newStatus = currentStatus === "online" ? "offline" : "online";

      const { error } = await supabase
        .from("rooms")
        .update({ status: newStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast.success(
        `Room ${
          newStatus === "online" ? "activated" : "deactivated"
        } successfully!`
      );
      fetchData();
    } catch (error) {
      console.error("Error toggling room status:", error);
      toast.error("Failed to update room status");
    }
  };

  const getBedStatusColor = (bed: Bed) => {
    if (bed.morning_driver && bed.night_driver) {
      return "bg-red-100 border-red-300 text-red-800"; // Fully occupied
    } else if (bed.morning_driver || bed.night_driver) {
      return "bg-yellow-100 border-yellow-300 text-yellow-800"; // Partially occupied
    } else {
      return "bg-green-100 border-green-300 text-green-800"; // Available
    }
  };

  const getBedStatusText = (bed: Bed) => {
    if (bed.morning_driver && bed.night_driver) {
      return "Fully Occupied";
    } else if (bed.morning_driver || bed.night_driver) {
      return "Partially Occupied";
    } else {
      return "Available";
    }
  };

  const getBedStatusIcon = (bed: Bed) => {
    if (bed.morning_driver && bed.night_driver) {
      return <CheckCircle className="w-4 h-4" />; // Fully occupied
    } else if (bed.morning_driver || bed.night_driver) {
      return <Clock className="w-4 h-4" />; // Partially occupied
    } else {
      return <AlertCircle className="w-4 h-4" />; // Available
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fleet-purple mb-2">
          Room & Bed Management
        </h1>
        <p className="text-gray-600">
          Manage driver accommodation across 6 rooms and 30 beds
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-fleet-purple">6</p>
              </div>
              <Home className="h-8 w-8 text-fleet-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Beds</p>
                <p className="text-2xl font-bold text-fleet-purple">30</p>
              </div>
              <Bed className="h-8 w-8 text-fleet-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Occupied Beds
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {rentSummary.occupied_beds}
                </p>
              </div>
              <Users className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Monthly Rent
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{rentSummary.monthly_rent}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Drivers Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently Assigned Drivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Morning Shift Drivers
              </h4>
              <div className="space-y-1">
                {beds
                  .filter((bed) => bed.morning_driver)
                  .map((bed) => {
                    const room = rooms.find((r) => r.id === bed.room_id);
                    return (
                      <div
                        key={`morning-${bed.id}`}
                        className="flex justify-between items-center text-sm bg-yellow-50 p-2 rounded"
                      >
                        <span className="font-medium">
                          {bed.morning_driver?.name}
                        </span>
                        <span className="text-gray-600">
                          {room?.room_name} - {bed.bed_name}
                        </span>
                      </div>
                    );
                  })}
                {beds.filter((bed) => bed.morning_driver).length === 0 && (
                  <p className="text-gray-500 italic text-sm">
                    No morning shift drivers assigned
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Night Shift Drivers
              </h4>
              <div className="space-y-1">
                {beds
                  .filter((bed) => bed.night_driver)
                  .map((bed) => {
                    const room = rooms.find((r) => r.id === bed.room_id);
                    return (
                      <div
                        key={`night-${bed.id}`}
                        className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded"
                      >
                        <span className="font-medium">
                          {bed.night_driver?.name}
                        </span>
                        <span className="text-gray-600">
                          {room?.room_name} - {bed.bed_name}
                        </span>
                      </div>
                    );
                  })}
                {beds.filter((bed) => bed.night_driver).length === 0 && (
                  <p className="text-gray-500 italic text-sm">
                    No night shift drivers assigned
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button
              className="bg-fleet-purple hover:bg-fleet-purple/90"
              disabled={rooms.every((room) => room.status === "offline")}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Driver
              {rooms.every((room) => room.status === "offline") &&
                " (All Rooms Offline)"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Driver to Bed</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bed-select">Select Bed</Label>
                <Select value={selectedBed} onValueChange={setSelectedBed}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bed" />
                  </SelectTrigger>
                  <SelectContent>
                    {beds
                      .filter((bed) => {
                        const room = rooms.find((r) => r.id === bed.room_id);
                        // Only show beds from online rooms and not fully occupied
                        return (
                          room?.status === "online" &&
                          !(bed.morning_driver && bed.night_driver)
                        );
                      })
                      .map((bed) => {
                        const room = rooms.find((r) => r.id === bed.room_id);
                        return (
                          <SelectItem key={bed.id} value={bed.id}>
                            {room?.room_name} - {bed.bed_name}
                            {bed.morning_driver || bed.night_driver
                              ? " (Partially Occupied)"
                              : " (Available)"}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="driver-select">Select Driver</Label>
                <Select
                  value={selectedDriver}
                  onValueChange={setSelectedDriver}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} ({driver.phone_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="shift-select">Select Shift</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">
                      Morning Shift (12hr)
                    </SelectItem>
                    <SelectItem value="night">Night Shift (12hr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignDriver}
                  className="bg-fleet-purple"
                >
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={fetchData}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Rooms and Beds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const roomBeds = beds.filter((bed) => bed.room_id === room.id);
          return (
            <Card key={room.id} className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span>{room.room_name}</span>
                    <Badge
                      variant={
                        room.status === "online" ? "default" : "secondary"
                      }
                      className={
                        room.status === "online"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {room.status === "online" ? "🟢 Online" : "🔴 Offline"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{roomBeds.length} beds</Badge>
                    <Button
                      size="sm"
                      variant={
                        room.status === "online" ? "destructive" : "default"
                      }
                      onClick={() =>
                        handleToggleRoomStatus(room.id, room.status)
                      }
                      className="h-6 px-2 text-xs"
                    >
                      {room.status === "online" ? "Go Offline" : "Go Online"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {room.status === "offline" && (
                  <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Room is offline - No new assignments allowed
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {roomBeds.map((bed) => (
                    <div
                      key={bed.id}
                      className={`p-3 rounded-lg border-2 ${getBedStatusColor(
                        bed
                      )} ${room.status === "offline" ? "opacity-75" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getBedStatusIcon(bed)}
                          <span className="font-medium">{bed.bed_name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              bed.morning_driver && bed.night_driver
                                ? "destructive"
                                : bed.morning_driver || bed.night_driver
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {getBedStatusText(bed)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            ₹{bed.daily_rent}/day
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium flex items-center gap-1">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            Morning Shift:
                          </span>
                          <span>
                            {bed.morning_driver ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {bed.morning_driver.name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUnassignDriver(bed.id, "morning")
                                  }
                                  disabled={room.status === "offline"}
                                  className="h-6 px-2 text-xs hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                  Unassign
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">
                                Available
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="font-medium flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Night Shift:
                          </span>
                          <span>
                            {bed.night_driver ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {bed.night_driver.name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUnassignDriver(bed.id, "night")
                                  }
                                  disabled={room.status === "offline"}
                                  className="h-6 px-2 text-xs hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                  Unassign
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">
                                Available
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rent Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Rent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Daily Rent per Driver</p>
              <p className="text-2xl font-bold text-fleet-purple">₹100</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Monthly Rent per Bed Space
              </p>
              <p className="text-2xl font-bold text-fleet-purple">₹6,000</p>
              <p className="text-xs text-gray-500">(2 drivers × ₹3,000 each)</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{rentSummary.monthly_rent}
              </p>
              <p className="text-xs text-gray-500">
                Based on submitted reports
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomBedManagement;
