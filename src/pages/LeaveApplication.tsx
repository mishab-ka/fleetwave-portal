import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  format,
  addDays,
  isBefore,
  parseISO,
  startOfWeek,
  addWeeks,
  getDay,
} from "date-fns";

interface LeaveApplication {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function LeaveApplication() {
  const { user } = useAuth();
  const [leaveApplications, setLeaveApplications] = useState<
    LeaveApplication[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [errors, setErrors] = useState<{
    start_date?: string;
    end_date?: string;
    reason?: string;
  }>({});

  useEffect(() => {
    if (user) {
      fetchLeaveApplications();
    }
  }, [user]);

  const fetchLeaveApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*")
        .eq("driver_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeaveApplications(data || []);
    } catch (error) {
      console.error("Error fetching leave applications:", error);
      toast.error("Failed to load leave applications");
    } finally {
      setLoading(false);
    }
  };

  // Get the next available Monday (at least 3 days from today)
  const getNextAvailableMonday = () => {
    const today = new Date();
    const minDate = addDays(today, 3); // Minimum 3 days from today

    // Find the next Monday after the minimum date
    let nextMonday = startOfWeek(minDate, { weekStartsOn: 1 }); // Monday = 1

    // If the next Monday is before the minimum date, move to the following Monday
    if (isBefore(nextMonday, minDate)) {
      nextMonday = addWeeks(nextMonday, 1);
    }

    return nextMonday;
  };

  // Calculate minimum allowed start date (next available Monday)
  const getMinStartDate = () => {
    const nextMonday = getNextAvailableMonday();
    return format(nextMonday, "yyyy-MM-dd");
  };

  // Calculate maximum allowed start date (for date picker range)
  const getMaxStartDate = () => {
    // Allow up to 6 months from today
    const maxDate = addDays(new Date(), 180);
    return format(maxDate, "yyyy-MM-dd");
  };

  // Calculate minimum allowed end date (same as start date)
  const getMinEndDate = () => {
    return formData.start_date || getMinStartDate();
  };

  // Check if a date is a Monday
  const isMonday = (dateString: string) => {
    const date = parseISO(dateString);
    return getDay(date) === 1; // Monday = 1
  };

  // Get all available Monday dates for the next 6 months
  const getAvailableMondays = () => {
    const mondays = [];
    let currentMonday = getNextAvailableMonday();
    const maxDate = addDays(new Date(), 180);

    while (isBefore(currentMonday, maxDate)) {
      mondays.push(format(currentMonday, "yyyy-MM-dd"));
      currentMonday = addWeeks(currentMonday, 1);
    }

    return mondays;
  };

  // Validate form data
  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Validate start date
    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    } else {
      const startDate = parseISO(formData.start_date);
      const minDate = getNextAvailableMonday();

      // Check if it's at least 3 days from today
      if (isBefore(startDate, addDays(new Date(), 3))) {
        newErrors.start_date = "Start date must be at least 3 days from today";
      }
      // Check if it's a Monday
      else if (!isMonday(formData.start_date)) {
        newErrors.start_date = "Start date must be a Monday";
      }
    }

    // Validate end date
    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
    } else if (formData.start_date) {
      const startDate = parseISO(formData.start_date);
      const endDate = parseISO(formData.end_date);

      if (isBefore(endDate, startDate)) {
        newErrors.end_date = "End date cannot be before start date";
      }
    }

    // Validate reason
    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = "Reason must be at least 10 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setFormData({ ...formData, start_date: newStartDate });

    // Clear start date error when user selects a valid date
    if (errors.start_date) {
      setErrors({ ...errors, start_date: undefined });
    }

    // If end date is before new start date, clear it
    if (formData.end_date && newStartDate && formData.end_date < newStartDate) {
      setFormData((prev) => ({ ...prev, end_date: "" }));
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setFormData({ ...formData, end_date: newEndDate });

    // Clear end date error when user selects a valid date
    if (errors.end_date) {
      setErrors({ ...errors, end_date: undefined });
    }
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newReason = e.target.value;
    setFormData({ ...formData, reason: newReason });

    // Clear reason error when user types
    if (errors.reason) {
      setErrors({ ...errors, reason: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form before submission
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      const { error } = await supabase.from("leave_applications").insert([
        {
          driver_id: user.id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason.trim(),
          status: "pending",
        },
      ]);

      if (error) throw error;

      toast.success("Leave application submitted successfully");
      setFormData({ start_date: "", end_date: "", reason: "" });
      setErrors({});
      fetchLeaveApplications();
    } catch (error) {
      console.error("Error submitting leave application:", error);
      toast.error("Failed to submit leave application");
    }
  };

  const availableMondays = getAvailableMondays();
  const nextMonday = getNextAvailableMonday();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Leave Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Leave Application</CardTitle>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Important:</strong> Leave applications can only start on
                Mondays, and the Monday must be at least 3 days from today.
              </p>
              <p className="text-sm text-gray-600">
                Next available Monday:{" "}
                <strong>{format(nextMonday, "EEEE, MMMM d, yyyy")}</strong>
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start Date (Mondays Only)
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={handleStartDateChange}
                    min={getMinStartDate()}
                    max={getMaxStartDate()}
                    required
                    className={errors.start_date ? "border-red-500" : ""}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-red-600">{errors.start_date}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Available Mondays: {availableMondays.slice(0, 3).join(", ")}
                    {availableMondays.length > 3 && "..."}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={handleEndDateChange}
                    min={getMinEndDate()}
                    required
                    className={errors.end_date ? "border-red-500" : ""}
                  />
                  {errors.end_date && (
                    <p className="text-sm text-red-600">{errors.end_date}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  value={formData.reason}
                  onChange={handleReasonChange}
                  placeholder="Please provide a detailed reason for your leave (minimum 10 characters)"
                  required
                  className={errors.reason ? "border-red-500" : ""}
                />
                {errors.reason && (
                  <p className="text-sm text-red-600">{errors.reason}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Leave Applications History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              Leave Applications History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 ">
              {leaveApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-white p-4 rounded-lg border space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {format(new Date(application.start_date), "PPP")} -{" "}
                        {format(new Date(application.end_date), "PPP")}
                      </p>
                      <p className="text-sm text-gray-600">
                        {application.reason}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        application.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : application.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {application.status}
                    </span>
                  </div>
                </div>
              ))}
              {leaveApplications.length === 0 && (
                <p className="text-center text-gray-500">
                  No leave applications found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
