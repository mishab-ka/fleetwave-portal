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
import { format, addDays, isBefore, parseISO } from "date-fns";

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
  const [applicationType, setApplicationType] = useState<
    "leave" | "resigning"
  >("leave");
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [resigningData, setResigningData] = useState({
    resignation_date: "",
    resignation_reason: "",
  });
  const [errors, setErrors] = useState<{
    start_date?: string;
    end_date?: string;
    reason?: string;
  }>({});
  const [resigningErrors, setResigningErrors] = useState<{
    resignation_date?: string;
    resignation_reason?: string;
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

  // Calculate minimum allowed end date (same as start date)
  const getMinEndDate = () => {
    return formData.start_date || format(new Date(), "yyyy-MM-dd");
  };

  // Validate form data
  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Validate start date
    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
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

  const validateResigningData = () => {
    const newErrors: typeof resigningErrors = {};

    if (!resigningData.resignation_date) {
      newErrors.resignation_date = "Resignation date is required";
    }
    if (!resigningData.resignation_reason.trim()) {
      newErrors.resignation_reason = "Resignation reason is required";
    } else if (resigningData.resignation_reason.trim().length < 10) {
      newErrors.resignation_reason =
        "Resignation reason must be at least 10 characters long";
    }

    setResigningErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (applicationType === "leave") {
      // Validate leave form
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
    } else {
      // Validate resigning form
      if (!validateResigningData()) {
        toast.error("Please fix the errors in the resigning information");
        return;
      }

      try {
        // Insert resignation into resigning_drivers table
        const { error: resigningError } = await supabase
          .from("resigning_drivers")
          .insert([
            {
              driver_id: user.id,
              resignation_date: resigningData.resignation_date,
              resignation_reason: resigningData.resignation_reason.trim(),
              status: "pending",
            },
          ]);

        if (resigningError) throw resigningError;

        // Update user record with resignation data
        const { error: userError } = await supabase
          .from("users")
          .update({
            resigning_date: resigningData.resignation_date,
            resignation_reason: resigningData.resignation_reason.trim(),
            driver_status: "resigning",
          })
          .eq("id", user.id);

        if (userError) throw userError;

        // Also create a leave application for resignation
        const { error: leaveError } = await supabase
          .from("leave_applications")
          .insert([
            {
              driver_id: user.id,
              start_date: resigningData.resignation_date,
              end_date: resigningData.resignation_date,
              reason: `Resignation: ${resigningData.resignation_reason.trim()}`,
              status: "pending",
            },
          ]);

        if (leaveError) throw leaveError;

        toast.success("Resignation submitted successfully");
        setResigningData({ resignation_date: "", resignation_reason: "" });
        setResigningErrors({});
        fetchLeaveApplications();
      } catch (error) {
        console.error("Error submitting resignation:", error);
        toast.error("Failed to submit resignation");
      }
    }
  };

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
        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Application</CardTitle>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Application Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={applicationType}
                  onValueChange={(value: "leave" | "resigning") => {
                    setApplicationType(value);
                    // Reset forms when switching
                    setFormData({ start_date: "", end_date: "", reason: "" });
                    setResigningData({
                      resignation_date: "",
                      resignation_reason: "",
                    });
                    setErrors({});
                    setResigningErrors({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select application type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leave">
                      Submit Leave Application
                    </SelectItem>
                    <SelectItem value="resigning">
                      Resigning Information
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {applicationType === "leave" ? (
                <>
                  {/* Leave Application Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={handleStartDateChange}
                        required
                        className={errors.start_date ? "border-red-500" : ""}
                      />
                      {errors.start_date && (
                        <p className="text-sm text-red-600">
                          {errors.start_date}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={handleEndDateChange}
                        required
                        min={getMinEndDate()}
                        className={errors.end_date ? "border-red-500" : ""}
                      />
                      {errors.end_date && (
                        <p className="text-sm text-red-600">
                          {errors.end_date}
                        </p>
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
                </>
              ) : (
                <>
                  {/* Resigning Information Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Resignation Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={resigningData.resignation_date}
                        onChange={(e) => {
                          setResigningData({
                            ...resigningData,
                            resignation_date: e.target.value,
                          });
                          if (resigningErrors.resignation_date) {
                            setResigningErrors({
                              ...resigningErrors,
                              resignation_date: undefined,
                            });
                          }
                        }}
                        min={format(new Date(), "yyyy-MM-dd")}
                        required
                        className={
                          resigningErrors.resignation_date
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {resigningErrors.resignation_date && (
                        <p className="text-sm text-red-600">
                          {resigningErrors.resignation_date}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Select your last working date
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Reason for Resignation{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        value={resigningData.resignation_reason}
                        onChange={(e) => {
                          setResigningData({
                            ...resigningData,
                            resignation_reason: e.target.value,
                          });
                          if (resigningErrors.resignation_reason) {
                            setResigningErrors({
                              ...resigningErrors,
                              resignation_reason: undefined,
                            });
                          }
                        }}
                        placeholder="Please provide a detailed reason for your resignation (minimum 10 characters)"
                        rows={4}
                        required
                        className={
                          resigningErrors.resignation_reason
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {resigningErrors.resignation_reason && (
                        <p className="text-sm text-red-600">
                          {resigningErrors.resignation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full">
                {applicationType === "leave"
                  ? "Submit Leave Application"
                  : "Submit Resignation"}
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
