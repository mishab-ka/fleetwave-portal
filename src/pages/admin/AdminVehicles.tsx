import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Edit,
  Car,
  Search,
  Save,
  Trash2,
  History,
  AlertCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { subDays, startOfWeek, endOfWeek, format } from "date-fns";

interface Vehicle {
  vehicle_number: string;
  fleet_name: string | null;
  total_trips: number | null;
  online: boolean | null;
  deposit: number | null;
  created_at: string | null;
}

const AdminVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editData, setEditData] = useState<Partial<Vehicle>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [filterType, setFilterType] = useState("week");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [newVehicleData, setNewVehicleData] = useState({
    vehicle_number: "",
    fleet_name: "",
    deposit: 0,
    total_trips: 0,
  });

  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [showAssignedDriversDialog, setShowAssignedDriversDialog] =
    useState(false);
  const [assignedDrivers, setAssignedDrivers] = useState<any[]>([]);
  const [vehicleToDeactivate, setVehicleToDeactivate] = useState<{
    vehicle_number: string;
    currentStatus: boolean | null;
  } | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_number")
        .eq("online", true);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles data");
    } finally {
      setLoading(false);
    }
  };

  async function updateZeroTotalTrips(newVehiclenumber: string) {
    try {
      // Get the current total_trips before resetting
      const { data: currentData, error: fetchError } = await supabase
        .from("vehicles")
        .select("total_trips")
        .eq("vehicle_number", newVehiclenumber)
        .single();

      if (fetchError) throw fetchError;

      const previousTrips = currentData?.total_trips || 0;
      const now = new Date();

      // Save daily history
      const { error: dailyError } = await supabase
        .from("vehicle_trip_history")
        .insert({
          vehicle_number: newVehiclenumber,
          recorded_at: now.toISOString(),
          total_trips: previousTrips,
          type: "daily",
        });

      if (dailyError) throw dailyError;

      // Save weekly history
      const { error: weeklyError } = await supabase
        .from("vehicle_trip_history")
        .insert({
          vehicle_number: newVehiclenumber,
          recorded_at: now.toISOString(),
          total_trips: previousTrips,
          type: "weekly",
        });

      if (weeklyError) throw weeklyError;

      // Reset total_trips to 0
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ total_trips: 0 })
        .eq("vehicle_number", newVehiclenumber);

      if (updateError) throw updateError;

      toast.success("Trip count reset successfully");
      fetchVehicles();
    } catch (error) {
      console.error("Error resetting trips:", error);
      toast.error("Failed to reset trip count");
    }
  }

  const fetchFilteredTripHistory = async () => {
    try {
      let query = supabase
        .from("vehicle_trip_history")
        .select("*")
        .order("recorded_at", { ascending: false });

      if (filterType === "daily") {
        query = query.eq("type", "daily");
      } else if (filterType === "weekly") {
        query = query.eq("type", "weekly");
      } else if (filterType === "custom" && customStart && customEnd) {
        query = query
          .gte("recorded_at", customStart.toISOString())
          .lte("recorded_at", customEnd.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setTripHistory(data || []);
    } catch (error) {
      console.error("Error fetching filtered trip history:", error);
      toast.error("Failed to load trip history");
    }
  };

  useEffect(() => {
    fetchFilteredTripHistory();
  }, [filterType, customStart, customEnd]);

  const toggleVehicleStatus = async (
    vehicle_number: string,
    currentStatus: boolean | null
  ) => {
    // If trying to deactivate (set to inactive), check for assigned drivers
    if (currentStatus === true) {
      try {
        // Fetch drivers assigned to this vehicle
        const { data: drivers, error: driversError } = await supabase
          .from("users")
          .select("id, name, driver_id, phone_number, online")
          .eq("vehicle_number", vehicle_number)
          .eq("role", "user");

        if (driversError) throw driversError;

        // If there are assigned drivers, show warning dialog
        if (drivers && drivers.length > 0) {
          setAssignedDrivers(drivers);
          setVehicleToDeactivate({ vehicle_number, currentStatus });
          setShowAssignedDriversDialog(true);
          return;
        }
      } catch (error) {
        console.error("Error checking assigned drivers:", error);
        toast.error("Failed to check assigned drivers");
        return;
      }
    }

    // If activating or no drivers assigned, proceed with status update
    await performStatusUpdate(vehicle_number, currentStatus);
  };

  const performStatusUpdate = async (
    vehicle_number: string,
    currentStatus: boolean | null
  ) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ online: !currentStatus })
        .eq("vehicle_number", vehicle_number);

      if (error) throw error;

      setVehicles(
        vehicles.map((vehicle) =>
          vehicle.vehicle_number === vehicle_number
            ? { ...vehicle, online: !currentStatus }
            : vehicle
        )
      );

      toast.success(`Vehicle status updated successfully`);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle status");
    }
  };

  const handleDeactivateAnyway = async () => {
    if (vehicleToDeactivate) {
      await performStatusUpdate(
        vehicleToDeactivate.vehicle_number,
        vehicleToDeactivate.currentStatus
      );
      setShowAssignedDriversDialog(false);
      setAssignedDrivers([]);
      setVehicleToDeactivate(null);
    }
  };

  const addNewVehicle = async () => {
    // Validate vehicle number
    if (!newVehicleData.vehicle_number.trim()) {
      toast.error("Vehicle number is required");
      return;
    }

    setIsSaving(true);

    try {
      // Check if vehicle already exists
      const { data: existingVehicle, error: checkError } = await supabase
        .from("vehicles")
        .select("vehicle_number")
        .eq(
          "vehicle_number",
          newVehicleData.vehicle_number.toUpperCase().trim()
        )
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVehicle) {
        toast.error(
          `Vehicle ${newVehicleData.vehicle_number.toUpperCase()} already exists!`
        );
        setIsSaving(false);
        return;
      }

      // Insert new vehicle
      const { error } = await supabase.from("vehicles").insert([
        {
          ...newVehicleData,
          vehicle_number: newVehicleData.vehicle_number.toUpperCase().trim(),
          deposit: Number(newVehicleData.deposit),
          total_trips: Number(newVehicleData.total_trips),
        },
      ]);

      if (error) throw error;

      toast.success("New vehicle added successfully!");
      setAddingNewVehicle(false);
      setNewVehicleData({
        vehicle_number: "",
        fleet_name: "",
        deposit: 0,
        total_trips: 0,
      });

      // Refresh the vehicles list
      fetchVehicles();
    } catch (error: any) {
      console.error("Error adding vehicle:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        toast.error(
          `Vehicle ${newVehicleData.vehicle_number.toUpperCase()} already exists!`
        );
      } else {
        toast.error(error.message || "Failed to add new vehicle.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const [addingNewVehicle, setAddingNewVehicle] = useState(false);

  const handleAddNewVehicle = () => {
    setNewVehicleData({
      vehicle_number: "",
      fleet_name: "",
      deposit: 0,
      total_trips: 0,
    });
    setAddingNewVehicle(true);
  };

  const handleEditChange = (
    field: keyof Vehicle,
    value: string | number | boolean | null
  ) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveVehicleChanges = async () => {
    if (!selectedVehicle) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .update(editData)
        .eq("vehicle_number", selectedVehicle.vehicle_number);

      if (error) throw error;

      setVehicles(
        vehicles.map((vehicle) =>
          vehicle.vehicle_number === selectedVehicle.vehicle_number
            ? { ...vehicle, ...editData }
            : vehicle
        )
      );
      toast.success("Vehicle updated successfully");
      setSelectedVehicle(null);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to update vehicle");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVehicle = async (vehicle_number: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq(
          "vehicle_number",
          vehicles.find((vehicle) => vehicle.vehicle_number === vehicle_number)
            ?.vehicle_number
        );

      if (error) throw error;

      setVehicles(
        vehicles.filter((vehicle) => vehicle.vehicle_number !== vehicle_number)
      );
      toast.success("Vehicle deleted successfully");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  const getTripBadgeVariant = (trips: number | null) => {
    const tripCount = trips || 0;
    if (tripCount < 65) return "text-red-500";
    if (tripCount <= 85) return "text-yellow-500";
    if (tripCount <= 110) return "text-blue-500";
    return "text-green-500";
  };

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      (vehicle.vehicle_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
        (vehicle.fleet_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ??
          false)) &&
      (!showOnlyActive || vehicle.online)
  );

  return (
    <AdminLayout title="Vehicles Management">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles by number or fleet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="space-x-2 flex items-center">
          <Button onClick={handleAddNewVehicle}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Vehicle
          </Button>
          <Button
            onClick={() =>
              (window.location.href = "/admin/vehicles/vehicles-inactive")
            }
          >
            <Car className="h-4 w-4 mr-2" /> show vehicles
          </Button>
          {/* <div className="flex items-center space-x-2">
            <Switch
              checked={showOnlyActive}
              onCheckedChange={setShowOnlyActive}
            />
            <span>Show Only Active Vehicles</span>
          </div> */}
          {/* <select
            className="border px-2 py-1 rounded"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="week">This Week</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {filterType === "custom" && (
            <div className="flex gap-2 mt-2">
              <input
                type="date"
                onChange={(e) => setCustomStart(new Date(e.target.value))}
              />
              <input
                type="date"
                onChange={(e) => setCustomEnd(new Date(e.target.value))}
              />
            </div>
          )} */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vehicles
            </CardTitle>
            <Car className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Vehicles
            </CardTitle>
            <Car className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicles.filter((v) => v.online).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Vehicles
            </CardTitle>
            <Car className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicles.filter((v) => !v.online).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <select
              className="border px-3 py-2 rounded-md text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            {filterType === "custom" && (
              <div className="flex gap-2">
                <input
                  type="date"
                  onChange={(e) => setCustomStart(new Date(e.target.value))}
                  className="border px-2 py-1 rounded text-sm"
                />
                <input
                  type="date"
                  onChange={(e) => setCustomEnd(new Date(e.target.value))}
                  className="border px-2 py-1 rounded text-sm"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>id</TableHead>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Fleet Name</TableHead>
                    <TableHead>Deposit Amount</TableHead>
                    <TableHead>Total Trips</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No vehicles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle, index) => (
                      <TableRow key={vehicle.vehicle_number}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {vehicle.vehicle_number}
                        </TableCell>
                        <TableCell>{vehicle.fleet_name || "N/A"}</TableCell>
                        <TableCell>
                          ₹{vehicle.deposit?.toLocaleString() || "0"}
                        </TableCell>
                        <TableCell>
                          <p
                            className={`${getTripBadgeVariant(
                              vehicle.total_trips
                            )} font-extrabold`}
                          >
                            {vehicle.total_trips || 0}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={vehicle.online ? "success" : "destructive"}
                            className="cursor-pointer"
                            onClick={() =>
                              toggleVehicleStatus(
                                vehicle.vehicle_number,
                                vehicle.online
                              )
                            }
                          >
                            {vehicle.online ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.created_at
                            ? new Date(vehicle.created_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.location.href = `/admin/vehicles/history/${vehicle.vehicle_number}`;
                            }}
                          >
                            <History className="h-4 w-4 mr-1" /> History
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateZeroTotalTrips(vehicle.vehicle_number)
                            }
                          >
                            Reset
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicle(vehicle);
                              setEditData(vehicle);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              deleteVehicle(vehicle.vehicle_number)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedVehicle || addingNewVehicle}
        onOpenChange={() => {
          setSelectedVehicle(null);
          setAddingNewVehicle(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedVehicle ? "Edit Vehicle Details" : "Add New Vehicle"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Vehicle Number</label>
              <Input
                value={
                  selectedVehicle
                    ? editData.vehicle_number
                    : newVehicleData.vehicle_number
                }
                className="uppercase"
                onChange={(e) =>
                  selectedVehicle
                    ? handleEditChange("vehicle_number", e.target.value)
                    : setNewVehicleData((prev) => ({
                        ...prev,
                        vehicle_number: e.target.value,
                      }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fleet Name</label>
              <Input
                value={
                  selectedVehicle
                    ? editData.fleet_name
                    : newVehicleData.fleet_name
                }
                onChange={(e) =>
                  selectedVehicle
                    ? handleEditChange("fleet_name", e.target.value)
                    : setNewVehicleData((prev) => ({
                        ...prev,
                        fleet_name: e.target.value,
                      }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deposit Amount</label>
              <Input
                type="number"
                value={
                  selectedVehicle ? editData.deposit : newVehicleData.deposit
                }
                onChange={(e) =>
                  selectedVehicle
                    ? handleEditChange("deposit", Number(e.target.value))
                    : setNewVehicleData((prev) => ({
                        ...prev,
                        deposit: Number(e.target.value),
                      }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total Trips</label>
              <Input
                type="number"
                value={
                  selectedVehicle
                    ? editData.total_trips
                    : newVehicleData.total_trips
                }
                onChange={(e) =>
                  selectedVehicle
                    ? handleEditChange("total_trips", Number(e.target.value))
                    : setNewVehicleData((prev) => ({
                        ...prev,
                        total_trips: Number(e.target.value),
                      }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedVehicle(null);
                  setAddingNewVehicle(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={selectedVehicle ? saveVehicleChanges : addNewVehicle}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving
                  ? "Saving..."
                  : selectedVehicle
                  ? "Save Changes"
                  : "Add Vehicle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assigned Drivers Warning Dialog */}
      <Dialog
        open={showAssignedDriversDialog}
        onOpenChange={setShowAssignedDriversDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Drivers Assigned to Vehicle
            </DialogTitle>
            <DialogDescription>
              The following driver(s) are currently assigned to this vehicle.
              Please unassign the vehicle from these drivers before deactivating
              it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <Car className="h-4 w-4" />
                <span className="font-medium">
                  Vehicle: {vehicleToDeactivate?.vehicle_number}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                You need to remove the vehicle assignment from the driver(s)
                listed below before deactivating this vehicle.
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {assignedDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {driver.name || "Unknown"}
                        </p>
                        <div className="flex gap-3 text-sm text-gray-500">
                          {driver.driver_id && (
                            <span>ID: {driver.driver_id}</span>
                          )}
                          {driver.phone_number && (
                            <span>Phone: {driver.phone_number}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={driver.online ? "success" : "secondary"}
                      className="ml-2"
                    >
                      {driver.online ? "Online" : "Offline"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Go to the Drivers section and unassign
                the vehicle from these drivers, or set their vehicle number to
                "No Vehicle" before deactivating this vehicle.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignedDriversDialog(false);
                setAssignedDrivers([]);
                setVehicleToDeactivate(null);
              }}
            >
              Cancel
            </Button>
            {/* <Button
              variant="destructive"
              onClick={handleDeactivateAnyway}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Deactivate Anyway
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVehicles;
