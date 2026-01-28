import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
} from "date-fns";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LeaveApplication {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  driver: {
    name: string;
    email_id: string;
    phone_number: string;
  };
  is_booked?: boolean;
  booking_details?: {
    name: string;
    phone_number: string;
    email: string;
  };
}

interface PartTimeBooking {
  id: string;
  driver_id: string;
  leave_application_id: string;
  name: string;
  phone_number: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminLeaveManagement() {
  const [leaveApplications, setLeaveApplications] = useState<
    LeaveApplication[]
  >([]);
  const [partTimeBookings, setPartTimeBookings] = useState<PartTimeBooking[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(
    null
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<PartTimeBooking | null>(null);
  const [isViewBookingModalOpen, setIsViewBookingModalOpen] = useState(false);
  const [isEditBookingModalOpen, setIsEditBookingModalOpen] = useState(false);
  const [isDeleteBookingModalOpen, setIsDeleteBookingModalOpen] =
    useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateLeaves, setDateLeaves] = useState<LeaveApplication[]>([]);

  useEffect(() => {
    fetchLeaveApplications();
    fetchPartTimeBookings();
  }, []);

  const fetchLeaveApplications = async () => {
    try {
      // First fetch all leave applications
      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_applications")
        .select(
          `
          *,
          driver:driver_id (
            name,
            email_id,
            phone_number
          )
        `
        )
        .order("created_at", { ascending: false });

      if (leaveError) throw leaveError;

      // Then fetch all part-time bookings
      const { data: bookingData, error: bookingError } = await supabase
        .from("part_time_bookings")
        .select("*")
        .eq("status", "approved");

      if (bookingError) throw bookingError;

      // Mark leave applications as booked if they have an approved booking
      const leaveApplicationsWithBookingStatus =
        leaveData?.map((leave) => {
          const booking = bookingData?.find(
            (b) => b.leave_application_id === leave.id
          );
          return {
            ...leave,
            is_booked: !!booking,
            booking_details: booking
              ? {
                  name: booking.name,
                  phone_number: booking.phone_number,
                  email: booking.email,
                }
              : undefined,
          };
        }) || [];

      setLeaveApplications(leaveApplicationsWithBookingStatus);
    } catch (error) {
      console.error("Error fetching leave applications:", error);
      toast.error("Failed to load leave applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchPartTimeBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("part_time_bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartTimeBookings(data || []);
    } catch (error) {
      console.error("Error fetching part-time bookings:", error);
      toast.error("Failed to load part-time bookings");
    }
  };

  const handleLeaveStatusChange = async (
    id: string,
    status: "approved" | "rejected" | "pending"
  ) => {
    try {
      const { error } = await supabase
        .from("leave_applications")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Leave application ${status}`);
      fetchLeaveApplications();
    } catch (error) {
      console.error("Error updating leave application:", error);
      toast.error("Failed to update leave application");
    }
  };

  const handleBookingStatusChange = async (
    id: string,
    status: "approved" | "rejected" | "pending"
  ) => {
    try {
      const { error } = await supabase
        .from("part_time_bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Booking ${status}`);
      fetchPartTimeBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Failed to update booking");
    }
  };

  const handleViewLeave = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setIsViewModalOpen(true);
  };

  const handleEditLeave = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setIsEditModalOpen(true);
  };

  const handleDeleteLeave = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteLeave = async () => {
    if (!selectedLeave) return;

    try {
      const { error } = await supabase
        .from("leave_applications")
        .delete()
        .eq("id", selectedLeave.id);

      if (error) throw error;

      toast.success("Leave application deleted successfully");
      setIsDeleteModalOpen(false);
      setSelectedLeave(null);
      fetchLeaveApplications();
    } catch (error) {
      console.error("Error deleting leave application:", error);
      toast.error("Failed to delete leave application");
    }
  };

  const handleViewBooking = (booking: PartTimeBooking) => {
    setSelectedBooking(booking);
    setIsViewBookingModalOpen(true);
  };

