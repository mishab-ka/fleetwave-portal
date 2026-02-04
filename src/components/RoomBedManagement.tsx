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
  UserPlus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
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
  assigned_driver?: {
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

    // Process: 1 person per bed - take first active assignment
    const processedBeds = (bedsData || []).map((bed) => {
      const activeAssignment = assignmentsData?.find(
        (assignment: any) =>
          assignment.bed_id === bed.id &&
          assignment.status === "active" &&
          !assignment.end_date
      );
      return {
        ...bed,
        assigned_driver: activeAssignment?.user || null,
      };
    });

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

      // Get bed occupancy (1 person per bed)
      const occupiedBeds = beds.filter((bed) => bed.assigned_driver).length;
      const totalBeds = beds.length;
      const availableBeds = totalBeds - occupiedBeds;

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
    if (!selectedBed || !selectedDriver) {
      toast.error("Please select bed and driver");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const shift = "morning"; // 1 person per bed - use single shift

      // Check if bed is already occupied (any active assignment)
      const { data: existingAssignments } = await supabase
        .from("bed_assignments")
        .select("id, user:users(name)")
        .eq("bed_id", selectedBed)
        .eq("status", "active")
        .is("end_date", null);

      if (existingAssignments && existingAssignments.length > 0) {
        const occupant = (existingAssignments as any)[0]?.user?.name;
        toast.error(
          `This bed is already occupied by ${occupant || "another driver"}`
        );
        return;
      }

      // Check if this driver is already assigned to another bed
      const { data: driverAssignment } = await supabase
        .from("bed_assignments")
        .select("id, bed:beds(bed_name, room:rooms(room_name))")
        .eq("user_id", selectedDriver)
        .eq("status", "active")
        .is("end_date", null)
        .single();

      if (driverAssignment) {
        const bedInfo = (driverAssignment as any).bed;
        toast.error(
          `This driver is already assigned to ${
            bedInfo?.bed_name || "a bed"
          } in ${bedInfo?.room?.room_name || "a room"}`
        );
        return;
      }

      // Create new assignment (1 person per bed)
      const { error: assignError } = await supabase
        .from("bed_assignments")
        .insert({
          bed_id: selectedBed,
          user_id: selectedDriver,
          shift,
          assigned_date: today,
        });

      if (assignError) {
        if (assignError.code === "23505") {
          toast.error("This bed is already assigned");
          return;
        }
        throw assignError;
      }

      // Update user's current room and bed (no shift)
      const selectedBedData = beds.find((b) => b.id === selectedBed);
      const { error: updateError } = await supabase
        .from("users")
        .update({
          current_room_id: selectedBedData?.room_id,
          current_bed_id: selectedBed,
        })
        .eq("id", selectedDriver);

      if (updateError) throw updateError;

      toast.success("Driver assigned successfully!");
      setShowAssignDialog(false);
      setSelectedBed("");
      setSelectedDriver("");
      fetchData();
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("Failed to assign driver");
    }
  };

  const handleUnassignDriver = async (bedId: string) => {
    try {
      const bed = beds.find((b) => b.id === bedId);
      const driver = bed?.assigned_driver;
      if (!driver) return;

      // End the current assignment (1 person per bed - any shift)
      const { error: endError } = await supabase
        .from("bed_assignments")
        .update({
          status: "ended",
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("bed_id", bedId)
        .eq("user_id", driver.id)
        .eq("status", "active")
        .is("end_date", null);

      if (endError) throw endError;

      // Clear user's current room and bed
      const { error: updateError } = await supabase
        .from("users")
        .update({
          current_room_id: null,
          current_bed_id: null,
        })
        .eq("id", driver.id);

      if (updateError) throw updateError;

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
    if (bed.assigned_driver) {
      return "bg-red-100 border-red-300 text-red-800"; // Occupied
    }
    return "bg-green-100 border-green-300 text-green-800"; // Available
  };

  const getBedStatusText = (bed: Bed) => {
    return bed.assigned_driver ? "Occupied" : "Available";
  };

  const getBedStatusIcon = (bed: Bed) => {
    return bed.assigned_driver ? (
      <CheckCircle className="w-4 h-4" />
    ) : (
      <AlertCircle className="w-4 h-4" />
    );
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
          Manage driver accommodation - 1 person per bed
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
                <p className="text-2xl font-bold text-fleet-purple">
                  {beds.length}
                </p>
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

      {/* Assigned Drivers Summary - Bed number + Driver name only */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently Assigned Drivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {beds
              .filter((bed) => bed.assigned_driver)
              .map((bed) => {
                const room = rooms.find((r) => r.id === bed.room_id);
                return (
                  <div
                    key={bed.id}
                    className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                  >
                    <span className="font-medium">
                      {bed.bed_name} - {bed.assigned_driver?.name}
                    </span>
                    <span className="text-gray-600">{room?.room_name}</span>
                  </div>
                );
              })}
            {beds.filter((bed) => bed.assigned_driver).length === 0 && (
              <p className="text-gray-500 italic text-sm">
                No drivers assigned
              </p>
            )}
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
                        return (
                          room?.status === "online" && !bed.assigned_driver
                        );
                      })
                      .map((bed) => {
                        const room = rooms.find((r) => r.id === bed.room_id);
                        return (
                          <SelectItem key={bed.id} value={bed.id}>
                            {room?.room_name} - {bed.bed_name} (Available)
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getBedStatusIcon(bed)}
                          <span className="font-medium">{bed.bed_name}</span>
                          <span
                            className={
                              bed.assigned_driver
                                ? "font-medium text-gray-900"
                                : "text-green-600 font-medium"
                            }
                          >
                            {bed.assigned_driver?.name || "Available"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              bed.assigned_driver ? "destructive" : "secondary"
                            }
                            className="text-xs"
                          >
                            {getBedStatusText(bed)}
                          </Badge>
                          {bed.assigned_driver && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassignDriver(bed.id)}
                              disabled={room.status === "offline"}
                              className="h-6 px-2 text-xs hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              Unassign
                            </Button>
                          )}
                          <Badge variant="outline" className="text-xs">
                            ₹{bed.daily_rent}/day
                          </Badge>
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
              <p className="text-xs text-gray-500">(1 person per bed)</p>
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
