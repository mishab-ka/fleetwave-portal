import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
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
  Phone,
  Users,
  MessageSquare,
  Settings,
  Trash2,
  Edit,
  UserPlus,
  PhoneCall,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HRManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  is_active: boolean;
}

interface HRStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  is_active: boolean;
  assigned_at?: string;
}

interface WhatsAppNumber {
  id: string;
  phone_number: string;
  is_active: boolean;
}

interface LeadStatus {
  id: string;
  name: string;
  display_name: string;
  color: string;
  is_system: boolean;
}

const HRManagerPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "staff" | "numbers" | "statuses"
  >("overview");
  const [loading, setLoading] = useState(false);

  // Data states
  const [hrStaff, setHrStaff] = useState<HRStaff[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  // Form states
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showEditStatus, setShowEditStatus] = useState(false);

  // Form data
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    department: "HR",
  });

  const [newNumber, setNewNumber] = useState({
    phone_number: "",
  });

  const [newStatus, setNewStatus] = useState({
    name: "",
    display_name: "",
    description: "",
    color: "#3B82F6",
  });

  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchHRStaff(),
        fetchWhatsappNumbers(),
        fetchLeadStatuses(),
        fetchLeads(),
      ]);
    } catch (error) {
      console.error("Error fetching HR data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHRStaff = async () => {
    const { data, error } = await supabase
      .from("hr_staff")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setHrStaff(data || []);
  };

  const fetchWhatsappNumbers = async () => {
    const { data, error } = await supabase
      .from("hr_whatsapp_numbers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setWhatsappNumbers(data || []);
  };

  const fetchLeadStatuses = async () => {
    const { data, error } = await supabase
      .from("hr_lead_statuses")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    setLeadStatuses(data || []);
  };

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("hr_lead_summary")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setLeads(data || []);
  };

  const addHRStaff = async () => {
    if (!newStaff.name || !newStaff.email) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_staff")
        .insert([
          {
            name: newStaff.name,
            email: newStaff.email,
            phone: newStaff.phone,
            department: newStaff.department,
          },
        ])
        .select();

      if (error) throw error;

      setNewStaff({ name: "", email: "", phone: "", department: "HR" });
      setShowAddStaff(false);
      await fetchHRStaff();
    } catch (error) {
      console.error("Error adding HR staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const addWhatsappNumber = async () => {
    if (!newNumber.phone_number) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_whatsapp_numbers")
        .insert([
          {
            phone_number: newNumber.phone_number,
          },
        ])
        .select();

      if (error) throw error;

      setNewNumber({ phone_number: "" });
      setShowAddNumber(false);
      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error adding WhatsApp number:", error);
    } finally {
      setLoading(false);
    }
  };

  const addLeadStatus = async () => {
    if (!newStatus.name || !newStatus.display_name) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_lead_statuses")
        .insert([
          {
            name: newStatus.name,
            display_name: newStatus.display_name,
            description: newStatus.description,
            color: newStatus.color,
          },
        ])
        .select();

      if (error) throw error;

      setNewStatus({
        name: "",
        display_name: "",
        description: "",
        color: "#3B82F6",
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

  const deleteLeadStatus = async (statusId: string) => {
    if (!confirm("Are you sure you want to delete this status?")) return;

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

  const assignStaffToLeads = async (staffId: string) => {
    // This would implement the logic to assign leads to staff
    // For now, we'll just show a placeholder
    alert(`Assigning leads to staff member with ID: ${staffId}`);
  };

  const getStatusCounts = () => {
    const counts: { [key: string]: number } = {};
    leads.forEach((lead) => {
      const status = lead.status_name || "No Status";
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading && leads.length === 0) {
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
            HR Manager Portal
          </h1>
          <p className="text-gray-600">
            Manage HR staff, WhatsApp numbers, and lead statuses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
          </Button>
          <Button
            onClick={() => setShowAddNumber(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Add Number
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          {
            id: "overview",
            label: "Overview",
            icon: <Users className="w-4 h-4" />,
          },
          {
            id: "staff",
            label: "HR Staff",
            icon: <Users className="w-4 h-4" />,
          },
          {
            id: "numbers",
            label: "WhatsApp Numbers",
            icon: <Phone className="w-4 h-4" />,
          },
          {
            id: "statuses",
            label: "Lead Statuses",
            icon: <Settings className="w-4 h-4" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-fleet-purple shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Staff
                    </p>
                    <p className="text-2xl font-bold text-fleet-purple">
                      {hrStaff.length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-fleet-purple" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      WhatsApp Numbers
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {whatsappNumbers.length}
                    </p>
                  </div>
                  <Phone className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Leads
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {leads.length}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Status Types
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {leadStatuses.length}
                    </p>
                  </div>
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lead Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{status}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-gray-600">
                        {lead.phone_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: lead.status_color }}>
                        {lead.status_display}
                      </Badge>
                      {lead.assigned_staff_name && (
                        <span className="text-sm text-gray-600">
                          Assigned to: {lead.assigned_staff_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HR Staff Tab */}
      {activeTab === "staff" && (
        <Card>
          <CardHeader>
            <CardTitle>HR Staff Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>{staff.phone}</TableCell>
                    <TableCell>{staff.department}</TableCell>
                    <TableCell>
                      <Badge
                        variant={staff.is_active ? "default" : "secondary"}
                      >
                        {staff.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => assignStaffToLeads(staff.id)}
                        >
                          Assign Leads
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Numbers Tab */}
      {activeTab === "numbers" && (
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Inquiry Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whatsappNumbers.map((number) => (
                  <TableRow key={number.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-green-600" />
                        {number.phone_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={number.is_active ? "default" : "secondary"}
                      >
                        {number.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteWhatsappNumber(number.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Lead Statuses Tab */}
      {activeTab === "statuses" && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadStatuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-medium">{status.display_name}</p>
                      <p className="text-sm text-gray-600">
                        {status.description}
                      </p>
                    </div>
                    {status.is_system && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
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
                    {!status.is_system && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => deleteLeadStatus(status.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add HR Staff</DialogTitle>
            <p className="text-sm text-gray-600">
              Add a new HR staff member to the system
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={newStaff.name}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, name: e.target.value })
                }
                placeholder="Enter staff name"
              />
            </div>
            <div>
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={newStaff.phone}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="staff-department">Department</Label>
              <Input
                id="staff-department"
                value={newStaff.department}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, department: e.target.value })
                }
                placeholder="Enter department"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddStaff(false)}>
                Cancel
              </Button>
              <Button onClick={addHRStaff} disabled={loading}>
                Add Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add WhatsApp Number Dialog */}
      <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WhatsApp Number</DialogTitle>
            <p className="text-sm text-gray-600">
              Enter a phone number for WhatsApp inquiries
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="number-phone">Phone Number</Label>
              <Input
                id="number-phone"
                value={newNumber.phone_number}
                onChange={(e) =>
                  setNewNumber({ ...newNumber, phone_number: e.target.value })
                }
                placeholder="Enter phone number (e.g., +1234567890)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddNumber(false)}>
                Cancel
              </Button>
              <Button onClick={addWhatsappNumber} disabled={loading}>
                Add Number
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Status Dialog */}
      <Dialog open={showAddStatus} onOpenChange={setShowAddStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lead Status</DialogTitle>
            <p className="text-sm text-gray-600">
              Create a new status for lead tracking
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status-name">Status Name</Label>
              <Input
                id="status-name"
                value={newStatus.name}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, name: e.target.value })
                }
                placeholder="Enter status name (e.g., 'hot_lead')"
              />
            </div>
            <div>
              <Label htmlFor="status-display">Display Name</Label>
              <Input
                id="status-display"
                value={newStatus.display_name}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, display_name: e.target.value })
                }
                placeholder="Enter display name (e.g., 'Hot Lead')"
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
                placeholder="Enter description"
              />
            </div>
            <div>
              <Label htmlFor="status-color">Color</Label>
              <Input
                id="status-color"
                type="color"
                value={newStatus.color}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, color: e.target.value })
                }
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

      {/* Edit Lead Status Dialog */}
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
                <Label htmlFor="edit-status-display">Display Name</Label>
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
                <Input
                  id="edit-status-color"
                  type="color"
                  value={editingStatus.color}
                  onChange={(e) =>
                    setEditingStatus({
                      ...editingStatus,
                      color: e.target.value,
                    })
                  }
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

export default HRManagerPortal;
