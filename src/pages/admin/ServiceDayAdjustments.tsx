import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Wrench } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ServiceDayAdjustment {
  id: string;
  user_id: string;
  driver_name: string;
  vehicle_number: string | null;
  adjustment_date: string;
  discount_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

const ServiceDayAdjustments: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isManager } = useAdmin();
  const { logActivity } = useActivityLogger();
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<ServiceDayAdjustment[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [adjustmentDate, setAdjustmentDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && (isAdmin || isManager)) {
      fetchAdjustments();
      fetchDrivers();
    }
  }, [user, isAdmin, isManager]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_day_adjustments")
        .select(
          `
          *,
          creator:users!service_day_adjustments_created_by_fkey(name)
        `
        )
        .order("adjustment_date", { ascending: false });

      if (error) throw error;

      setAdjustments(
        (data || []).map((adj) => ({
          ...adj,
          creator_name: adj.creator?.name || "Unknown",
        }))
      );
    } catch (error: any) {
      console.error("Error fetching adjustments:", error);
      toast.error("Failed to load service day adjustments");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, vehicle_number, driver_id")
        .eq("online", true)
        .order("name");

      if (error) throw error;

      setDrivers(data || []);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAddAdjustment = async () => {
    if (!selectedDriver || !adjustmentDate || !user) {
      toast.error("Please select a driver and date");
      return;
    }

    const selectedDriverData = drivers.find((d) => d.id === selectedDriver);
    if (!selectedDriverData) {
      toast.error("Selected driver not found");
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = format(adjustmentDate, "yyyy-MM-dd");

      // Check if adjustment already exists
      const { data: existing, error: checkError } = await supabase
        .from("service_day_adjustments")
        .select("id")
        .eq("user_id", selectedDriver)
        .eq("adjustment_date", dateStr)
        .single();

      if (existing && !checkError) {
        toast.error(
          "Service day adjustment already exists for this driver and date"
        );
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("service_day_adjustments")
        .insert({
          user_id: selectedDriver,
          driver_name: selectedDriverData.name,
          vehicle_number: selectedDriverData.vehicle_number,
          adjustment_date: dateStr,
          discount_amount: 300.0,
          notes: notes.trim() || null,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success("Service day adjustment added successfully");
      
      // Log activity
      await logActivity({
        actionType: "assign_service_day",
        actionCategory: "reports",
        description: `Assigned service day adjustment to driver ${selectedDriverData.name} (${selectedDriverData.vehicle_number}) on ${dateStr} - Discount: ₹300`,
        metadata: {
          user_id: selectedDriver,
          driver_name: selectedDriverData.name,
          vehicle_number: selectedDriverData.vehicle_number,
          adjustment_date: dateStr,
          discount_amount: 300.0,
          notes: notes.trim() || null,
        },
        pageName: "Service Day Adjustments",
      });
      
      setIsAddModalOpen(false);
      setSelectedDriver("");
      setAdjustmentDate(undefined);
      setNotes("");
      fetchAdjustments();
    } catch (error: any) {
      console.error("Error adding adjustment:", error);
      toast.error(error.message || "Failed to add service day adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this service day adjustment?")
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("service_day_adjustments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Service day adjustment deleted successfully");
      fetchAdjustments();
    } catch (error: any) {
      console.error("Error deleting adjustment:", error);
      toast.error("Failed to delete service day adjustment");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Service Day Adjustments">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Service Day Adjustments">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-500" />
                Service Day Adjustments
              </CardTitle>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Adjustment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Discount Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-gray-500"
                      >
                        No service day adjustments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    adjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          {format(
                            new Date(adjustment.adjustment_date),
                            "dd MMM yyyy"
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {adjustment.driver_name}
                        </TableCell>
                        <TableCell>
                          {adjustment.vehicle_number || "N/A"}
                        </TableCell>
                        <TableCell>
                          ₹{adjustment.discount_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {adjustment.notes || "N/A"}
                        </TableCell>
                        <TableCell>{adjustment.creator_name}</TableCell>
                        <TableCell>
                          {format(
                            new Date(adjustment.created_at),
                            "dd MMM yyyy, HH:mm"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteAdjustment(adjustment.id)
                            }
                            className="text-red-600 hover:text-red-700"
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
          </CardContent>
        </Card>

        {/* Add Adjustment Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Service Day Adjustment</DialogTitle>
              <DialogDescription>
                Assign a service day adjustment for a driver. ₹300 will be
                discounted from their rent on the selected date.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Driver</Label>
                <Select
                  value={selectedDriver}
                  onValueChange={setSelectedDriver}
                  disabled={loadingDrivers || submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}{" "}
                        {driver.vehicle_number
                          ? `(${driver.vehicle_number})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Adjustment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !adjustmentDate && "text-muted-foreground"
                      )}
                      disabled={submitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {adjustmentDate ? (
                        format(adjustmentDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={adjustmentDate}
                      onSelect={setAdjustmentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this adjustment..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  ₹300 will be automatically discounted from the driver's rent
                  when they submit a report on the selected date.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSelectedDriver("");
                  setAdjustmentDate(undefined);
                  setNotes("");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAdjustment} disabled={submitting}>
                {submitting ? "Adding..." : "Add Adjustment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ServiceDayAdjustments;
