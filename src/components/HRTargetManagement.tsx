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
import { Target, Users, Plus, Edit, Trash2, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { setTarget, type Target as TargetType, type TargetType as TargetPeriod } from "@/services/hrTargetsService";
import { toast } from "sonner";

const HRTargetManagement: React.FC = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState<any[]>([]);
  const [hrStaff, setHrStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    staff_user_id: "",
    target_type: "daily" as TargetPeriod,
    target_calls: 30,
    target_conversions: 10,
    target_duration: 240, // minutes
    target_work_hours: 8,
    is_global: false,
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

    if (error) throw error;
    setTargets(data || []);
  };

  const fetchHRStaff = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, phone_number")
      .eq("role", "hr_staff")
      .order("name", { ascending: true });

    if (error) throw error;
    setHrStaff(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const targetData: Partial<TargetType> = {
      ...formData,
      staff_user_id: formData.is_global ? null : formData.staff_user_id || null,
      start_date: new Date().toISOString().split("T")[0],
      is_active: true,
    };

    if (editingTarget) {
      targetData.id = editingTarget.id;
    }

    const result = await setTarget(targetData, user.id);

    if (result.success) {
      toast.success(
        editingTarget
          ? "Target updated successfully"
          : "Target created successfully"
      );
      setShowDialog(false);
      resetForm();
      fetchTargets();
    } else {
      toast.error("Failed to save target");
    }
  };

  const handleEdit = (target: any) => {
    setEditingTarget(target);
    setFormData({
      staff_user_id: target.staff_user_id || "",
      target_type: target.target_type,
      target_calls: target.target_calls,
      target_conversions: target.target_conversions,
      target_duration: target.target_duration,
      target_work_hours: target.target_work_hours,
      is_global: target.is_global,
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
      target_type: "daily",
      target_calls: 30,
      target_conversions: 10,
      target_duration: 240,
      target_work_hours: 8,
      is_global: false,
    });
  };

  const getTargetTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const globalTargets = targets.filter((t) => t.is_global);
  const personalTargets = targets.filter((t) => !t.is_global);

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

      {/* Global Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Global Targets
            <Badge variant="outline" className="ml-2">
              {globalTargets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {globalTargets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No global targets set</p>
              <p className="text-sm mt-1">
                Global targets apply to all staff members
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalTargets.map((target) => (
                <Card key={target.id} className="border-2 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className="bg-blue-100 text-blue-800">
                        {getTargetTypeLabel(target.target_type)}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(target)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(target.id)}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Calls:</span>
                        <span className="font-medium">{target.target_calls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversions:</span>
                        <span className="font-medium">
                          {target.target_conversions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Work Hours:</span>
                        <span className="font-medium">
                          {target.target_work_hours}h
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Individual Staff Targets
            <Badge variant="outline" className="ml-2">
              {personalTargets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personalTargets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No individual targets set</p>
              <p className="text-sm mt-1">
                Set custom targets for specific staff members
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {personalTargets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {target.users?.name || target.users?.phone_number}
                        </span>
                        <Badge variant="outline">
                          {getTargetTypeLabel(target.target_type)}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Calls: {target.target_calls}</span>
                        <span>•</span>
                        <span>Conversions: {target.target_conversions}</span>
                        <span>•</span>
                        <span>Hours: {target.target_work_hours}h</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(target)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(target.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Target" : "Create New Target"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Global Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_global"
                checked={formData.is_global}
                onChange={(e) =>
                  setFormData({ ...formData, is_global: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="is_global">
                Global Target (applies to all staff)
              </Label>
            </div>

            {/* Staff Selection */}
            {!formData.is_global && (
              <div>
                <Label htmlFor="staff">Staff Member *</Label>
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
            )}

            {/* Target Type */}
            <div>
              <Label htmlFor="target_type">Target Type *</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value: TargetPeriod) =>
                  setFormData({ ...formData, target_type: value })
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

            {/* Target Calls */}
            <div>
              <Label htmlFor="target_calls">Target Calls *</Label>
              <Input
                id="target_calls"
                type="number"
                min="0"
                value={formData.target_calls}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_calls: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            {/* Target Conversions */}
            <div>
              <Label htmlFor="target_conversions">Target Conversions *</Label>
              <Input
                id="target_conversions"
                type="number"
                min="0"
                value={formData.target_conversions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_conversions: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            {/* Target Work Hours */}
            <div>
              <Label htmlFor="target_work_hours">Target Work Hours *</Label>
              <Input
                id="target_work_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.target_work_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_work_hours: parseFloat(e.target.value) || 0,
                  })
                }
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

export default HRTargetManagement;

