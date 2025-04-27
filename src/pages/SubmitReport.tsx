import React, { useState, useEffect } from "react";
import { Route, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
// import { Alert } from "@/components/ui/alert";

const SubmitReport = () => {
  const [totalTrips, setTotalTrips] = useState(0); // Default to 0
  const [vehicleTrips, setVehicleTrips] = useState<number>(0);
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [currentEarnings, setcurrentEarnings] = useState();
  const [currentTrips, setcurrentTrips] = useState();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [uberScreenshot, setUberScreenshot] = useState<File | null>(null);
  const [rentScreenshot, setRentScreenshot] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [formData, setFormData] = useState({
    vehicle_number: "",
    total_trips: "",
    total_earnings: "",
    toll: "",
    total_cashcollect: "",
    rent_paid: "",

    rent_date: "",
    remarks: "",
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      alert("You need to be logged in to access this page.");
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  // Fetch user data
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
            const { data: vehiclesData, error: vehiclesError } = await supabase
              .from("vehicles")
              .select("total_trips")
              .eq("vehicle_number", data.vehicle_number)
              .single();

            if (vehiclesError) throw vehiclesError;
            if (vehiclesData) {
              console.log("Date", vehiclesData);
              setVehicleTrips(vehiclesData.total_trips || 0);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to load user data");
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

  function calculateRent(trips) {
    if (trips >= 11) {
      return 485;
    } else if (trips >= 10) {
      return 585;
    } else if (trips >= 8) {
      return 665;
    } else if (trips >= 5) {
      return 695;
    } else {
      return 765;
    }
  }

  // Calculate Rent
  useEffect(() => {
    if (!userData) return;

    const trips = Number(formData.total_trips);
    const rent = calculateRent(trips);
    const tollandEarnings =
      Number(formData.toll) + Number(formData.total_earnings);
    // const earnings = Number(formData.total_earnings) || 0;
    const cashcollect = Number(formData.total_cashcollect) || 0;
    const amount = tollandEarnings - cashcollect - rent;

    let message = "✅ No payment required";
    if (amount > 0) {
      message = `🚗 Tawaaq needs to pay ₹${Math.abs(amount).toFixed(2)}`;
    } else if (amount < 0) {
      message = `👨‍✈️ Driver needs to pay ₹${Math.abs(amount).toFixed(2)}`;
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
    userData,
  ]);
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

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

    // const submissionDate = new Date().toISOString();

    if (!userData) {
      toast.error("User data not available");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a rent date before submitting.");
      return;
    }

    setSubmitting(true);

    try {
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

      if (rentScreenshot) {
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

      // Insert the fleet report FIRST
      const { error: reportError } = await supabase
        .from("fleet_reports")
        .insert({
          user_id: userData.id,
          driver_name: userData.name,
          vehicle_number: userData.vehicle_number || "Not Assigned",
          total_trips: formData.total_trips,
          total_earnings: formData.total_earnings,
          shift: ["morning", "night"].includes(userData.shift)
            ? userData.shift
            : "morning",
          rent_date: selectedDate,
          toll: formData.toll,
          total_cashcollect: formData.total_cashcollect,
          rent_paid_amount:
            Number(formData.rent_paid) > 0
              ? -formData.rent_paid
              : Math.abs(Number(formData.rent_paid)),
          status: "pending_verification",
          remarks: formData.remarks,
          uber_screenshot: uberScreenshotUrl,
          payment_screenshot: rentScreenshotUrl,
          submission_date: formattedSubmissionDate,
        });

      if (reportError) throw reportError;

      // Now safely update totals (after insert success)
      const newTotalEarnings =
        Number(currentEarnings) + Number(formData.total_earnings);
      const newTotalTrips = Number(currentTrips) + Number(formData.total_trips);
      const newVehicleTrips = vehicleTrips + Number(formData.total_trips);

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ total_earning: newTotalEarnings, total_trip: newTotalTrips })
        .eq("id", userData.id);

      const { error: vehicleUpdateError } = await supabase
        .from("vehicles")
        .update({ total_trips: newVehicleTrips })
        .eq("vehicle_number", userData.vehicle_number);

      if (userUpdateError || vehicleUpdateError) {
        console.warn("Partial success:", userUpdateError || vehicleUpdateError);
        toast.error("Report saved but updating stats failed.");
      } else {
        toast.success("Daily report submitted successfully!");
        navigate("/profile");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Something went wrong. Please try again.");
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
        <h1 className="text-3xl font-bold text-fleet-purple mb-6">
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
                  className="bg-gray-100"
                />
              </div>
            </div>

            <WeeklyCalendar
              onDateSelect={handleDateSelect}
              requireSelection={true}
            />

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
            <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-md">
              <p className="text-sm font-medium">{paymentMessage}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

              <div>
                <Label htmlFor="payment_screenshot">Payment Screenshot</Label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                    {rentScreenshot
                      ? rentScreenshot.name
                      : "Upload Rent Screenshot"}
                    <input
                      id="payment_screenshot"
                      name="payment_screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "rent")}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubmitReport;
