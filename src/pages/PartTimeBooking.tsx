import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isWithinInterval, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    shift: string;
  };
}

interface PartTimeBooking {
  id: string;
  driver_id: string;
  leave_application_id: string;
  date: string;
  name: string;
  phone_number: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface AvailableSlot {
  leave_application_id: string;
  date: string;
  shift: string;
  driver_name: string;
  is_booked: boolean;
  booking_details?: {
    name: string;
    phone_number: string;
    email: string;
  };
}

export default function PartTimeBooking() {
  const { user } = useAuth();
  const [leaveApplications, setLeaveApplications] = useState<
    LeaveApplication[]
  >([]);
  const [bookings, setBookings] = useState<PartTimeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    email: "",
  });

  useEffect(() => {
    fetchLeaveApplications();
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchLeaveApplications = async () => {
    try {
      // Fetch approved leave applications
      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_applications")
        .select(
          `
          *,
          driver:driver_id (
            name,
            shift
          )
        `
        )
        .eq("status", "approved");

      if (leaveError) throw leaveError;

      // Fetch all approved part-time bookings
      const { data: bookingData, error: bookingError } = await supabase
        .from("part_time_bookings")
        .select("*")
        .eq("status", "approved");

      if (bookingError) throw bookingError;

      setLeaveApplications(leaveData || []);
      processAvailableSlots(leaveData || [], bookingData || []);
    } catch (error) {
      console.error("Error fetching leave applications:", error);
      toast.error("Failed to load available dates");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("part_time_bookings")
        .select("*")
        .eq("driver_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load your bookings");
    }
  };

  const processAvailableSlots = (
    applications: LeaveApplication[],
    existingBookings: PartTimeBooking[]
  ) => {
    const slots: AvailableSlot[] = [];
    applications.forEach((app) => {
      if (!app.start_date || !app.end_date) {
        console.warn("Leave application missing dates:", app);
        return;
      }

      const startDate = parseISO(app.start_date);
      const endDate = parseISO(app.end_date);
      let currentDate = startDate;

      while (currentDate <= endDate) {
        const booking = existingBookings.find((b) => {
          if (!b.date) return false;
          return (
            b.leave_application_id === app.id &&
            format(parseISO(b.date), "yyyy-MM-dd") ===
              format(currentDate, "yyyy-MM-dd")
          );
        });

        slots.push({
          leave_application_id: app.id,
          date: format(currentDate, "yyyy-MM-dd"),
          shift: app.driver.shift,
          driver_name: app.driver.name,
          is_booked: !!booking,
          booking_details: booking
            ? {
                name: booking.name,
                phone_number: booking.phone_number,
                email: booking.email,
              }
            : undefined,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    setAvailableSlots(slots);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (slot.is_booked) {
      toast.error("This slot is already booked");
      return;
    }
    setSelectedSlot(slot);
    setIsBookingModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !user) {
      toast.error("Please select a slot");
      return;
    }

    try {
      const { error } = await supabase.from("part_time_bookings").insert([
        {
          driver_id: user.id,
          leave_application_id: selectedSlot.leave_application_id,
          date: selectedSlot.date,
          ...formData,
        },
      ]);

      if (error) throw error;

      toast.success("Booking submitted successfully");
      setFormData({
        name: "",
        phone_number: "",
        email: "",
      });
      setIsBookingModalOpen(false);
      setSelectedSlot(null);
      fetchBookings();
      fetchLeaveApplications(); // Refresh available slots
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast.error("Failed to submit booking");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Slots</TabsTrigger>
          <TabsTrigger value="bookings">Your Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <Card>
            <CardHeader>
              <CardTitle>Available Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableSlots.map((slot) => (
                  <div
                    key={`${slot.leave_application_id}-${slot.date}`}
                    className={`p-4 border rounded-lg space-y-2 ${
                      slot.is_booked ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {format(new Date(slot.date), "PPP")}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Shift: {slot.shift}
                        </p>
                        <p className="text-sm text-gray-500">
                          Regular Driver: {slot.driver_name}
                        </p>
                        {slot.is_booked && slot.booking_details && (
                          <div className="mt-2 text-sm text-gray-500">
                            <p>Booked by: {slot.booking_details.name}</p>
                            <p>Contact: {slot.booking_details.phone_number}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleSlotSelect(slot)}
                        disabled={slot.is_booked}
                        variant={slot.is_booked ? "secondary" : "default"}
                        className={slot.is_booked ? "opacity-50" : ""}
                      >
                        {slot.is_booked ? "Booked" : "Book Slot"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{booking.name}</h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.created_at), "PPP")}
                        </p>
                      </div>
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
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Phone: {booking.phone_number}</p>
                      <p>Email: {booking.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Available Slot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {selectedSlot && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-medium">Slot Details</h4>
                <p className="text-sm">
                  Date: {format(new Date(selectedSlot.date), "PPP")}
                </p>
                <p className="text-sm">Shift: {selectedSlot.shift}</p>
                <p className="text-sm">
                  Regular Driver: {selectedSlot.driver_name}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full">
              Confirm Booking
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
