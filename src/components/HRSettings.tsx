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
  Users,
  UserPlus,
  Settings,
  Edit,
  Trash2,
  Search,
  Filter,
  Mail,
  Phone,
  Building,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface HRManager {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  is_active: boolean;
  created_at: string;
}

interface HRStaff {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  is_active: boolean;
  created_at: string;
}

const HRSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"managers" | "staff" | "users">(
    "managers"
  );
  const [loading, setLoading] = useState(false);

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [hrManagers, setHrManagers] = useState<HRManager[]>([]);
  const [hrStaff, setHrStaff] = useState<HRStaff[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Form states
  const [showAddManager, setShowAddManager] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditManager, setShowEditManager] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(false);

  // Form data
  const [newManager, setNewManager] = useState({
    user_id: "",
    name: "",
    email: "",
    phone: "",
    department: "HR",
  });

  const [newStaff, setNewStaff] = useState({
    user_id: "",
    name: "",
    email: "",
    phone: "",
    department: "HR",
  });

  const [editingManager, setEditingManager] = useState<HRManager | null>(null);
  const [editingStaff, setEditingStaff] = useState<HRStaff | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchHRManagers(), fetchHRStaff()]);
    } catch (error) {
      console.error("Error fetching HR settings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .order("email", { ascending: true });

    if (error) throw error;
    setUsers(data || []);
  };

  const fetchHRManagers = async () => {
    const { data, error } = await supabase
      .from("hr_managers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setHrManagers(data || []);
  };

  const fetchHRStaff = async () => {
    const { data, error } = await supabase
      .from("hr_staff")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setHrStaff(data || []);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const addHRManager = async () => {
    if (!newManager.user_id || !newManager.name || !newManager.email) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_managers")
        .insert([
          {
            user_id: newManager.user_id,
            name: newManager.name,
            email: newManager.email,
            phone: newManager.phone,
            department: newManager.department,
          },
        ])
        .select();

      if (error) throw error;

      setNewManager({
        user_id: "",
        name: "",
        email: "",
        phone: "",
        department: "HR",
      });
      setShowAddManager(false);
      await fetchHRManagers();
    } catch (error) {
      console.error("Error adding HR manager:", error);
    } finally {
      setLoading(false);
    }
  };

  const addHRStaff = async () => {
    if (!newStaff.user_id || !newStaff.name || !newStaff.email) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_staff")
        .insert([
          {
            user_id: newStaff.user_id,
            name: newStaff.name,
            email: newStaff.email,
            phone: newStaff.phone,
            department: newStaff.department,
          },
        ])
        .select();

      if (error) throw error;

      setNewStaff({
        user_id: "",
        name: "",
        email: "",
        phone: "",
        department: "HR",
      });
      setShowAddStaff(false);
      await fetchHRStaff();
    } catch (error) {
      console.error("Error adding HR staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateHRManager = async () => {
    if (!editingManager) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_managers")
        .update({
          name: editingManager.name,
          email: editingManager.email,
          phone: editingManager.phone,
          department: editingManager.department,
        })
        .eq("id", editingManager.id);

      if (error) throw error;

      setEditingManager(null);
      setShowEditManager(false);
      await fetchHRManagers();
    } catch (error) {
      console.error("Error updating HR manager:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateHRStaff = async () => {
    if (!editingStaff) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_staff")
        .update({
          name: editingStaff.name,
          email: editingStaff.email,
          phone: editingStaff.phone,
          department: editingStaff.department,
        })
        .eq("id", editingStaff.id);

      if (error) throw error;

      setEditingStaff(null);
      setShowEditStaff(false);
      await fetchHRStaff();
    } catch (error) {
      console.error("Error updating HR staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHRManager = async (managerId: string) => {
    if (!confirm("Are you sure you want to delete this HR manager?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_managers")
        .delete()
        .eq("id", managerId);

      if (error) throw error;

      await fetchHRManagers();
    } catch (error) {
      console.error("Error deleting HR manager:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHRStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this HR staff?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_staff")
        .delete()
        .eq("id", staffId);

      if (error) throw error;

      await fetchHRStaff();
    } catch (error) {
      console.error("Error deleting HR staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string, type: "manager" | "staff") => {
    const selectedUser = users.find((u) => u.id === userId);
    if (!selectedUser) return;

    if (type === "manager") {
      setNewManager({
        user_id: selectedUser.id,
        name: selectedUser.name || "",
        email: selectedUser.email,
        phone: "",
        department: "HR",
      });
    } else {
      setNewStaff({
        user_id: selectedUser.id,
        name: selectedUser.name || "",
        email: selectedUser.email,
        phone: "",
        department: "HR",
      });
    }
  };

  const getAvailableUsers = () => {
    const managerUserIds = hrManagers.map((m) => m.user_id);
    const staffUserIds = hrStaff.map((s) => s.user_id);
    const usedUserIds = [...managerUserIds, ...staffUserIds];

    return filteredUsers.filter((user) => !usedUserIds.includes(user.id));
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-fleet-purple">
            HR Settings
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Manage HR managers and staff members
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            onClick={() => setShowAddManager(true)}
            className="flex items-center gap-3 bg-gradient-to-r from-fleet-purple to-purple-600 hover:from-purple-600 hover:to-fleet-purple text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <UserPlus className="w-5 h-5" />
            Add Manager
          </Button>
          <Button
            onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Users className="w-5 h-5" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 sm:p-2">
        <div className="flex flex-wrap sm:flex-nowrap gap-1">
          {[
            {
              id: "managers",
              label: "HR Managers",
              icon: <Settings className="w-4 h-4" />,
            },
            {
              id: "staff",
              label: "HR Staff",
              icon: <Users className="w-4 h-4" />,
            },
            {
              id: "users",
              label: "Available Users",
              icon: <UserPlus className="w-4 h-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex-1 sm:flex-none ${
                activeTab === tab.id
                  ? "bg-fleet-purple text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* HR Managers Tab */}
      {activeTab === "managers" && (
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-fleet-purple to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-white">HR Managers</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                {hrManagers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell className="font-medium">
                      {manager.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {manager.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {manager.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {manager.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={manager.is_active ? "default" : "secondary"}
                      >
                        {manager.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingManager(manager);
                            setShowEditManager(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => deleteHRManager(manager.id)}
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

      {/* HR Staff Tab */}
      {activeTab === "staff" && (
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-white">HR Staff</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {staff.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {staff.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {staff.department}
                      </div>
                    </TableCell>
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
                          onClick={() => {
                            setEditingStaff(staff);
                            setShowEditStaff(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => deleteHRStaff(staff.id)}
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

      {/* Available Users Tab */}
      {activeTab === "users" && (
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
            <CardTitle className="text-white">Available Users</CardTitle>
            <div className="flex gap-4 mt-6">
              <div className="flex-1">
                <Label htmlFor="search-users">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search-users"
                    placeholder="Search by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role-filter">Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getAvailableUsers().map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "No Name"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUserSelect(user.id, "manager")}
                          className="flex items-center gap-1"
                        >
                          <Settings className="w-4 h-4" />
                          Make Manager
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserSelect(user.id, "staff")}
                          className="flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          Make Staff
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

      {/* Add Manager Dialog */}
      <Dialog open={showAddManager} onOpenChange={setShowAddManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add HR Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manager-user">Select User</Label>
              <Select
                value={newManager.user_id}
                onValueChange={(value) => handleUserSelect(value, "manager")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableUsers().map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="manager-name">Name</Label>
              <Input
                id="manager-name"
                value={newManager.name}
                onChange={(e) =>
                  setNewManager({ ...newManager, name: e.target.value })
                }
                placeholder="Enter manager name"
              />
            </div>
            <div>
              <Label htmlFor="manager-email">Email</Label>
              <Input
                id="manager-email"
                type="email"
                value={newManager.email}
                onChange={(e) =>
                  setNewManager({ ...newManager, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="manager-phone">Phone</Label>
              <Input
                id="manager-phone"
                value={newManager.phone}
                onChange={(e) =>
                  setNewManager({ ...newManager, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="manager-department">Department</Label>
              <Input
                id="manager-department"
                value={newManager.department}
                onChange={(e) =>
                  setNewManager({ ...newManager, department: e.target.value })
                }
                placeholder="Enter department"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddManager(false)}
              >
                Cancel
              </Button>
              <Button onClick={addHRManager} disabled={loading}>
                Add Manager
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add HR Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="staff-user">Select User</Label>
              <Select
                value={newStaff.user_id}
                onValueChange={(value) => handleUserSelect(value, "staff")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableUsers().map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* Edit Manager Dialog */}
      <Dialog open={showEditManager} onOpenChange={setShowEditManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit HR Manager</DialogTitle>
          </DialogHeader>
          {editingManager && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-manager-name">Name</Label>
                <Input
                  id="edit-manager-name"
                  value={editingManager.name}
                  onChange={(e) =>
                    setEditingManager({
                      ...editingManager,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-manager-email">Email</Label>
                <Input
                  id="edit-manager-email"
                  type="email"
                  value={editingManager.email}
                  onChange={(e) =>
                    setEditingManager({
                      ...editingManager,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-manager-phone">Phone</Label>
                <Input
                  id="edit-manager-phone"
                  value={editingManager.phone}
                  onChange={(e) =>
                    setEditingManager({
                      ...editingManager,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-manager-department">Department</Label>
                <Input
                  id="edit-manager-department"
                  value={editingManager.department}
                  onChange={(e) =>
                    setEditingManager({
                      ...editingManager,
                      department: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditManager(false)}
                >
                  Cancel
                </Button>
                <Button onClick={updateHRManager} disabled={loading}>
                  Update Manager
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditStaff} onOpenChange={setShowEditStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit HR Staff</DialogTitle>
          </DialogHeader>
          {editingStaff && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-staff-name">Name</Label>
                <Input
                  id="edit-staff-name"
                  value={editingStaff.name}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-staff-email">Email</Label>
                <Input
                  id="edit-staff-email"
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-staff-phone">Phone</Label>
                <Input
                  id="edit-staff-phone"
                  value={editingStaff.phone}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-staff-department">Department</Label>
                <Input
                  id="edit-staff-department"
                  value={editingStaff.department}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      department: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditStaff(false)}
                >
                  Cancel
                </Button>
                <Button onClick={updateHRStaff} disabled={loading}>
                  Update Staff
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRSettings;
