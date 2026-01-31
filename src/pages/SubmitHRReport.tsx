import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUp, Users } from "lucide-react";
import WeeklyCalendar from "@/components/ui/weeklycalander";

const SubmitHRReport = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { userRole, hasAccess } = useAdmin();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [existingReportForDate, setExistingReportForDate] = useState<any>(null);
  const [formData, setFormData] = useState({
    total_calls_made: "",
    total_confirmations: "",
    total_joining: "",
    remarks: "",
  });

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast.error("You need to be logged in to access this page.");
      navigate("/");
      return;
    }

    // Check if user has permission (not "user" role)
    if (!loading && userRole === "user") {
      toast.error("You do not have permission to submit HR reports.");
      navigate("/");
      return;
    }
  }, [isAuthenticated, loading, userRole, navigate]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) throw error;
          setUserData(data);
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to load user data");
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    checkExistingReport(date);
  };

  const checkExistingReport = async (date: string) => {
    if (!user) return;

    try {
      const { data: existingReport, error } = await supabase
        .from("hr_reports")
        .select("id, status, submission_date, total_calls_made, total_confirmations, total_joining")
        .eq("user_id", user.id)
        .eq("report_date", date)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing report:", error);
        return;
      }

      if (existingReport) {
        setExistingReportForDate(existingReport);
      } else {
        setExistingReportForDate(null);
      }
    } catch (error) {
      console.error("Error checking existing report:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData) {
      toast.error("User data not available");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a report date before submitting.");
      return;
    }

    // Validate required fields
    if (!formData.total_calls_made || !formData.total_confirmations || !formData.total_joining) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      // Check if a report already exists for this user and date
      const { data: existingReport, error: checkError } = await supabase
        .from("hr_reports")
        .select("id, status")
        .eq("user_id", userData.id)
        .eq("report_date", selectedDate)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw new Error("Failed to check for existing report");
      }

      if (existingReport) {
        toast.error(
          `A report for ${selectedDate} has already been submitted. You cannot submit multiple reports for the same date.`
        );
        setSubmitting(false);
        return;
      }

      const submissionDate = new Date().toISOString();

      // Insert the HR report
      const reportData = {
        user_id: userData.id,
        submitted_by_name: userData.name || "Unknown",
        report_date: selectedDate,
        total_calls_made: parseInt(formData.total_calls_made) || 0,
        total_confirmations: parseInt(formData.total_confirmations) || 0,
        total_joining: parseInt(formData.total_joining) || 0,
        remarks: formData.remarks || null,
        status: "pending_verification",
        submission_date: submissionDate,
      };

      const { error: reportError } = await supabase
        .from("hr_reports")
        .insert(reportData);

      if (reportError) throw reportError;

      toast.success("HR report submitted successfully!");
      navigate("/admin/reports");
    } catch (error: any) {
      console.error("Error submitting HR report:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-fleet-purple" />
          <h1 className="text-2xl font-bold text-fleet-purple">
            Submit HR Report
          </h1>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <Label htmlFor="submitted_by">Submitted By</Label>
              <Input
                id="submitted_by"
                value={userData.name || ""}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div className="mb-6">
              <Label>Select Report Date</Label>
              <WeeklyCalendar
                onDateSelect={handleDateSelect}
                requireSelection={true}
              />
            </div>

            {/* Existing Report Warning */}
            {existingReportForDate && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span className="font-semibold text-yellow-800">
                    Report Already Submitted
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">
                  A report for {selectedDate} has already been submitted with
                  the following details:
                </p>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>
                    <strong>Status:</strong> {existingReportForDate.status}
                  </p>
                  <p>
                    <strong>Total Calls:</strong> {existingReportForDate.total_calls_made}
                  </p>
                  <p>
                    <strong>Total Confirmations:</strong> {existingReportForDate.total_confirmations}
                  </p>
                  <p>
                    <strong>Total Joining:</strong> {existingReportForDate.total_joining}
                  </p>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  You cannot submit multiple reports for the same date.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <Label htmlFor="total_calls_made">
                  Total Calls Made <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_calls_made"
                  name="total_calls_made"
                  type="number"
                  min="0"
                  placeholder="Enter total calls"
                  value={formData.total_calls_made}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="total_confirmations">
                  Total Confirmations <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_confirmations"
                  name="total_confirmations"
                  type="number"
                  min="0"
                  placeholder="Enter total confirmations"
                  value={formData.total_confirmations}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="total_joining">
                  Total Joining <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_joining"
                  name="total_joining"
                  type="number"
                  min="0"
                  placeholder="Enter total joining"
                  value={formData.total_joining}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                name="remarks"
                placeholder="Any additional notes or comments"
                value={formData.remarks}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/reports")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || existingReportForDate}
                className={
                  existingReportForDate ? "opacity-50 cursor-not-allowed" : ""
                }
              >
                {submitting
                  ? "Submitting..."
                  : existingReportForDate
                  ? "Report Already Submitted"
                  : "Submit Report"}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubmitHRReport;




