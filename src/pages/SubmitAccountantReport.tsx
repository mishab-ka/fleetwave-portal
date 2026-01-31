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
import { Calculator, DollarSign } from "lucide-react";
import WeeklyCalendar from "@/components/ui/weeklycalander";

const SubmitAccountantReport = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { userRole } = useAdmin();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [existingReportForDate, setExistingReportForDate] = useState<any>(null);
  const [formData, setFormData] = useState({
    total_income: "",
    total_expenses: "",
    net_profit: "",
    cash_flow: "",
    accounts_receivable: "",
    accounts_payable: "",
    bank_balance: "",
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
      toast.error("You do not have permission to submit accountant reports.");
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
        .from("accountant_reports")
        .select("id, status, submission_date, total_income, total_expenses, net_profit")
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

    // Auto-calculate net profit if income and expenses are provided
    if (name === "total_income" || name === "total_expenses") {
      const income = name === "total_income" ? parseFloat(value) || 0 : parseFloat(formData.total_income) || 0;
      const expenses = name === "total_expenses" ? parseFloat(value) || 0 : parseFloat(formData.total_expenses) || 0;
      const netProfit = income - expenses;
      setFormData((prev) => ({
        ...prev,
        net_profit: netProfit.toString(),
      }));
    }
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

    setSubmitting(true);

    try {
      // Check if a report already exists for this user and date
      const { data: existingReport, error: checkError } = await supabase
        .from("accountant_reports")
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

      // Calculate net profit if not provided
      const income = parseFloat(formData.total_income) || 0;
      const expenses = parseFloat(formData.total_expenses) || 0;
      const netProfit = income - expenses;

      // Insert the accountant report
      const reportData = {
        user_id: userData.id,
        submitted_by_name: userData.name || "Unknown",
        report_date: selectedDate,
        total_income: income,
        total_expenses: expenses,
        net_profit: netProfit,
        cash_flow: parseFloat(formData.cash_flow) || 0,
        accounts_receivable: parseFloat(formData.accounts_receivable) || 0,
        accounts_payable: parseFloat(formData.accounts_payable) || 0,
        bank_balance: parseFloat(formData.bank_balance) || 0,
        remarks: formData.remarks || null,
        status: "pending_verification",
        submission_date: submissionDate,
      };

      const { error: reportError } = await supabase
        .from("accountant_reports")
        .insert(reportData);

      if (reportError) throw reportError;

      toast.success("Accountant report submitted successfully!");
      navigate("/admin/reports");
    } catch (error: any) {
      console.error("Error submitting accountant report:", error);
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
          <Calculator className="h-6 w-6 text-fleet-purple" />
          <h1 className="text-2xl font-bold text-fleet-purple">
            Submit Accountant Report
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
                  A report for {selectedDate} has already been submitted.
                </p>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>
                    <strong>Status:</strong> {existingReportForDate.status}
                  </p>
                  <p>
                    <strong>Total Income:</strong> ₹{existingReportForDate.total_income}
                  </p>
                  <p>
                    <strong>Total Expenses:</strong> ₹{existingReportForDate.total_expenses}
                  </p>
                  <p>
                    <strong>Net Profit:</strong> ₹{existingReportForDate.net_profit}
                  </p>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  You cannot submit multiple reports for the same date.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="total_income">
                  Total Income (₹)
                </Label>
                <Input
                  id="total_income"
                  name="total_income"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.total_income}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="total_expenses">
                  Total Expenses (₹)
                </Label>
                <Input
                  id="total_expenses"
                  name="total_expenses"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.total_expenses}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="net_profit">
                  Net Profit (₹) <span className="text-gray-500 text-xs">(Auto-calculated)</span>
                </Label>
                <Input
                  id="net_profit"
                  name="net_profit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.net_profit}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label htmlFor="cash_flow">
                  Cash Flow (₹)
                </Label>
                <Input
                  id="cash_flow"
                  name="cash_flow"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cash_flow}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="accounts_receivable">
                  Accounts Receivable (₹)
                </Label>
                <Input
                  id="accounts_receivable"
                  name="accounts_receivable"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.accounts_receivable}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="accounts_payable">
                  Accounts Payable (₹)
                </Label>
                <Input
                  id="accounts_payable"
                  name="accounts_payable"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.accounts_payable}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="bank_balance">
                  Bank Balance (₹)
                </Label>
                <Input
                  id="bank_balance"
                  name="bank_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.bank_balance}
                  onChange={handleInputChange}
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

export default SubmitAccountantReport;




