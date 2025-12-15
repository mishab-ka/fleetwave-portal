import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserCheck,
  Users,
  ToggleLeft,
  ToggleRight,
  Phone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  phone_number: string | null;
  name?: string | null;
  role: string;
}

interface StaffRecord {
  user: User;
  assignmentId: string | null;
  assignedAt: string | null;
  isActive: boolean;
}

const HRStaffManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffRecord[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staffRecords, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchStaffRecords();
    } catch (error) {
      console.error("Error fetching staff data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffRecords = async () => {
    // Check if user is HR Manager or Admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user?.id)
      .single();

    if (
      !userData ||
      (userData.role !== "hr_manager" && userData.role !== "admin")
    ) {
      setStaffRecords([]);
      return;
    }

    const { data: allStaff, error: allStaffError } = await supabase
      .from("users")
      .select("id, phone_number, name, role")
      .eq("role", "hr_staff")
      .order("name", { ascending: true });

    if (allStaffError) throw allStaffError;

    const { data: assignments, error: assignmentsError } = await supabase
      .from("hr_staff_assignments")
      .select("*")
      .eq("hr_manager_user_id", user?.id)
      .order("assigned_at", { ascending: false });

    if (assignmentsError) throw assignmentsError;

    const records =
      allStaff?.map((staff) => {
        const assignment = assignments?.find(
          (item) => item.hr_staff_user_id === staff.id
        );

        return {
          user: staff,
          assignmentId: assignment?.id ?? null,
          assignedAt: assignment?.assigned_at ?? null,
          isActive: assignment?.is_active ?? false,
        };
      }) || [];

    setStaffRecords(records);
  };

  const filterStaff = () => {
    let filtered = [...staffRecords];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          (record.user.phone_number || "")
            .includes(searchTerm.toLowerCase()) ||
          record.user.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStaff(filtered);
  };

  const handleToggleAssignment = async (record: StaffRecord) => {
    setLoading(true);
    try {
      if (record.assignmentId) {
        const { error } = await supabase
          .from("hr_staff_assignments")
          .update({ is_active: !record.isActive })
          .eq("id", record.assignmentId);

        if (error) throw error;
      } else {
        try {
          const { error } = await supabase.from("hr_staff_assignments").insert([
            {
              hr_manager_user_id: user?.id,
              hr_staff_user_id: record.user.id,
              is_active: true,
            },
          ]);
          if (error) throw error;
        } catch (error: any) {
          if (error?.code === "23505") {
            await supabase
              .from("hr_staff_assignments")
              .update({ is_active: true })
              .eq("hr_manager_user_id", user?.id)
              .eq("hr_staff_user_id", record.user.id);
          } else {
            throw error;
          }
        }
      }

      await fetchData();
    } catch (error) {
      console.error("Error updating assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = staffRecords.filter((record) => record.isActive).length;
  const inactiveCount = staffRecords.length - activeCount;

  if (loading && staffRecords.length === 0) {
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
            HR Staff Management
          </h1>
          <p className="text-gray-600">
            Manage activation status for all HR staff members
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Staff
                </p>
                <p className="text-2xl font-bold text-fleet-purple">
                  {staffRecords.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-fleet-purple" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Staff
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {activeCount}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Inactive Staff
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {inactiveCount}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Staff</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
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

      {/* Staff Assignments Cards */}
      <Card>
        <CardHeader>
          <CardTitle>HR Staff ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff members assigned yet</p>
              <p className="text-sm text-gray-400">
                All HR staff will appear here once added to the system
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
              {filteredStaff.map((record) => (
                <Card
                  key={record.user.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-2 sm:p-4">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-lg text-gray-900 truncate">
                          {record.user.name || "No name"}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-xs sm:text-sm text-gray-600 truncate">
                            {record.user.phone_number || "No phone"}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={record.isActive ? "destructive" : "default"}
                        className="flex items-center gap-1 px-2 py-1 h-auto"
                        onClick={() => handleToggleAssignment(record)}
                        disabled={loading}
                      >
                        {record.isActive ? (
                          <>
                            <ToggleLeft className="w-4 h-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Badge
                          variant="secondary"
                          className="text-xs px-1 py-0"
                        >
                          {record.user.role}
                        </Badge>
                        <Badge
                          variant={record.isActive ? "default" : "secondary"}
                          className={`text-xs px-1 py-0 ${
                            record.isActive ? "bg-green-100 text-green-800" : ""
                          }`}
                        >
                          {record.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {record.assignedAt ? (
                        <div className="text-xs text-gray-500 truncate">
                          Assigned:{" "}
                          {new Date(record.assignedAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          Not assigned yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRStaffManagement;
