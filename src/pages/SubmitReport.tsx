import React, { useState, useEffect } from "react";
import { Route, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
// import dayjs from "dayjs";
import WeeklyCalendar from "@/components/ui/weeklycalander";
import { SalaryBaseReportForm } from "@/components/SalaryBaseReportForm";
// import CopyUpiButton from "@/components/ui/CopyUPI";
// import { Alert } from "@/components/ui/alert";
// import UpiPayment from "@/components/UpiPayment";

const SubmitReport = () => {
  const [totalTrips, setTotalTrips] = useState(0); // Default to 0
  const [vehicleTrips, setVehicleTrips] = useState<number>(0);
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [currentEarnings, setcurrentEarnings] = useState();
  const [currentTrips, setcurrentTrips] = useState();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [driverCategory, setDriverCategory] = useState<
    "hub_base" | "salary_base"
  >("hub_base");
  const [uberScreenshot, setUberScreenshot] = useState<File | null>(null);
  const [rentScreenshot, setRentScreenshot] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [approvedReportsCount, setApprovedReportsCount] = useState(0);
  const [depositCutting, setDepositCutting] = useState(0);
  const [enableDepositCollection, setEnableDepositCollection] = useState(true);
  const [formData, setFormData] = useState({
    vehicle_number: "",
    total_trips: "",
    total_earnings: "",
    toll: "",
    total_cashcollect: "",
    rent_paid: "",
    other_fee: "",
    rent_date: "",
    remarks: "",
  });
  const [isServiceDay, setIsServiceDay] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [existingReportForDate, setExistingReportForDate] = useState<any>(null);

  // Get admin settings for company earnings calculation
  const {
    calculateCompanyEarnings,
    calculateCompanyEarnings24hr,
    companyEarningsSlabs,
    companyEarningsSlabs24hr,
    loading: settingsLoading,
  } = useAdminSettings();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      alert("You need to be logged in to access this page.");
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  // Fetch user data and approved reports count
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .eq("online", true)
            .single();
          if (error) {
            navigate("/profile");
            toast.error("You Are Offline");
            return;
          } else {
            setcurrentEarnings(data.total_earning);
            setcurrentTrips(data.total_trip);
            setUserData(data);
            setEnableDepositCollection(data.enable_deposit_collection ?? true);
            setDriverCategory(data.driver_category || "hub_base");

            // Fetch count of only approved reports (excluding leave status) for cutting calculation
            // Only approved reports should count towards deposit cutting
            const { count: approvedCount, error: countError } = await supabase
              .from("fleet_reports")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("status", "approved");

            if (!countError) {
              setApprovedReportsCount(approvedCount || 0);
            }

            // Only fetch vehicle data if vehicle_number is not null
            if (data.vehicle_number) {
              const { data: vehiclesData, error: vehiclesError } =
                await supabase
                  .from("vehicles")
                  .select("total_trips")
                  .eq("vehicle_number", data.vehicle_number)
                  .single();

              if (vehiclesError) {
                console.error("Error fetching vehicle data:", vehiclesError);
                // Don't throw error, just set vehicle trips to 0
                setVehicleTrips(0);
              } else if (vehiclesData) {
                console.log("Vehicle data:", vehiclesData);
                setVehicleTrips(vehiclesData.total_trips || 0);
              }
            } else {
              // No vehicle assigned, set trips to 0
              setVehicleTrips(0);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          if (error.code === "PGRST116") {
            toast.error("You are offline. Please go online to submit reports.");
          } else {
            toast.error("Failed to load user data");
          }
        }
      }
    };

    fetchUserData();
  }, [user]);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     if (!formData.vehicle_number) return;

  //     try {
  //       const { data, error } = await supabase
  //         .from("vehicles")
  //         .select("total_trips")
  //         .eq("vehicle_number", formData.vehicle_number)
  //         .single();

  //       if (error) throw error;
  //       if (data) {
  //         console.log("Date", data);
  //         console.log("Data Trips", data.total_trips);
  //         setVehicleTrips(data.total_trips);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching vehicle trips:", error);
  //     }
  //   };

  //   fetchData();
  // }, [formData.vehicle_number]);

  const [copied, setCopied] = useState(false);
  const upiId = "8590253089@ikwik";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // For number inputs, convert string to number
    if (
      [
        "total_trips",
        "total_earnings",
        "total_cashcollect",
        "rent_paid",
        "other_fee",
      ].includes(name)
    ) {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "uber" | "rent"
  ) => {
    if (e.target.files && e.target.files[0]) {
      if (type === "uber") {
        setUberScreenshot(e.target.files[0]);
      } else {
        setRentScreenshot(e.target.files[0]);
      }
    }
  };

  // Calculate company earnings using admin settings
  const calculateCompanyEarningsForShift = (
    trips: number,
    shift: string = "morning"
  ) => {
    // Use admin settings if available, otherwise fallback to hardcoded values
    if (!settingsLoading) {
      try {
        if (shift === "24hr" && calculateCompanyEarnings24hr) {
          const earnings = calculateCompanyEarnings24hr(trips);
          if (earnings > 0) {
            return earnings;
          }
        } else if (calculateCompanyEarnings) {
          const earnings = calculateCompanyEarnings(trips);
          if (earnings > 0) {
            return earnings;
          }
        }
      } catch (error) {
        console.error("Error calculating company earnings:", error);
      }
    }

    // Fallback to hardcoded values if settings are not available
    let baseRent = 0;
    if (trips >= 12) {
      baseRent = 535;
    } else if (trips >= 11) {
      baseRent = 585;
    } else if (trips >= 10) {
      baseRent = 635;
    } else if (trips >= 8) {
      baseRent = 715;
    } else if (trips >= 5) {
      baseRent = 745;
    } else {
      baseRent = 795;
    }

    // If it's a 24-hour shift, use different slabs
    if (shift === "24hr") {
      if (trips >= 24) {
        return 1070;
      } else if (trips >= 22) {
        return 1170;
      } else if (trips >= 20) {
        return 1270;
      } else if (trips >= 16) {
        return 1430;
      } else if (trips >= 10) {
        return 1490;
      } else {
        return 1590;
      }
    }

    return baseRent;
  };

  // Note: Other fee (expenses) is now manually entered by the driver
  // It can include platform fees, fuel costs, maintenance, or any other expenses

  // Calculate deposit cutting based on approved reports and toggle status
  useEffect(() => {
    if (!userData) return;

    // Only apply deposit cutting if:
    // 1. Deposit collection is enabled for this driver
    // 2. Driver has less than 10 approved reports
    if (enableDepositCollection && approvedReportsCount < 10) {
      const currentDeposit = userData.pending_balance || 0;
      const targetDeposit = 2500;

      // Stop deposit cutting if driver has already reached ₹2500
      if (currentDeposit >= targetDeposit) {
        setDepositCutting(0);
        return;
      }

      // Calculate how much deposit is still needed
      const remainingDeposit = targetDeposit - currentDeposit;

      // Calculate remaining forms: 10 total cutting reports (reports 1-10)
      // Only approved reports count towards the 10 reports
      // After 0 approved reports: 10 remaining (reports 1-10)
      // After 1 approved report: 9 remaining (reports 2-10)
      // After 5 approved reports: 5 remaining (reports 6-10)
      const remainingForms = 10 - approvedReportsCount;

      // Calculate daily cutting amount - distribute remaining deposit equally
      const dailyCutting = remainingDeposit / remainingForms;
      setDepositCutting(Math.round(dailyCutting));
    } else {
      setDepositCutting(0);
    }
  }, [userData, approvedReportsCount, enableDepositCollection]);

  // Calculate Rent with Penalty and Deposit Cutting
  useEffect(() => {
    if (!userData) return;

    const trips = Number(formData.total_trips);
    const rent = calculateCompanyEarningsForShift(trips, userData.shift);
    const tollandEarnings =
      Number(formData.toll) + Number(formData.total_earnings);
    const cashcollect = Number(formData.total_cashcollect) || 0;
    const otherFee = Number(formData.other_fee) || 0;

    // Get daily penalty amount from user data
    const dailyPenaltyAmount = userData.daily_penalty_amount || 0;

    // Calculate total amount including penalty, other fee (expenses), and deposit cutting
    const totalRentWithExtras =
      rent + dailyPenaltyAmount + otherFee + depositCutting;
    const amount = tollandEarnings - cashcollect - totalRentWithExtras;

    let message = "No payment required";
    if (amount > 0) {
      // message = ` Refund  ₹${Math.abs(amount).toFixed(2)}`;
      message = ` Refund  `;
    } else if (amount < 0) {
      message = ` Pay ₹${Math.abs(amount).toFixed(2)}`;
    }

    // Add breakdown information
    let breakdown = [];
    if (dailyPenaltyAmount > 0) {
      breakdown.push(`Penalty: ₹${dailyPenaltyAmount.toFixed(2)}`);
    }
    if (depositCutting > 0) {
      breakdown.push(`Deposit: ₹${depositCutting.toFixed(2)}`);
    }

    setPaymentMessage(message);
    setFormData((prev) => ({
      ...prev,
      rent_paid: amount.toFixed(2),
    }));
  }, [
    formData.total_earnings,
    formData.total_cashcollect,
    formData.total_trips,
    formData.toll,
    formData.other_fee,
    userData,
    depositCutting,
    approvedReportsCount,
  ]);
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    checkExistingReport(date);
  };

  const checkExistingReport = async (date: string) => {
    if (!userData) return;

    try {
      const { data: existingReport, error } = await supabase
        .from("fleet_reports")
        .select("id, status, submission_date, total_trips, total_earnings")
        .eq("user_id", userData.id)
        .eq("rent_date", date)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing report:", error);
        return;
      }

      setExistingReportForDate(existingReport || null);
    } catch (error) {
      console.error("Error checking existing report:", error);
    }
  };

  // Handle confirmation screen countdown
  useEffect(() => {
    if (showConfirmation) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/profile");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showConfirmation, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const getISTISOString = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
      const istDate = new Date(now.getTime() + istOffset);
      return istDate.toISOString().slice(0, 19).replace("T", " ");
    };

    const submissionDate = getISTISOString(); // returns "YYYY-MM-DD HH:mm:ss"

    const submissionDateIST = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    const formattedSubmissionDate = new Date(submissionDateIST).toISOString(); // if needed

    if (!userData) {
      toast.error("User data not available");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a rent date before submitting.");
      return;
    }

    // Clean and validate vehicle number
    const vehicleNumber = userData.vehicle_number?.trim().toUpperCase();
    if (!vehicleNumber) {
      toast.error(
        "No vehicle assigned to this user. Please contact admin to assign a vehicle."
      );
      return;
    }

    setSubmitting(true);

    try {
      // Check if a report already exists for this user and rent date
      const { data: existingReport, error: checkError } = await supabase
        .from("fleet_reports")
        .select("id, status, submission_date")
        .eq("user_id", userData.id)
        .eq("rent_date", selectedDate)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" error
        console.error("Error checking existing report:", checkError);
        throw new Error("Failed to check for existing report");
      }

      if (existingReport) {
        toast.error(
          `A report for ${selectedDate} has already been submitted. You cannot submit multiple reports for the same date.`
        );
        setSubmitting(false);
        return;
      }

      let uberScreenshotUrl = null;
      let rentScreenshotUrl = null;

      // Upload screenshots first
      if (uberScreenshot) {
        const fileName = `${
          user?.id
        }/reports/${Date.now()}_uber_screenshot.${uberScreenshot.name
          .split(".")
          .pop()}`;
        const { data: uberData, error: uberError } = await supabase.storage
          .from("uploads")
          .upload(fileName, uberScreenshot);
        if (uberError) throw uberError;
        uberScreenshotUrl = fileName;
      }

      // Only upload payment screenshot if driver needs to pay (positive amount)
      if (rentScreenshot && paymentMessage.includes("Pay")) {
        const fileName = `${
          user?.id
        }/reports/${Date.now()}_payment_screenshot.${rentScreenshot.name
          .split(".")
          .pop()}`;
        const { data: rentData, error: rentError } = await supabase.storage
          .from("uploads")
          .upload(fileName, rentScreenshot);
        if (rentError) throw rentError;
        rentScreenshotUrl = fileName;
      }

      // First, verify the vehicle exists
      const { data: vehicleCheck, error: vehicleCheckError } = await supabase
        .from("vehicles")
        .select("vehicle_number, total_trips")
        .eq("vehicle_number", vehicleNumber)
        .single();

      if (vehicleCheckError) {
        console.error("Error checking vehicle:", vehicleCheckError);
        throw new Error("Failed to verify vehicle existence");
      }

      if (!vehicleCheck) {
        console.error("Vehicle not found in database:", vehicleNumber);
        throw new Error("Vehicle not found in database");
      }

      // Calculate new total trips
      const currentVehicleTrips = vehicleCheck.total_trips || 0;
      const newVehicleTrips =
        currentVehicleTrips + Number(formData.total_trips);

      console.log("Vehicle Update Debug:", {
        vehicleNumber,
        currentTrips: currentVehicleTrips,
        newTrips: newVehicleTrips,
        formTrips: formData.total_trips,
        vehicleExists: !!vehicleCheck,
      });

      // Insert the fleet report
      const { error: reportError } = await supabase
        .from("fleet_reports")
        .insert({
          user_id: userData.id,
          driver_name: userData.name,
          vehicle_number: vehicleNumber,
          total_trips: formData.total_trips,
          total_earnings: formData.total_earnings,
          shift: ["morning", "night"].includes(userData.shift)
            ? userData.shift
            : "morning",
          rent_date: selectedDate,
          toll: formData.toll,
          total_cashcollect: formData.total_cashcollect,
          other_fee: formData.other_fee,
          rent_paid_amount:
            Number(formData.rent_paid) > 0
              ? -formData.rent_paid
              : Math.abs(Number(formData.rent_paid)),
          deposit_cutting_amount: depositCutting, // Save the deposit cutting amount
          is_service_day: isServiceDay,
          status: "pending_verification",
          remarks: formData.remarks,
          uber_screenshot: uberScreenshotUrl,
          payment_screenshot: rentScreenshotUrl,
          submission_date: formattedSubmissionDate,
        });

      if (reportError) throw reportError;

      // Update user totals
      const newTotalEarnings =
        Number(currentEarnings) + Number(formData.total_earnings);
      const newTotalTrips = Number(currentTrips) + Number(formData.total_trips);

      // Update user data
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ total_earning: newTotalEarnings, total_trip: newTotalTrips })
        .eq("id", userData.id);

      if (userUpdateError) {
        console.error("Error updating user data:", userUpdateError);
        throw userUpdateError;
      }

      // Update vehicle trips with explicit error handling
      try {
        // First try to update with RLS bypass
        const { data: updateData, error: vehicleUpdateError } = await supabase
          .from("vehicles")
          .update({ total_trips: newVehicleTrips })
          .eq("vehicle_number", vehicleNumber)
          .select();

        if (vehicleUpdateError) {
          console.error("Error updating vehicle data:", vehicleUpdateError);

          // If the first attempt fails, try an alternative approach
          const { data: altUpdateData, error: altUpdateError } =
            await supabase.rpc("update_vehicle_trips", {
              p_vehicle_number: vehicleNumber,
              p_new_trips: newVehicleTrips,
            });

          if (altUpdateError) {
            console.error("Alternative update also failed:", altUpdateError);
            throw new Error("Failed to update vehicle trips");
          }

          if (!altUpdateData) {
            throw new Error("Vehicle update failed - no rows affected");
          }
        } else if (!updateData || updateData.length === 0) {
          console.error("No rows were updated for vehicle:", vehicleNumber);
          console.error("Vehicle check data:", vehicleCheck);

          // Try the alternative approach if no rows were affected
          const { data: altUpdateData, error: altUpdateError } =
            await supabase.rpc("update_vehicle_trips", {
              p_vehicle_number: vehicleNumber,
              p_new_trips: newVehicleTrips,
            });

          if (altUpdateError) {
            console.error("Alternative update also failed:", altUpdateError);
            throw new Error("Failed to update vehicle trips");
          }

          if (!altUpdateData) {
            throw new Error("Vehicle update failed - no rows affected");
          }
        }
      } catch (updateError) {
        console.error("Vehicle update error:", updateError);
        throw new Error("Failed to update vehicle trips");
      }

      toast.success("Daily report submitted successfully!");
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !userData || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  // Show confirmation screen after successful submission
  if (showConfirmation) {
    return (
      <div className="h-screen items-center justify-center bg-green-500">
        {/* <Navbar /> */}
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center bg-white shadow-lg rounded-lg p-8 max-w-md">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Report Submitted Successfully!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your daily report has been submitted and is pending
                  verification.
                </p>
                <div className="text-sm text-gray-500">
                  Redirecting to profile in{" "}
                  <span className="font-semibold text-fleet-purple">
                    {countdown}
                  </span>{" "}
                  seconds...
                </div>
              </div>
              <Button onClick={() => navigate("/profile")} className="w-full">
                Go to Profile Now
              </Button>
            </div>
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    );
  }

  // Render salary base form if driver is salary based
  if (driverCategory === "salary_base") {
    return (
      <div className="min-h-screen bg-white">
        {/* <Navbar /> */}
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <h1 className="text-xl text-center font-medium text-fleet-purple mb-6">
            Submit Daily Report (Salary Base)
          </h1>

          <div className="bg-white shadow-md rounded-lg p-6">
            <SalaryBaseReportForm
              userData={userData}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              existingReportForDate={existingReportForDate}
              onSubmit={handleSubmit}
              submitting={submitting}
              navigate={navigate}
            />
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    );
  }

  // Render hub base form (existing form)
  return (
    <div className="min-h-screen bg-white">
      {/* <Navbar /> */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-xl text-center font-medium text-fleet-purple mb-6">
          Submit Daily Report
        </h1>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="driver_name">Driver Name</Label>
                <Input
                  id="driver_name"
                  value={userData.name || ""}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label htmlFor="vehicle_number">Vehicle Number</Label>
                <Input
                  id="vehicle_number"
                  value={userData.vehicle_number || "Not Assigned"}
                  disabled
                  className={`bg-gray-100 ${
                    !userData.vehicle_number
                      ? "border-red-300 text-red-600"
                      : ""
                  }`}
                />
                {!userData.vehicle_number && (
                  <p className="text-sm text-red-600 mt-1">
                    No vehicle assigned. Please contact admin.
                  </p>
                )}
              </div>
            </div>

            <WeeklyCalendar
              onDateSelect={handleDateSelect}
              requireSelection={true}
            />

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
                    <strong>Trips:</strong> {existingReportForDate.total_trips}
                  </p>
                  <p>
                    <strong>Earnings:</strong> ₹
                    {existingReportForDate.total_earnings}
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {new Date(
                      existingReportForDate.submission_date
                    ).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  You cannot submit multiple reports for the same date.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="total_trips">Total Trips</Label>
                <Input
                  id="total_trips"
                  name="total_trips"
                  type="tel"
                  placeholder="Enter number of trips"
                  value={formData.total_trips}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="total_earnings">Total Earnings (₹)</Label>
                <Input
                  id="total_earnings"
                  name="total_earnings"
                  type="tel"
                  placeholder="Enter total earnings"
                  value={formData.total_earnings}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="total_earnings">Toll (₹)</Label>
                <Input
                  id="toll"
                  name="toll"
                  type="tel"
                  placeholder="Enter total toll"
                  value={formData.toll}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="total_cashcollect">
                  Total Cash Collected (₹)
                </Label>
                <Input
                  id="total_cashcollect"
                  name="total_cashcollect"
                  type="tel"
                  placeholder="Enter cash collected"
                  value={formData.total_cashcollect}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="other_fee">Other Fee / Expenses (₹)</Label>
                <Input
                  id="other_fee"
                  name="other_fee"
                  type="tel"
                  required
                  placeholder="Enter expenses amount"
                  value={formData.other_fee}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter any expenses (platform fee, fuel, maintenance, etc.)
                </p>
              </div>
            </div>

            {/* Service Day Toggle */}
            <div className="mb-6 p-4 border border-gray-300 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="service_day"
                    className="text-base font-medium"
                  >
                    Service Day Report
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Mark this report as a service day (vehicle
                    servicing/maintenance)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsServiceDay(!isServiceDay)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isServiceDay ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isServiceDay ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {isServiceDay && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    ⚙️ This report will be marked as a service day. Service day
                    reports are tracked separately for maintenance records.
                  </p>
                </div>
              )}
            </div>
            {/* Penalty Information */}
            {userData?.daily_penalty_amount > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-red-600"
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
                  <span className="font-semibold text-red-800">
                    Daily Penalty Applied
                  </span>
                </div>
                <p className="text-sm text-red-700">
                  Daily penalty amount: ₹
                  {userData.daily_penalty_amount.toFixed(2)}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This amount will be automatically deducted from your daily
                  earnings.
                </p>
              </div>
            )}

            {/* Deposit Cutting Information - Only show if enabled and amount > 0 */}
            {/* {enableDepositCollection && depositCutting > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="font-semibold text-blue-800">
                    Deposit Collection
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  Daily deposit cutting: ₹{depositCutting.toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Current deposit: ₹
                  {(userData?.pending_balance || 0).toFixed(2)} | Target: ₹2,500
                  | Remaining: ₹
                  {(2500 - (userData?.pending_balance || 0)).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This amount will be added to your deposit balance.
                </p>
              </div>
            )} */}

            <div
              className={`mb-4 p-4 bg-gray-100 border border-gray-300 rounded-md ${
                paymentMessage.includes("Refund")
                  ? "bg-green-500"
                  : "bg-red-500 "
              }`}
            >
              <p
                className={`text-sm text-center font-bold ${
                  paymentMessage.includes("Refund")
                    ? "text-white"
                    : "text-white"
                }`}
              >
                {paymentMessage}
              </p>
            </div>

            {/* Company Earnings Slabs Display */}
            {/* {!settingsLoading &&
              companyEarningsSlabs &&
              companyEarningsSlabs.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">
                    Company Earnings Slabs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {companyEarningsSlabs.map((slab, index) => (
                      <div key={index} className="bg-white p-2 rounded border">
                        <span className="font-medium">
                          {slab.min_trips}
                          {slab.max_trips ? `-${slab.max_trips}` : "+"} trips
                        </span>
                        <br />
                        <span className="text-green-600">₹{slab.amount}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    * For 24-hour shifts, earnings are doubled
                  </p>
                </div>
              )} */}
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

            <div
              className={`grid gap-6 mb-6 ${
                paymentMessage.includes("Pay")
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              <div>
                <Label htmlFor="uber_screenshot">Uber Screenshot</Label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                    {uberScreenshot
                      ? uberScreenshot.name
                      : "Upload Uber Screenshot"}
                    <input
                      id="uber_screenshot"
                      name="uber_screenshot"
                      type="file"
                      required
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "uber")}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Only show payment screenshot if driver needs to pay (positive amount) */}
              {paymentMessage.includes("Pay") && (
                <div>
                  <Label htmlFor="payment_screenshot">Payment Screenshot</Label>
                  <div className="mt-1 flex items-center">
                    <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                      <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                      {rentScreenshot
                        ? rentScreenshot.name
                        : "Upload Payment Screenshot"}
                      <input
                        id="payment_screenshot"
                        name="payment_screenshot"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "rent")}
                        className="sr-only"
                        required
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium">{upiId}</span>
              <button
                onClick={handleCopy}
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                {copied ? "Copied!" : "Copy UPI"}
              </button>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/profile")}
                className="mr-2"
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
      {/* <Footer /> */}
    </div>
  );
};

export default SubmitReport;
