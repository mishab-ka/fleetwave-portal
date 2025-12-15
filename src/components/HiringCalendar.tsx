import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { Applicant } from "@/types/hr";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminLayout from "./AdminLayout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function HiringCalendar() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  useEffect(() => {
    async function fetchApplicants() {
      const { data, error } = await supabase.from("applicants").select("*");
      if (!error) setApplicants(data || []);
    }
    fetchApplicants();
  }, []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter applicants by search and status
  const filteredApplicants = applicants.filter((app) => {
    const matchesSearch = app.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus && app.joining_date;
  });

  // Group applicants by joining date (yyyy-mm-dd)
  const applicantsByDate: Record<string, Applicant[]> = {};
  filteredApplicants.forEach((app) => {
    if (app.joining_date) {
      const key = format(new Date(app.joining_date), "yyyy-MM-dd");
      if (!applicantsByDate[key]) applicantsByDate[key] = [];
      applicantsByDate[key].push(app);
    }
  });

  // Calendar grid logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let day = weekStart;
  while (day <= weekEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };
  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };
  const navigate = useNavigate();

  return (
    <AdminLayout title="Hiring Calendar">
      <div className="space-y-4">
        {/* Filters and Navigation */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/hr")}
            >
              Back
            </Button>
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full md:w-[200px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Full Month Calendar Grid */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Driver Joining Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (d) => (
                        <th
                          key={d}
                          className="p-2 text-center text-xs font-semibold text-gray-600 border-b"
                        >
                          {d}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, i) => (
                    <tr key={i}>
                      {week.map((date, j) => {
                        const key = format(date, "yyyy-MM-dd");
                        const isCurrentMonth = isSameMonth(date, currentMonth);
                        const isToday = isSameDay(date, new Date());
                        return (
                          <td
                            key={j}
                            className={`align-top p-1 md:p-2 border-b border-r last:border-r-0 min-w-[110px] h-[90px] md:h-[110px] ${
                              isCurrentMonth
                                ? "bg-white"
                                : "bg-gray-100 text-gray-400"
                            } ${
                              isToday
                                ? "bg-gray-200 border-2 border-fleet-purple"
                                : ""
                            }`}
                          >
                            <div className="flex flex-col gap-1 h-full">
                              <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                {format(date, "d")}
                              </div>
                              <div className="flex flex-col gap-1 mt-1">
                                {applicantsByDate[key]?.map((app) => (
                                  <Badge
                                    key={app.id}
                                    className={`cursor-pointer w-full text-xs whitespace-nowrap ${
                                      app.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : app.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : app.status === "rejected"
                                        ? "bg-red-100 text-red-800"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      setSelectedApplicant(app);
                                      setShowApplicantModal(true);
                                    }}
                                  >
                                    {app.full_name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Applicant Details Modal */}
        <Dialog open={showApplicantModal} onOpenChange={setShowApplicantModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Driver Details</DialogTitle>
            </DialogHeader>
            {selectedApplicant && (
              <div className="space-y-2">
                <div className="font-semibold text-lg">
                  Name: {selectedApplicant.full_name}
                </div>
                <div className="text-sm text-gray-600">
                  Phone: {selectedApplicant.phone}
                </div>
                <div className="text-sm text-gray-600">
                  Location: {selectedApplicant.location}
                </div>
                <div className="text-sm text-gray-600">
                  Vehicle Type: {selectedApplicant.vehicle_type}
                </div>
                <div className="text-sm">
                  Status:{" "}
                  <Badge
                    variant={
                      selectedApplicant.status === "approved"
                        ? "success"
                        : selectedApplicant.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {selectedApplicant.status}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
