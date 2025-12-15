import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Target, Users, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TargetData {
  id?: string;
  staff_user_id: string;
  target_type: string;
  target_value: number;
  period: "daily" | "weekly" | "monthly";
  is_active: boolean;
}

const HRTargetManagementSimple: React.FC = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState<any[]>([]);
  const [hrStaff, setHrStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    staff_user_id: "",
    target_type: "daily_calls",
    target_value: 50,
    period: "daily" as "daily" | "weekly" | "monthly",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTargets(), fetchHRStaff()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    const { data, error } = await supabase
      .from("hr_staff_targets")
      .select(`
        *,
        users!hr_staff_targets_staff_user_id_fkey (
          id,
          name,
          phone_number
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching targets:", error);
      return;
    }
    setTargets(data || []);
  };

  const fetchHRStaff = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, phone_number")
      .eq("role", "hr_staff")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching staff:", error);
      return;
    }
    setHrStaff(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !formData.staff_user_id) {
      toast.error("Please select a staff member");
      return;
    }

    const targetData: any = {
      staff_user_id: formData.staff_user_id,
      target_type: formData.target_type,
      target_value: formData.target_value,
      period: formData.period,
      is_active: true,
      created_by: user.id,
    };

    if (editingTarget) {
      // Update existing target
      const { error } = await supabase
        .from("hr_staff_targets")
        .update(targetData)
        .eq("id", editingTarget.id);

      if (error) {
        console.error("Error updating target:", error);
        toast.error("Failed to update target");
        return;
      }
      toast.success("Target updated successfully");
    } else {
      // Create new target
      const { error } = await supabase
        .from("hr_staff_targets")
        .insert([targetData]);

      if (error) {
        console.error("Error creating target:", error);
        toast.error("Failed to create target");
        return;
      }
      toast.success("Target created successfully");
    }

    setShowDialog(false);
    resetForm();
    fetchTargets();
  };

  const handleEdit = (target: any) => {
    setEditingTarget(target);
    setFormData({
      staff_user_id: target.staff_user_id || "",
      target_type: target.target_type,
      target_value: target.target_value,
      period: target.period,
    });
    setShowDialog(true);
  };

  const handleDelete = async (targetId: string) => {
    if (!confirm("Are you sure you want to delete this target?")) return;

    const { error } = await supabase
      .from("hr_staff_targets")
      .update({ is_active: false })
      .eq("id", targetId);

    if (error) {
      toast.error("Failed to delete target");
    } else {
      toast.success("Target deleted successfully");
      fetchTargets();
    }
  };

  const resetForm = () => {
    setEditingTarget(null);
    setFormData({
      staff_user_id: "",
      target_type: "daily_calls",
      target_value: 50,
      period: "daily",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Target Management</h2>
          <p className="text-gray-600">
            Set performance targets for your HR staff
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Target
        </Button>
      </div>

      {/* Targets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targets.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No targets set</p>
              <p className="text-gray-500 text-sm mt-1">
                Create your first target to start tracking performance
              </p>
            </CardContent>
          </Card>
        ) : (
          targets.map((target) => (
            <Card key={target.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {target.users?.name || target.users?.phone_number || "Unknown"}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {target.users?.phone_number}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {target.period}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Target Type</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {target.target_type.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Target Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {target.target_value}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(target)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(target.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Target" : "Create New Target"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select
                value={formData.staff_user_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, staff_user_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {hrStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name || staff.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_type">Target Type</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, target_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_calls">Daily Calls</SelectItem>
                  <SelectItem value="weekly_calls">Weekly Calls</SelectItem>
                  <SelectItem value="monthly_calls">Monthly Calls</SelectItem>
                  <SelectItem value="conversions">Conversions</SelectItem>
                  <SelectItem value="work_hours">Work Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select
                value={formData.period}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, period: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value</Label>
              <Input
                id="target_value"
                type="number"
                value={formData.target_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_value: parseInt(e.target.value) || 0,
                  })
                }
                min="1"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTarget ? "Update Target" : "Create Target"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRTargetManagementSimple;

