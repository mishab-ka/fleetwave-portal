import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  HiringCycle,
  Applicant,
  HiringStats,
  ApplicantDetails,
} from "@/types/hr";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import ApplicantDetailsModal from "@/components/ApplicantDetailsModal";
import HiringCalendar from "@/components/HiringCalendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimePayload {
  new: {
    hiring_cycle_id: string;
  } | null;
  old: {
    hiring_cycle_id: string;
  } | null;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  [key: string]: any;
}

export default function AdminHR() {
  const [currentCycle, setCurrentCycle] = useState<HiringCycle | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stats, setStats] = useState<HiringStats>({
    total_vacancies: 0,
    filled_positions: 0,
    remaining_positions: 0,
    total_applications: 0,
  });
  const [newVacancies, setNewVacancies] = useState(5);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] =
    useState<ApplicantDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [previousCycles, setPreviousCycles] = useState<HiringCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>("current");
  const [cycleName, setCycleName] = useState("");

  useEffect(() => {
    fetchCurrentCycle();
    fetchPreviousCycles();

    // Set up real-time subscriptions
    const applicantsChannel = supabase.channel("applicants_changes");
    const cyclesChannel = supabase.channel("cycles_changes");

    applicantsChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applicants",
        },
        () => {
          // Only refresh if we're viewing the current cycle
          if (selectedCycle === "current" && currentCycle) {
            fetchApplicants(currentCycle.id);
          } else if (selectedCycle !== "current") {
            fetchApplicants(selectedCycle);
          }
        }
      )
      .subscribe();

    cyclesChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hiring_cycles",
        },
        () => {
          // Only refresh cycles list, don't change current view
          fetchPreviousCycles();
          if (selectedCycle === "current") {
            fetchCurrentCycle();
          }
        }
      )
      .subscribe();

    return () => {
      applicantsChannel.unsubscribe();
      cyclesChannel.unsubscribe();
    };
  }, [selectedCycle, currentCycle]);

  const fetchPreviousCycles = async () => {
    try {
      const { data, error } = await supabase
        .from("hiring_cycles")
        .select("*")
        .eq("archived", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPreviousCycles(data || []);
    } catch (error) {
      console.error("Error fetching previous cycles:", error);
      toast.error("Failed to load previous hiring cycles");
    }
  };

  const fetchCurrentCycle = async () => {
    try {
      const { data: cycle, error: cycleError } = await supabase
        .from("hiring_cycles")
        .select("*")
        .eq("is_active", true)
        .single();

      if (cycleError && cycleError.code !== "PGRST116") {
        throw cycleError;
      }

      if (cycle) {
        setCurrentCycle(cycle);
        await fetchApplicants(cycle.id);
      }
    } catch (error) {
      console.error("Error fetching hiring cycle:", error);
      toast.error("Failed to load hiring cycle");
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
      updateStats(data || [], currentCycle?.total_vacancies || 0);
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

  const startNewCycle = async () => {
    try {
      // End current cycle if exists
      if (currentCycle) {
        await supabase.rpc("archive_hiring_cycle", {
          cycle_id: currentCycle.id,
        });
      }

      // Create new cycle
      const { data: newCycle, error } = await supabase
        .from("hiring_cycles")
        .insert([
          {
            total_vacancies: newVacancies,
            is_active: true,
            cycle_name:
              cycleName || `Hiring Cycle ${new Date().toLocaleDateString()}`,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setCurrentCycle(newCycle);
      setApplicants([]);
      updateStats([], newVacancies);
      setCycleName("");
      toast.success("New hiring cycle started");
    } catch (error) {
      console.error("Error starting new cycle:", error);
      toast.error("Failed to start new hiring cycle");
    }
  };

  const handleViewApplicant = async (applicant: Applicant) => {
    try {
      const { data: cycle, error } = await supabase
        .from("hiring_cycles")
        .select("*")
        .eq("id", applicant.hiring_cycle_id)
        .single();

      if (error) throw error;

      setSelectedApplicant({ applicant, hiring_cycle: cycle });
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Error loading applicant details:", error);
      toast.error("Failed to load applicant details");
    }
  };

  const handleStatusChange = async (status: "approved" | "rejected") => {
    if (!selectedApplicant) return;

    try {
      const { error } = await supabase
        .from("applicants")
        .update({ status })
        .eq("id", selectedApplicant.applicant.id);

      if (error) throw error;

      await fetchApplicants(currentCycle!.id);
      setShowDetailsModal(false);
      toast.success(`Application ${status}`);
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
        .eq("id", selectedApplicant.applicant.id);

      if (error) throw error;

      await fetchApplicants(currentCycle!.id);
      toast.success("Joining date updated");
    } catch (error) {
      console.error("Error updating joining date:", error);
      toast.error("Failed to update joining date");
    }
  };

  const handleCycleChange = async (cycleId: string) => {
    setSelectedCycle(cycleId);
    setLoading(true);

    try {
      if (cycleId === "current") {
        const { data: cycle, error } = await supabase
          .from("hiring_cycles")
          .select("*")
          .eq("is_active", true)
          .single();

        if (error) throw error;
        setCurrentCycle(cycle);
        await fetchApplicants(cycle.id);
      } else {
        const { data: cycle, error } = await supabase
          .from("hiring_cycles")
          .select("*")
          .eq("id", cycleId)
          .single();

        if (error) throw error;
        setCurrentCycle(cycle);
        await fetchApplicants(cycle.id);
      }
    } catch (error) {
      console.error("Error fetching cycle:", error);
      toast.error("Failed to load hiring cycle");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="HR Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="HR Management">
      <div className="space-y-6">
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

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Number of Vacancies
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newVacancies}
                  onChange={(e) => setNewVacancies(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cycle Name
                </label>
                <Input
                  type="text"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  placeholder="Enter cycle name"
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={startNewCycle} className="bg-fleet-purple">
                Start New Cycle
              </Button>
              <Button
                onClick={() => setShowCalendar(!showCalendar)}
                variant="outline"
              >
                {showCalendar ? "Hide Calendar" : "Show Calendar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Previous Cycles Selector */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Select value={selectedCycle} onValueChange={handleCycleChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Cycle</SelectItem>
                {previousCycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.cycle_name} (
                    {format(new Date(cycle.created_at), "PPP")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar View */}
        {showCalendar && (
          <div className="bg-white p-6 rounded-lg shadow">
            <HiringCalendar applicants={applicants} />
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Applications</h2>
            <div className="overflow-x-auto">
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
                  {applicants.map((applicant) => (
                    <TableRow key={applicant.id}>
                      <TableCell>{applicant.full_name}</TableCell>
                      <TableCell>{applicant.email}</TableCell>
                      <TableCell>{applicant.phone}</TableCell>
                      <TableCell>{applicant.location}</TableCell>
                      <TableCell>{applicant.experience_years} years</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            applicant.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : applicant.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {applicant.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {applicant.joining_date
                          ? format(new Date(applicant.joining_date), "PPP")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleViewApplicant(applicant)}
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <ApplicantDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        applicantDetails={selectedApplicant}
        onStatusChange={handleStatusChange}
        onJoiningDateChange={handleJoiningDateChange}
      />
    </AdminLayout>
  );
}
