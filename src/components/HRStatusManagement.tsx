import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Palette,
} from "lucide-react";

interface LeadStatus {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const HRStatusManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [filteredStatuses, setFilteredStatuses] = useState<LeadStatus[]>([]);

  // Form states
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showEditStatus, setShowEditStatus] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);

  // Form data
  const [newStatus, setNewStatus] = useState({
    name: "",
    display_name: "",
    description: "",
    color: "#6366f1",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");

  // Predefined colors
  const colorOptions = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Gray", value: "#6b7280" },
    { name: "Orange", value: "#f97316" },
    { name: "Teal", value: "#14b8a6" },
  ];

  useEffect(() => {
    fetchLeadStatuses();
  }, []);

  useEffect(() => {
    filterStatuses();
  }, [leadStatuses, searchTerm]);

  const fetchLeadStatuses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_lead_statuses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setLeadStatuses(data || []);
    } catch (error) {
      console.error("Error fetching lead statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterStatuses = () => {
    let filtered = [...leadStatuses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (status) =>
          status.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          status.display_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          status.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStatuses(filtered);
  };

  const addLeadStatus = async () => {
    if (!newStatus.name || !newStatus.display_name) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_lead_statuses")
        .insert([newStatus])
        .select();

      if (error) throw error;

      setNewStatus({
        name: "",
        display_name: "",
        description: "",
        color: "#6366f1",
      });
      setShowAddStatus(false);
      await fetchLeadStatuses();
    } catch (error) {
      console.error("Error adding lead status:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async () => {
    if (!editingStatus) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_lead_statuses")
        .update({
          name: editingStatus.name,
          display_name: editingStatus.display_name,
          description: editingStatus.description,
          color: editingStatus.color,
        })
        .eq("id", editingStatus.id);

      if (error) throw error;

      setEditingStatus(null);
      setShowEditStatus(false);
      await fetchLeadStatuses();
    } catch (error) {
      console.error("Error updating lead status:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatusActive = async (
    statusId: string,
    currentStatus: boolean
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_lead_statuses")
        .update({ is_active: !currentStatus })
        .eq("id", statusId);

      if (error) throw error;

      await fetchLeadStatuses();
    } catch (error) {
      console.error("Error toggling status:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLeadStatus = async (statusId: string) => {
    if (!confirm("Are you sure you want to delete this lead status?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_lead_statuses")
        .delete()
        .eq("id", statusId);

      if (error) throw error;

      await fetchLeadStatuses();
    } catch (error) {
      console.error("Error deleting lead status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && leadStatuses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fleet-purple">
            Lead Status Management
          </h1>
          <p className="text-gray-600">
            Manage lead statuses and their appearance
          </p>
        </div>
        <Button
          onClick={() => setShowAddStatus(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Status
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Statuses
                </p>
                <p className="text-2xl font-bold text-fleet-purple">
                  {leadStatuses.length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-fleet-purple" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Statuses
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {leadStatuses.filter((s) => s.is_active).length}
                </p>
              </div>
              <ToggleRight className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Inactive Statuses
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {leadStatuses.filter((s) => !s.is_active).length}
                </p>
              </div>
              <ToggleLeft className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Statuses</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                disabled={!searchTerm}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Statuses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Statuses ({filteredStatuses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStatuses.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No lead statuses found</p>
              <p className="text-sm text-gray-400">
                Click "Add Status" to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-medium">
                        <Badge
                          style={{ backgroundColor: status.color }}
                          className="text-white"
                        >
                          {status.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{status.display_name}</TableCell>
                      <TableCell>
                        {status.description || "No description"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-sm text-gray-600">
                            {status.color}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.is_active ? "default" : "secondary"}
                          className={
                            status.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {status.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(status.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleStatusActive(status.id, status.is_active)
                            }
                            disabled={loading}
                          >
                            {status.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingStatus(status);
                              setShowEditStatus(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => deleteLeadStatus(status.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Status Dialog */}
      <Dialog open={showAddStatus} onOpenChange={setShowAddStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lead Status</DialogTitle>
            <p className="text-sm text-gray-600">
              Create a new lead status for tracking
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status-name">Name *</Label>
              <Input
                id="status-name"
                value={newStatus.name}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, name: e.target.value })
                }
                placeholder="Enter status name (e.g., hot_lead)"
              />
            </div>
            <div>
              <Label htmlFor="status-display">Display Name *</Label>
              <Input
                id="status-display"
                value={newStatus.display_name}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, display_name: e.target.value })
                }
                placeholder="Enter display name (e.g., Hot Lead)"
              />
            </div>
            <div>
              <Label htmlFor="status-description">Description</Label>
              <Textarea
                id="status-description"
                value={newStatus.description}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, description: e.target.value })
                }
                placeholder="Enter status description"
              />
            </div>
            <div>
              <Label htmlFor="status-color">Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      newStatus.color === color.value
                        ? "border-gray-800"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setNewStatus({ ...newStatus, color: color.value })
                    }
                    title={color.name}
                  />
                ))}
              </div>
              <Input
                value={newStatus.color}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, color: e.target.value })
                }
                placeholder="#6366f1"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddStatus(false)}>
                Cancel
              </Button>
              <Button onClick={addLeadStatus} disabled={loading}>
                Add Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={showEditStatus} onOpenChange={setShowEditStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead Status</DialogTitle>
            <p className="text-sm text-gray-600">
              Update the lead status information
            </p>
          </DialogHeader>
          {editingStatus && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-status-name">Name *</Label>
                <Input
                  id="edit-status-name"
                  value={editingStatus.name}
                  onChange={(e) =>
                    setEditingStatus({ ...editingStatus, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-status-display">Display Name *</Label>
                <Input
                  id="edit-status-display"
                  value={editingStatus.display_name}
                  onChange={(e) =>
                    setEditingStatus({
                      ...editingStatus,
                      display_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-status-description">Description</Label>
                <Textarea
                  id="edit-status-description"
                  value={editingStatus.description || ""}
                  onChange={(e) =>
                    setEditingStatus({
                      ...editingStatus,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-status-color">Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingStatus.color === color.value
                          ? "border-gray-800"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() =>
                        setEditingStatus({
                          ...editingStatus,
                          color: color.value,
                        })
                      }
                      title={color.name}
                    />
                  ))}
                </div>
                <Input
                  value={editingStatus.color}
                  onChange={(e) =>
                    setEditingStatus({
                      ...editingStatus,
                      color: e.target.value,
                    })
                  }
                  placeholder="#6366f1"
                  className="mt-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditStatus(false)}
                >
                  Cancel
                </Button>
                <Button onClick={updateLeadStatus} disabled={loading}>
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRStatusManagement;