  const handleEditBooking = (booking: PartTimeBooking) => {
    setSelectedBooking(booking);
    setIsEditBookingModalOpen(true);
  };

  const handleDeleteBooking = (booking: PartTimeBooking) => {
    setSelectedBooking(booking);
    setIsDeleteBookingModalOpen(true);
  };

  const confirmDeleteBooking = async () => {
    if (!selectedBooking) return;

    try {
      const { error } = await supabase
        .from("part_time_bookings")
        .delete()
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast.success("Part-time booking deleted successfully");
      setIsDeleteBookingModalOpen(false);
      setSelectedBooking(null);
      fetchPartTimeBookings();
    } catch (error) {
      console.error("Error deleting part-time booking:", error);
      toast.error("Failed to delete part-time booking");
    }
  };

  const filteredLeaveApplications = leaveApplications.filter(
    (app) =>
      app.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.driver.email_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.driver.phone_number.includes(searchTerm)
  );

  const filteredPartTimeBookings = partTimeBookings.filter(
    (booking) =>
      booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone_number.includes(searchTerm)
  );

  // Calendar functions
  const getLeavesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return leaveApplications.filter((leave) => {
      if (leave.status !== "approved") return false;
      const startDate = parseISO(leave.start_date);
      const endDate = parseISO(leave.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const leaves = getLeavesForDate(date);
    setDateLeaves(leaves);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get first day of week for the month
    const firstDayOfWeek = monthStart.getDay();
    const emptyDays = Array(firstDayOfWeek).fill(null);

    // Calculate total vacancies for the month
    const allLeaves = leaveApplications.filter(
      (leave) => leave.status === "approved"
    );
    const totalVacancies = allLeaves.length;

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Approved Leaves</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalVacancies}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Vacancies</p>
                <p className="text-3xl font-bold text-orange-600">
                  {totalVacancies}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(calendarDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-semibold text-gray-700"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {emptyDays.map((_, index) => (
              <div
                key={`empty-${index}`}
                className="min-h-[80px] border border-gray-200 bg-gray-50"
              />
            ))}
            {days.map((day) => {
              const dayLeaves = getLeavesForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, calendarDate);
              const vacancyCount = dayLeaves.length;
              const availableCount = dayLeaves.filter(
                (l) => !l.is_booked
              ).length;

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] border border-gray-200 p-2 cursor-pointer transition-all ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  } ${isToday ? "ring-2 ring-blue-500 bg-blue-50" : ""} ${
                    vacancyCount > 0
                      ? "bg-orange-50 hover:bg-orange-100 border-orange-300"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-semibold ${
                          isCurrentMonth ? "text-gray-900" : "text-gray-400"
                        } ${isToday ? "text-blue-700" : ""}`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    {vacancyCount > 0 && (
                      <div className="mt-auto">
                        <div className="bg-orange-500 text-white text-xs font-bold rounded px-2 py-1 text-center">
                          {availableCount} Vacancy
                          {availableCount !== 1 ? "ies" : ""}
                        </div>
                        {dayLeaves.length > availableCount && (
                          <div className="text-xs text-gray-600 mt-1 text-center">
                            {dayLeaves.length - availableCount} booked
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dateLeaves.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    No leaves on this date
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    No vacancies available
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        Total Vacancies:
                      </span>
                      <Badge className="bg-orange-500 text-white text-lg px-3 py-1">
                        {dateLeaves.filter((l) => !l.is_booked).length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Drivers on Leave:
                    </h4>
                    {dateLeaves.map((leave) => (
                      <div
                        key={leave.id}
                        className={`p-3 border rounded-lg ${
                          leave.is_booked
                            ? "bg-blue-50 border-blue-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">
                              {leave.driver.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(leave.start_date), "MMM d")} -{" "}
                              {format(new Date(leave.end_date), "MMM d, yyyy")}
                            </div>
                          </div>
                          <Badge
                            className={
                              leave.is_booked
                                ? "bg-blue-500 text-white"
                                : "bg-green-500 text-white"
                            }
                          >
                            {leave.is_booked ? "Booked" : "Available"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="Leave & Part-time Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Leave & Part-time Management">
      <div className="space-y-6">
        <Tabs defaultValue="leave" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leave">Leave Applications</TabsTrigger>
            <TabsTrigger value="parttime">Part-time Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="leave">
            <Card className="">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-xl">Leave Applications</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by driver name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[800px] overflow-x-scroll ">
                {filteredLeaveApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchTerm
                        ? "No leave applications found matching your search"
                        : "No leave applications found"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">
                            Driver
                          </TableHead>
                          <TableHead className="min-w-[180px]">
                            Contact
                          </TableHead>
                          <TableHead className="min-w-[200px]">
                            Leave Period
                          </TableHead>
                          <TableHead className="min-w-[200px]">
                            Reason
                          </TableHead>
                          <TableHead className="min-w-[100px]">
                            Status
                          </TableHead>
                          <TableHead className="min-w-[150px]">
                            Booking Status
                          </TableHead>
                          <TableHead className="min-w-[200px]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeaveApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="font-medium">
                                {app.driver.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <span>{app.driver.email_id}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span>{app.driver.phone_number}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {format(
                                    new Date(app.start_date),
                                    "MMM d, yyyy"
                                  )}
                                </div>
                                <div className="text-gray-500">to</div>
                                <div className="font-medium">
                                  {format(
                                    new Date(app.end_date),
                                    "MMM d, yyyy"
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div
                                className="text-sm max-w-[200px] truncate"
                                title={app.reason}
                              >
                                {app.reason}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  app.status === "approved"
                                    ? "success"
                                    : app.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="capitalize"
                              >
                                {app.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {app.is_booked ? (
                                <div className="space-y-1">
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-700"
                                  >
                                    Booked
                                  </Badge>
                                  {app.booking_details && (
                                    <div className="text-xs text-gray-500 space-y-0.5">
                                      <p className="font-medium">
                                        {app.booking_details.name}
                                      </p>
                                      <p>{app.booking_details.phone_number}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700"
                                >
                                  Available
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewLeave(app)}
                                  className="h-8 w-8 p-0"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditLeave(app)}
                                  className="h-8 w-8 p-0"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteLeave(app)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {app.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleLeaveStatusChange(
                                          app.id,
                                          "approved"
                                        )
                                      }
                                      variant="outline"
                                      className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                                      disabled={app.is_booked}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleLeaveStatusChange(
                                          app.id,
                                          "rejected"
                                        )
                                      }
                                      variant="outline"
                                      className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                                      disabled={app.is_booked}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
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
          </TabsContent>

          <TabsContent value="parttime">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-xl">Part-time Bookings</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPartTimeBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchTerm
                        ? "No bookings found matching your search"
                        : "No part-time bookings found"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Name</TableHead>
                          <TableHead className="min-w-[200px]">
                            Contact
                          </TableHead>
                          <TableHead className="min-w-[100px]">
                            Status
                          </TableHead>
                          <TableHead className="min-w-[200px]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPartTimeBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <div className="font-medium">{booking.name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <span>{booking.email}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span>{booking.phone_number}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  booking.status === "approved"
                                    ? "success"
                                    : booking.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="capitalize"
                              >
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewBooking(booking)}
                                  className="h-8 w-8 p-0"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditBooking(booking)}
                                  className="h-8 w-8 p-0"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteBooking(booking)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {booking.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleBookingStatusChange(
                                          booking.id,
                                          "approved"
                                        )
                                      }
                                      variant="outline"
                                      className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleBookingStatusChange(
                                          booking.id,
                                          "rejected"
                                        )
                                      }
                                      variant="outline"
                                      className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
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
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Leave Calendar & Vacancies
                </CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                  View approved leaves and available vacancies by date. Click on
                  a date to see details.
                </p>
              </CardHeader>
              <CardContent>{renderCalendar()}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Leave Application Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Application Details</DialogTitle>
            <DialogDescription>
              View details of the leave application
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Driver</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.driver.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Contact</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.driver.email_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.driver.phone_number}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Leave Period</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedLeave.start_date), "PPP")} -{" "}
                  {format(new Date(selectedLeave.end_date), "PPP")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.reason}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge
                  variant={
                    selectedLeave.status === "approved"
                      ? "success"
                      : selectedLeave.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selectedLeave.status}
                </Badge>
              </div>
              {selectedLeave.is_booked && selectedLeave.booking_details && (
                <div>
                  <Label className="text-sm font-medium">Booking Details</Label>
                  <div className="text-sm text-muted-foreground">
                    <p>Booked by: {selectedLeave.booking_details.name}</p>
                    <p>Contact: {selectedLeave.booking_details.phone_number}</p>
                    <p>Email: {selectedLeave.booking_details.email}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Application Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Application</DialogTitle>
            <DialogDescription>
              Update the leave application details
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Driver</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.driver.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Start Date</Label>
                <Input
                  type="date"
                  defaultValue={selectedLeave.start_date}
                  disabled
                />
              </div>
              <div>
                <Label className="text-sm font-medium">End Date</Label>
                <Input
                  type="date"
                  defaultValue={selectedLeave.end_date}
                  disabled
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <Textarea
                  defaultValue={selectedLeave.reason}
                  placeholder="Enter reason for leave"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={
                      selectedLeave.status === "approved"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleLeaveStatusChange(selectedLeave.id, "approved")
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedLeave.status === "rejected"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleLeaveStatusChange(selectedLeave.id, "rejected")
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedLeave.status === "pending" ? "default" : "outline"
                    }
                    onClick={() =>
                      handleLeaveStatusChange(selectedLeave.id, "pending")
                    }
                  >
                    Pending
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsEditModalOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Leave Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave application? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Driver</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.driver.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Leave Period</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedLeave.start_date), "PPP")} -{" "}
                  {format(new Date(selectedLeave.end_date), "PPP")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.reason}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLeave}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Part-time Booking Modal */}
      <Dialog
        open={isViewBookingModalOpen}
        onOpenChange={setIsViewBookingModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Part-time Booking Details</DialogTitle>
            <DialogDescription>
              View details of the part-time booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Contact</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.phone_number}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge
                  variant={
                    selectedBooking.status === "approved"
                      ? "success"
                      : selectedBooking.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selectedBooking.status}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Created At</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedBooking.created_at), "PPP")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewBookingModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Part-time Booking Modal */}
      <Dialog
        open={isEditBookingModalOpen}
        onOpenChange={setIsEditBookingModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Part-time Booking</DialogTitle>
            <DialogDescription>
              Update the part-time booking details
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <Input
                  defaultValue={selectedBooking.name}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  defaultValue={selectedBooking.email}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Phone Number</Label>
                <Input
                  defaultValue={selectedBooking.phone_number}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={
                      selectedBooking.status === "approved"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleBookingStatusChange(selectedBooking.id, "approved")
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedBooking.status === "rejected"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleBookingStatusChange(selectedBooking.id, "rejected")
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedBooking.status === "pending"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleBookingStatusChange(selectedBooking.id, "pending")
                    }
                  >
                    Pending
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditBookingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsEditBookingModalOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Part-time Booking Confirmation Modal */}
      <Dialog
        open={isDeleteBookingModalOpen}
        onOpenChange={setIsDeleteBookingModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Part-time Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this part-time booking? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Contact</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.phone_number}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge
                  variant={
                    selectedBooking.status === "approved"
                      ? "success"
                      : selectedBooking.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selectedBooking.status}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteBookingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteBooking}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
