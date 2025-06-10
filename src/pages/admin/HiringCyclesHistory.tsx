import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HiringCycle, Applicant } from "@/types/hr";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function HiringCyclesHistory() {
  const [cycles, setCycles] = useState<HiringCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<HiringCycle | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total_vacancies: 0,
    filled_positions: 0,
    remaining_positions: 0,
    total_applications: 0,
  });
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<HiringCycle | null>(null);
  const [tempStatus, setTempStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [tempDescription, setTempDescription] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      fetchApplicants(selectedCycle.id);
    }
  }, [selectedCycle]);

  const fetchCycles = async () => {
    try {
      const { data, error } = await supabase
        .from("hiring_cycles")
        .select("*")
        .eq("archived", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCycles(data || []);
      if (data && data.length > 0) {
        setSelectedCycle(data[0]);
      }
    } catch (error) {
      console.error("Error fetching cycles:", error);
      toast.error("Failed to load hiring cycles");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (cycleId: string) => {
    try {
      const { data, error } = await supabase
        .from("applicants")
        .select("*")
        .eq("hiring_cycle_id", cycleId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setApplicants(data || []);
      updateStats(data || [], selectedCycle?.total_vacancies || 0);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast.error("Failed to load applicants");
    }
  };

  const updateStats = (applicants: Applicant[], totalVacancies: number) => {
    const approvedCount = applicants.filter(
      (app) => app.status === "approved"
    ).length;
    const totalApplications = applicants.length;

    setStats({
      total_vacancies: totalVacancies,
      filled_positions: approvedCount,
      remaining_positions: totalVacancies - approvedCount,
      total_applications: totalApplications,
    });
  };

  const filteredApplicants = applicants.filter(
    (applicant) =>
      applicant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.phone.includes(searchTerm) ||
      applicant.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = async (
    status: "pending" | "approved" | "rejected"
  ) => {
    if (!selectedApplicant) return;

    try {
      const { error } = await supabase
        .from("applicants")
        .update({ status })
        .eq("id", selectedApplicant.id);

      if (error) throw error;

      // Update local state
      setApplicants(
        applicants.map((app) =>
          app.id === selectedApplicant.id ? { ...app, status } : app
        )
      );

      // Update stats
      updateStats(
        applicants.map((app) =>
          app.id === selectedApplicant.id ? { ...app, status } : app
        ),
        selectedCycle?.total_vacancies || 0
      );

      setIsModalOpen(false);
      toast.success(`Application status updated to ${status}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application status");
    }
  };

  const handleJoiningDateChange = async (date: string) => {
    if (!selectedApplicant) return;

    try {
      const { error } = await supabase
        .from("applicants")
        .update({ joining_date: date })
        .eq("id", selectedApplicant.id);

      if (error) throw error;

      // Update local state
      setApplicants(
        applicants.map((app) =>
          app.id === selectedApplicant.id ? { ...app, joining_date: date } : app
        )
      );

      setIsModalOpen(false);
      toast.success("Joining date updated");
    } catch (error) {
      console.error("Error updating joining date:", error);
      toast.error("Failed to update joining date");
    }
  };

  const handleEditClick = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setTempStatus(applicant.status);
    setTempDescription(applicant.additional_info || "");
    setIsModalOpen(true);
  };

  const handleDeleteCycle = async () => {
    if (!cycleToDelete) return;

    try {
      // First delete all applicants associated with this cycle
      const { error: applicantsError } = await supabase
        .from("applicants")
        .delete()
        .eq("hiring_cycle_id", cycleToDelete.id);

      if (applicantsError) throw applicantsError;

      // Then delete the cycle itself
      const { error: cycleError } = await supabase
        .from("hiring_cycles")
        .delete()
        .eq("id", cycleToDelete.id);

      if (cycleError) throw cycleError;

      // Update local state
      setCycles(cycles.filter((cycle) => cycle.id !== cycleToDelete.id));
      if (selectedCycle?.id === cycleToDelete.id) {
        setSelectedCycle(cycles[0] || null);
      }

      toast.success("Hiring cycle deleted successfully");
      setIsDeleteModalOpen(false);
      setCycleToDelete(null);
    } catch (error) {
      console.error("Error deleting cycle:", error);
      toast.error("Failed to delete hiring cycle");
    }
  };

  const confirmDelete = (cycle: HiringCycle) => {
    setCycleToDelete(cycle);
    setIsDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout title="Hiring Cycles History">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Hiring Cycles History">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button
            onClick={() => navigate("/admin/hr")}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Current Cycle
          </Button>
        </div>

        {/* Cycle Selector */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between gap-4">
            <Select
              value={selectedCycle?.id}
              onValueChange={(value) => {
                const cycle = cycles.find((c) => c.id === value);
                setSelectedCycle(cycle || null);
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.cycle_name} (
                    {format(new Date(cycle.created_at), "PPP")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCycle && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => confirmDelete(selectedCycle)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Cycle
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vacancies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_vacancies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Filled Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.filled_positions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Remaining Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.remaining_positions}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_applications}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Applications</h2>
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplicants.map((applicant) => (
                    <TableRow key={applicant.id}>
                      <TableCell>{applicant.full_name}</TableCell>
                      <TableCell>{applicant.email}</TableCell>
                      <TableCell>{applicant.phone}</TableCell>
                      <TableCell>{applicant.location}</TableCell>
                      <TableCell>{applicant.experience_years} years</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            applicant.status === "approved"
                              ? "success"
                              : applicant.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {applicant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {applicant.joining_date
                          ? format(new Date(applicant.joining_date), "PPP")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleEditClick(applicant)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Hiring Cycle</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this hiring cycle? This action
                cannot be undone. All associated applications will also be
                deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-500">
                Cycle Name: {cycleToDelete?.cycle_name}
              </p>
              <p className="text-sm text-gray-500">
                Created:{" "}
                {cycleToDelete?.created_at &&
                  format(new Date(cycleToDelete.created_at), "PPP")}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCycleToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteCycle}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Application</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Driver Information</Label>
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedApplicant?.full_name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {selectedApplicant?.email}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {selectedApplicant?.phone}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Application Status</Label>
                <Select
                  value={tempStatus}
                  onValueChange={(value: "pending" | "approved" | "rejected") =>
                    setTempStatus(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tempStatus === "approved" && (
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input
                    type="date"
                    value={selectedApplicant?.joining_date || ""}
                    onChange={(e) => handleJoiningDateChange(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  placeholder="Add notes about the application..."
                  className="h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleStatusChange(tempStatus)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
