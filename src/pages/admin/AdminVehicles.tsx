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
import { PlusCircle, Edit, Car, Search, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const [newVehicleData, setNewVehicleData] = useState({
    vehicle_number: "",
    fleet_name: "",
    deposit: 0,
    total_trips: 0,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_number");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles data");
    } finally {
      setLoading(false);
    }
  };

  // async function updateZeroTotalTrips(newTripCount: number) {
  //   const { data, error } = await supabase
  //     .from("vehicles")
  //     .update({ total_trips: newTripCount })
  //     .eq("vehicle_number", newVehicleData.vehicle_number);
  //   console.log("Updated :", newVehicleData);

  //   if (error) {
  //     console.error("Error updating total_trips:", error.message);
  //   } else {
  //     console.log("Updated vehicles:", data);
  //   }
  // }

  const toggleVehicleStatus = async (
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

  const addNewVehicle = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase.from("vehicles").insert([
        {
          ...newVehicleData,
          deposit: Number(newVehicleData.deposit),
          total_trips: Number(newVehicleData.total_trips),
        },
      ]);

      if (error) throw error;

      toast.success("New vehicle added successfully!");
      setAddingNewVehicle(false);

      // Refresh the vehicles list
      fetchVehicles();
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add new vehicle.");
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
      vehicle.vehicle_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (vehicle.fleet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false)
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
        <Button onClick={handleAddNewVehicle}>
          <PlusCircle className="h-4 w-4 mr-2" /> Add New Vehicle
        </Button>
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
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={updateZeroTotalTrips(0)}
                          >
                            Reset
                          </Button> */}
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
    </AdminLayout>
  );
};

export default AdminVehicles;
