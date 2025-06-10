import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
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
import { Search } from "lucide-react";

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
    status: "approved" | "rejected"
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
    status: "approved" | "rejected"
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leave">Leave Applications</TabsTrigger>
            <TabsTrigger value="parttime">Part-time Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Leave Applications</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Leave Period</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Booking Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaveApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>{app.driver.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{app.driver.email_id}</p>
                              <p>{app.driver.phone_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(app.start_date), "PPP")} -{" "}
                            {format(new Date(app.end_date), "PPP")}
                          </TableCell>
                          <TableCell>{app.reason}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                app.status === "approved"
                                  ? "success"
                                  : app.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
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
                                  <div className="text-xs text-gray-500 mt-1">
                                    <p>By: {app.booking_details.name}</p>
                                    <p>
                                      Contact:{" "}
                                      {app.booking_details.phone_number}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline">Available</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {app.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleLeaveStatusChange(app.id, "approved")
                                  }
                                  variant="outline"
                                  className="bg-green-50 text-green-700 hover:bg-green-100"
                                  disabled={app.is_booked}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleLeaveStatusChange(app.id, "rejected")
                                  }
                                  variant="outline"
                                  className="bg-red-50 text-red-700 hover:bg-red-100"
                                  disabled={app.is_booked}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parttime">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Part-time Bookings</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bookings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartTimeBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{booking.email}</p>
                              <p>{booking.phone_number}</p>
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
                            >
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {booking.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleBookingStatusChange(
                                      booking.id,
                                      "approved"
                                    )
                                  }
                                  variant="outline"
                                  className="bg-green-50 text-green-700 hover:bg-green-100"
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
                                  className="bg-red-50 text-red-700 hover:bg-red-100"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
