import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Home,
  Bed,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
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

interface AccommodationAssignmentProps {
  driverId: string;
  driverName: string;
  onAssignmentUpdate?: () => void;
}

const AccommodationAssignment: React.FC<AccommodationAssignmentProps> = ({
  driverId,
  driverName,
  onAssignmentUpdate,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedBed, setSelectedBed] = useState<string>("");
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, [driverId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRooms(), fetchBeds(), fetchCurrentAssignment()]);
    } catch (error) {
      console.error("Error fetching accommodation data:", error);
      toast.error("Failed to load accommodation data");
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
    const { data, error } = await supabase
      .from("beds")
      .select(
        `
        *,
        bed_assignments(
          user:users(id, name),
          shift,
          status,
          end_date
        )
      `
      )
      .order("room_id, bed_number");

    if (error) throw error;

    // Process: 1 person per bed - take first active assignment
    const processedBeds = (data || []).map((bed) => {
      const activeAssignment = (bed.bed_assignments || []).find(
        (a: any) => a.status === "active" && !a.end_date
      );
      return {
        ...bed,
        assigned_driver: activeAssignment?.user,
      };
    });

    setBeds(processedBeds);
  };

  const fetchCurrentAssignment = async () => {
    const { data, error } = await supabase
      .from("bed_assignments")
      .select(
        `
        *,
        bed:beds(
          id,
          bed_number,
          bed_name,
          daily_rent,
          room:rooms(
            id,
            room_number,
            room_name
          )
        )
      `
      )
      .eq("user_id", driverId)
      .eq("status", "active")
      .is("end_date", null)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    setCurrentAssignment(data || null);
  };

  const handleAssignBed = async () => {
    if (!selectedBed) {
      toast.error("Please select a bed");
      return;
    }

    try {
      setIsAssigning(true);

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
        .eq("user_id", driverId)
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
          user_id: driverId,
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
        .eq("id", driverId);

      if (updateError) throw updateError;

      toast.success("Driver assigned to bed successfully!");
      setSelectedBed("");
      setSelectedRoom("");
      fetchData();
      onAssignmentUpdate?.();
    } catch (error) {
      console.error("Error assigning bed:", error);
      toast.error("Failed to assign bed");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignBed = async () => {
    if (!currentAssignment) return;

    try {
      setIsAssigning(true);

      // End the current assignment
      const { error: endError } = await supabase
        .from("bed_assignments")
        .update({
          status: "ended",
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", currentAssignment.id);

      if (endError) throw endError;

      // Clear user's current room and bed
      const { error: updateError } = await supabase
        .from("users")
        .update({
          current_room_id: null,
          current_bed_id: null,
        })
        .eq("id", driverId);

      if (updateError) throw updateError;

      toast.success("Driver unassigned from bed successfully!");
      fetchData();
      onAssignmentUpdate?.();
    } catch (error) {
      console.error("Error unassigning bed:", error);
      toast.error("Failed to unassign bed");
    } finally {
      setIsAssigning(false);
    }
  };

  const getBedStatusColor = (bed: Bed) => {
    if (bed.assigned_driver) {
      return "bg-red-100 border-red-300 text-red-800"; // Occupied
    }
    return "bg-green-100 border-green-300 text-green-800"; // Available
  };

  const getBedStatusIcon = (bed: Bed) => {
    if (bed.assigned_driver) {
      return <CheckCircle className="w-4 h-4" />; // Occupied
    }
    return <AlertCircle className="w-4 h-4" />; // Available
  };

  const availableBeds = beds.filter((bed) => {
    const room = rooms.find((r) => r.id === bed.room_id);

    // Only show beds from online rooms
    if (room?.status !== "online") return false;

    // If a specific room is selected, only show beds from that room
    if (selectedRoom) {
      return bed.room_id === selectedRoom;
    }

    // Only show available beds (1 person per bed)
    return !bed.assigned_driver;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Assignment */}
      {currentAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Current Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Room</p>
                  <p className="font-semibold">
                    {currentAssignment.bed.room.room_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Bed className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bed</p>
                  <p className="font-semibold">
                    {currentAssignment.bed.bed_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned Since</p>
                  <p className="font-semibold">
                    {new Date(
                      currentAssignment.assigned_date
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnassignBed}
                disabled={isAssigning}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                {isAssigning ? "Unassigning..." : "Unassign from Bed"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Form */}
      {!currentAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-fleet-purple" />
              Assign to Bed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rooms.filter((room) => room.status === "online").length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    No online rooms available for assignment
                  </span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="room-select">Select Room</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms
                    .filter((room) => room.status === "online")
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_name} 🟢
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bed-select">Select Bed</Label>
              <Select value={selectedBed} onValueChange={setSelectedBed}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bed" />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map((bed) => {
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

            <Button
              onClick={handleAssignBed}
              disabled={
                !selectedBed ||
                isAssigning ||
                rooms.filter((room) => room.status === "online").length === 0
              }
              className="w-full bg-fleet-purple hover:bg-fleet-purple/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAssigning ? "Assigning..." : "Assign to Bed"}
              {rooms.filter((room) => room.status === "online").length === 0 &&
                " (No Online Rooms)"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available Beds Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5" />
            Bed Availability Overview
          </CardTitle>
          <CardDescription>
            View all beds and their current occupancy status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Availability Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Availability Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {beds.filter((bed) => !bed.assigned_driver).length}
                </div>
                <div className="text-gray-600">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {beds.filter((bed) => bed.assigned_driver).length}
                </div>
                <div className="text-gray-600">Occupied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {rooms.filter((room) => room.status === "online").length}
                </div>
                <div className="text-gray-600">Online Rooms</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {beds.length}
                </div>
                <div className="text-gray-600">Total Beds</div>
              </div>
            </div>
          </div>

          {/* Quick Assignment Info */}
          {!currentAssignment && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Assigning: {driverName}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Select a room and bed above to assign this driver to
                accommodation
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => {
              const roomBeds = beds.filter((bed) => bed.room_id === room.id);
              return (
                <div key={room.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{room.room_name}</h4>
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
                  <div className="space-y-1">
                    {roomBeds.map((bed) => (
                      <div
                        key={bed.id}
                        className={`p-2 rounded border text-sm ${getBedStatusColor(
                          bed
                        )} ${room.status === "offline" ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getBedStatusIcon(bed)}
                            <span className="font-medium">{bed.bed_name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Badge
                              variant={
                                bed.assigned_driver
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {bed.assigned_driver ? "Occupied" : "Available"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              ₹{bed.daily_rent}/day
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs mt-2">
                          <span
                            className={
                              bed.assigned_driver
                                ? "font-medium text-gray-900"
                                : "text-green-600 font-medium"
                            }
                          >
                            {bed.assigned_driver?.name || "✅ Available"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccommodationAssignment;
