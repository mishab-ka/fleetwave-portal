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
import { Car, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Vehicle {
  vehicle_number: string;
  fleet_name: string | null;
  total_trips: number | null;
  online: boolean | null;
  deposit: number | null;
  created_at: string | null;
  offline_from_date: string | null;
}

const AdminInactiveVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInactiveVehicles();
  }, []);

  const fetchInactiveVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("online", false);
      // .order("offline_from_date", { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching inactive vehicles:", error);
      toast.error("Failed to load inactive vehicles data");
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicleStatus = async (
    vehicle_number: string,
    currentStatus: boolean | null
  ) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          online: !currentStatus,
          online_from_date: !currentStatus ? new Date().toISOString() : null,
          offline_from_date: currentStatus ? new Date().toISOString() : null,
        })
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

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.vehicle_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (vehicle.fleet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false)
  );

  return (
    <AdminLayout title="Inactive Vehicles">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inactive Vehicles
            </CardTitle>
            <Car className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Average Inactive Duration
            </CardTitle>
            <Car className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicles.length > 0
                ? Math.round(
                    vehicles.reduce((acc, vehicle) => {
                      if (vehicle.offline_from_date) {
                        const offlineDate = new Date(vehicle.offline_from_date);
                        const now = new Date();
                        const diffDays = Math.ceil(
                          (now.getTime() - offlineDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return acc + diffDays;
                      }
                      return acc;
                    }, 0) / vehicles.length
                  )
                : 0}{" "}
              days
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
            <div className="overflow-x-auto h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Fleet Name</TableHead>
                    <TableHead>Deposit Amount</TableHead>
                    <TableHead>Total Trips</TableHead>
                    <TableHead>Inactive Since</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No inactive vehicles found
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
                        <TableCell>{vehicle.total_trips || 0}</TableCell>
                        <TableCell>
                          {vehicle.offline_from_date
                            ? new Date(
                                vehicle.offline_from_date
                              ).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() =>
                              toggleVehicleStatus(
                                vehicle.vehicle_number,
                                vehicle.online
                              )
                            }
                          >
                            Inactive
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.location.href = `/admin/vehicles/history/${vehicle.vehicle_number}`;
                            }}
                          >
                            View History
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
    </AdminLayout>
  );
};

export default AdminInactiveVehicles;
