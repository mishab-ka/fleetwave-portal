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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";

interface VehicleHistory {
  id: string;
  vehicle_number: string;
  recorded_at: string;
  total_trips: number;
  type: string;
}

const VehicleHistory = () => {
  const { vehicleNumber } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<VehicleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [filterType, setFilterType] = useState("all");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (vehicleNumber) {
      fetchVehicleInfo();
      fetchVehicleHistory();
    }
  }, [vehicleNumber, filterType, customStart, customEnd]);

  const fetchVehicleHistory = async () => {
    try {
      let query = supabase
        .from("vehicle_trip_history")
        .select("*")
        .eq("vehicle_number", vehicleNumber)
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
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching vehicle history:", error);
      toast.error("Failed to load vehicle history");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("vehicle_number", vehicleNumber)
        .single();

      if (error) throw error;
      setVehicleInfo(data);
    } catch (error) {
      console.error("Error fetching vehicle info:", error);
      toast.error("Failed to load vehicle information");
    }
  };

  return (
    <AdminLayout title={`Vehicle History - ${vehicleNumber}`}>
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {vehicleInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">
                  Current Status
                </div>
                <div className="text-2xl font-bold">
                  <Badge
                    variant={vehicleInfo.online ? "success" : "destructive"}
                  >
                    {vehicleInfo.online ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">
                  Current Total Trips
                </div>
                <div className="text-2xl font-bold">
                  {vehicleInfo.total_trips || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">
                  Fleet Name
                </div>
                <div className="text-2xl font-bold">
                  {vehicleInfo.fleet_name || "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <select
            className="border px-3 py-2 rounded-md text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All History</option>
            <option value="daily">Daily Records</option>
            <option value="weekly">Weekly Records</option>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total Trips</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          No history found
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.recorded_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {record.type.charAt(0).toUpperCase() +
                                record.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.total_trips}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default VehicleHistory;
