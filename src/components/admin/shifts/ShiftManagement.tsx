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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

interface Driver {
  id: string;
  name: string;
  online: boolean;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  online: boolean;
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
}

const ShiftManagement = () => {
  const [currentShifts, setCurrentShifts] = useState<ShiftAssignment[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedShiftType, setSelectedShiftType] = useState<
    "morning" | "night"
  >("morning");
  const [editingShift, setEditingShift] = useState<ShiftAssignment | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchDriversAndVehicles();
    updateShiftAssignments();
    const interval = setInterval(updateShiftAssignments, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchDriversAndVehicles = async () => {
    try {
      // Fetch online drivers
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select("id, name, online, driver_id")
        .eq("online", true)
        .eq("role", "user");

      if (driversError) throw driversError;

      // Fetch available vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, vehicle_number, online")
        .eq("online", true)
        .eq("status", "Active");

      if (vehiclesError) throw vehiclesError;

      setOnlineDrivers(
        driversData?.map((driver) => ({
          id: driver.id,
          name: driver.name || driver.driver_id,
          online: driver.online,
        })) || []
      );

      setAvailableVehicles(
        vehiclesData?.map((vehicle) => ({
          id: vehicle.id || "",
          vehicle_number: vehicle.vehicle_number,
          online: vehicle.online,
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
        .select("id, name, driver_id, vehicle_number, online, shift")
        .eq("online", true)
        .eq("role", "user");

      if (shiftsError) throw shiftsError;

      const currentShiftAssignments = shiftsData
        ?.filter((user) => user.shift === currentShiftType)
        .map((user) => ({
          id: user.id,
          driver_id: user.driver_id,
          driver_name: user.name || user.driver_id,
          vehicle_number: user.vehicle_number || "",
          shift_type: user.shift as "morning" | "night",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          online: user.online,
        }));

      console.log("Current Shift Assignments:", currentShiftAssignments);

      const upcomingShiftAssignments = shiftsData
        ?.filter((user) => user.shift === upcomingShiftType)
        .map((user) => ({
          id: user.id,
          driver_id: user.driver_id,
          driver_name: user.name || user.driver_id,
          vehicle_number: user.vehicle_number || "",
          shift_type: user.shift as "morning" | "night",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          online: user.online,
        }));

      setCurrentShifts(currentShiftAssignments || []);
      setUpcomingShifts(upcomingShiftAssignments || []);
    } catch (error) {
      console.error("Error updating shift assignments:", error);
      toast.error("Failed to update shift assignments");
    }
  };

  const handleToggleOnline = async (
    driverId: string,
    currentStatus: boolean
  ) => {
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

  const handleEditShift = async () => {
    if (!editingShift || !selectedDriver || !selectedVehicle) {
      toast.error("Please select both driver and vehicle");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          shift: selectedShiftType,
          vehicle_number: selectedVehicle,
        })
        .eq("id", editingShift.id);

      if (updateError) throw updateError;

      await updateShiftAssignments();
      setIsEditDialogOpen(false);
      setEditingShift(null);
      setSelectedDriver("");
      setSelectedVehicle("");
      toast.success("Shift updated successfully");
    } catch (error) {
      console.error("Error updating shift:", error);
      toast.error("Failed to update shift");
    }
  };

  const handleAssignShift = async () => {
    if (!selectedDriver || !selectedVehicle) {
      toast.error("Please select both driver and vehicle");
      return;
    }

    const driver = onlineDrivers.find((d) => d.id === selectedDriver);
    const vehicle = availableVehicles.find(
      (v) => v.vehicle_number === selectedVehicle
    );

    if (!driver || !vehicle) {
      toast.error("Invalid selection");
      return;
    }

    try {
      // Update user's shift and vehicle assignment
      const { error: updateError } = await supabase
        .from("users")
        .update({
          shift: selectedShiftType,
          vehicle_number: vehicle.vehicle_number,
        })
        .eq("id", driver.id);

      if (updateError) throw updateError;

      // Update shift assignments
      await updateShiftAssignments();

      setShowDialog(false);
      setSelectedDriver("");
      setSelectedVehicle("");
      toast.success("Shift assigned successfully");
    } catch (error) {
      console.error("Error assigning shift:", error);
      toast.error("Failed to assign shift");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple/90">
              <Plus className="h-4 w-4 mr-2" />
              Assign Shift
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
                <label className="text-sm font-medium">Driver</label>
                <Select
                  value={selectedDriver}
                  onValueChange={setSelectedDriver}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {onlineDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
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

      {/* Current Shift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentShifts.map((assignment) => (
              <Card
                key={assignment.id}
                className="bg-gradient-to-br from-blue-50 to-blue-100"
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-blue-200 text-blue-700"
                      >
                        {assignment.shift_type === "morning"
                          ? "Morning Shift"
                          : "Night Shift"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingShift(assignment);
                          setSelectedDriver(assignment.id);
                          setSelectedVehicle(assignment.vehicle_number);
                          setSelectedShiftType(assignment.shift_type);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <a href={`tel://${assignment.phone_number}`}>
                        <PhoneCall className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {isUpdating === assignment.id ? (
                          <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
                        ) : (
                          <>
                            <Switch
                              checked={assignment.online}
                              onCheckedChange={() =>
                                handleToggleOnline(
                                  assignment.id,
                                  assignment.online
                                )
                              }
                              className={`${
                                assignment.online
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              } transition-colors`}
                              disabled={isUpdating === assignment.id}
                            />
                            {assignment.online === true ? (
                              <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-sm max-sm:hidden text-blue-600">
                        {getShiftTiming(assignment.shift_type)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        {assignment.driver_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-blue-600" />
                      <span>{assignment.vehicle_number}</span>
                    </div>
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
              <label className="text-sm font-medium">Vehicle</label>
              <Select
                value={selectedVehicle}
                onValueChange={setSelectedVehicle}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
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

      {/* Upcoming Shift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Upcoming Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Next shift starts at{" "}
              {getNextShiftTime(
                selectedShiftType === "morning" ? "night" : "morning"
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingShifts.map((assignment) => (
              <Card
                key={assignment.id}
                className="bg-gradient-to-br from-green-50 to-green-100"
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-green-200 text-green-700"
                      >
                        {assignment.shift_type === "morning"
                          ? "Morning Shift"
                          : "Night Shift"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingShift(assignment);
                          setSelectedDriver(assignment.id);
                          setSelectedVehicle(assignment.vehicle_number);
                          setSelectedShiftType(assignment.shift_type);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <a href={`tel://${assignment.phone_number}`}>
                        <PhoneCall className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {isUpdating === assignment.id ? (
                          <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
                        ) : (
                          <Switch
                            checked={assignment.online === true}
                            onCheckedChange={() =>
                              handleToggleOnline(
                                assignment.id,
                                assignment.online
                              )
                            }
                            className="data-[state=checked]:bg-green-500"
                            disabled={isUpdating === assignment.id}
                          />
                        )}
                        {assignment.online === true ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-sm max-sm:hidden text-green-600">
                        {getShiftTiming(assignment.shift_type)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {assignment.driver_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-green-600" />
                      <span>{assignment.vehicle_number}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftManagement;
