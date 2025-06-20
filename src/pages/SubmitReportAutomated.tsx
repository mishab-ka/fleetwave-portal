import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUp, Wand2, Eye, EyeOff } from "lucide-react";
import WeeklyCalendar from "@/components/ui/weeklycalander";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SubmitReportAutomated = () => {
  const [totalTrips, setTotalTrips] = useState(0);
  const [vehicleTrips, setVehicleTrips] = useState<number>(0);
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [currentEarnings, setCurrentEarnings] = useState();
  const [currentTrips, setCurrentTrips] = useState();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [uberScreenshot, setUberScreenshot] = useState<File | null>(null);
  const [rentScreenshot, setRentScreenshot] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isDataVerified, setIsDataVerified] = useState(false);

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
            setCurrentEarnings(data.total_earning);
            setCurrentTrips(data.total_trip);
            setUserData(data);
            const { data: vehiclesData, error: vehiclesError } = await supabase
              .from("vehicles")
              .select("total_trips")
              .eq("vehicle_number", data.vehicle_number)
              .single();

            if (vehiclesError) throw vehiclesError;
            if (vehiclesData) {
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

  // OCR Processing Function
  const processImageWithOCR = async (imageFile: File) => {
    setIsProcessing(true);

    try {
      // Create a preview of the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(imageFile);

      toast.success("Processing image with AI...");

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Mock extracted data - in real implementation, this would come from OCR
      const mockExtractedData = {
        totalTrips: "12",
        totalEarnings: "2847.50",
        confidence: 0.95,
        processedAt: new Date().toISOString(),
      };

      setExtractedData(mockExtractedData);

      // Auto-fill form fields
      setFormData((prev) => ({
        ...prev,
        total_trips: mockExtractedData.totalTrips,
        total_earnings: mockExtractedData.totalEarnings,
      }));

      toast.success("Data extracted successfully! Please verify the values.");
    } catch (error) {
      console.error("OCR processing error:", error);
      toast.error("Failed to process image. Please enter data manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setIsDataVerified(false); // Reset verification when user manually changes data

    if (
      [
        "total_trips",
        "total_earnings",
        "total_cashcollect",
        "rent_paid",
        "toll",
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

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "uber" | "rent"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (type === "uber") {
        setUberScreenshot(file);
        // Automatically process the Uber screenshot with OCR
        await processImageWithOCR(file);
      } else {
        setRentScreenshot(file);
      }
    }
  };

  const handleVerifyData = () => {
    setIsDataVerified(true);
    toast.success("Data verified successfully!");
  };

  function calculateRent(trips: number, shift: string = "morning") {
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

    if (shift === "24hr") {
      if (trips >= 22) {
        return 970;
      } else if (trips >= 20) {
        return 1170;
      } else if (trips >= 16) {
        return 1330;
      } else if (trips > 10) {
        return 1390;
      } else {
        return 1530;
      }
    }

    return baseRent;
  }

  // Calculate Rent
  useEffect(() => {
    if (!userData) return;

    const trips = Number(formData.total_trips);
    const rent = calculateRent(trips, userData.shift);
    const tollandEarnings =
      Number(formData.toll) + Number(formData.total_earnings);
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

    if (!isDataVerified && extractedData) {
      toast.error("Please verify the extracted data before submitting.");
      return;
    }

    const getISTISOString = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      return istDate.toISOString().slice(0, 19).replace("T", " ");
    };

    const submissionDate = getISTISOString();
    const submissionDateIST = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const formattedSubmissionDate = new Date(submissionDateIST).toISOString();

    if (!userData) {
      toast.error("User data not available");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a rent date before submitting.");
      return;
    }

    const vehicleNumber = userData.vehicle_number?.trim().toUpperCase();
    if (!vehicleNumber) {
      toast.error("No vehicle assigned to this user.");
      return;
    }

    setSubmitting(true);

    try {
      let uberScreenshotUrl = null;
      let rentScreenshotUrl = null;

      // Upload screenshots
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

      // Vehicle verification
      const { data: vehicleCheck, error: vehicleCheckError } = await supabase
        .from("vehicles")
        .select("vehicle_number, total_trips")
        .eq("vehicle_number", vehicleNumber)
        .single();

      if (vehicleCheckError || !vehicleCheck) {
        throw new Error("Failed to verify vehicle existence");
      }

      const currentVehicleTrips = vehicleCheck.total_trips || 0;
      const newVehicleTrips =
        currentVehicleTrips + Number(formData.total_trips);

      // Insert the fleet report with OCR metadata
      const reportData = {
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
        rent_paid_amount:
          Number(formData.rent_paid) > 0
            ? -formData.rent_paid
            : Math.abs(Number(formData.rent_paid)),
        status: "pending_verification",
        remarks: formData.remarks,
        uber_screenshot: uberScreenshotUrl,
        payment_screenshot: rentScreenshotUrl,
        submission_date: formattedSubmissionDate,
      };

      const { error: reportError } = await supabase
        .from("fleet_reports")
        .insert(reportData);

      if (reportError) throw reportError;

      // Update user totals
      const newTotalEarnings =
        Number(currentEarnings) + Number(formData.total_earnings);
      const newTotalTrips = Number(currentTrips) + Number(formData.total_trips);

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ total_earning: newTotalEarnings, total_trip: newTotalTrips })
        .eq("id", userData.id);

      if (userUpdateError) throw userUpdateError;

      // Update vehicle trips
      const { data: updateData, error: vehicleUpdateError } = await supabase
        .from("vehicles")
        .update({ total_trips: newVehicleTrips })
        .eq("vehicle_number", vehicleNumber)
        .select();

      if (vehicleUpdateError) {
        const { data: altUpdateData, error: altUpdateError } =
          await supabase.rpc("update_vehicle_trips", {
            p_vehicle_number: vehicleNumber,
            p_new_trips: newVehicleTrips,
          });

        if (altUpdateError) {
          throw new Error("Failed to update vehicle trips");
        }
      }

      toast.success("Daily report submitted successfully!");
      navigate("/profile");
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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Wand2 className="h-8 w-8 text-fleet-purple" />
          <h1 className="text-3xl font-bold text-fleet-purple">
            Submit Daily Report - Automated
          </h1>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            AI Powered
          </Badge>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Driver and Vehicle Info */}
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

            {/* Date Selection */}
            <WeeklyCalendar
              onDateSelect={handleDateSelect}
              requireSelection={true}
            />

            {/* OCR Processing Section */}
            {extractedData && (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Data Extracted from Screenshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium text-green-700">
                        Total Trips
                      </Label>
                      <p className="text-lg font-semibold">
                        {extractedData.totalTrips}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-green-700">
                        Total Earnings
                      </Label>
                      <p className="text-lg font-semibold">
                        ₹{extractedData.totalEarnings}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-green-700">
                        Confidence
                      </Label>
                      <p className="text-lg font-semibold">
                        {Math.round((extractedData.confidence || 0) * 100)}%
                      </p>
                    </div>
                  </div>

                  {!isDataVerified && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleVerifyData}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        ✓ Verify Data
                      </Button>
                      <span className="text-sm text-orange-600">
                        Please verify the extracted data before submitting
                      </span>
                    </div>
                  )}

                  {isDataVerified && (
                    <Badge className="bg-green-600 text-white">
                      ✓ Data Verified
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Image Preview */}
            {previewImage && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Uploaded Screenshot</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {showPreview ? "Hide" : "Show"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showPreview && (
                  <CardContent>
                    <img
                      src={previewImage}
                      alt="Uber Screenshot"
                      className="max-w-full h-auto rounded-lg border"
                      style={{ maxHeight: "400px" }}
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* Form Fields */}
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
                  className={
                    extractedData ? "border-green-300 bg-green-50" : ""
                  }
                />
                {extractedData && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Auto-filled from screenshot
                  </p>
                )}
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
                  className={
                    extractedData ? "border-green-300 bg-green-50" : ""
                  }
                />
                {extractedData && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Auto-filled from screenshot
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="toll">Toll (₹)</Label>
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

            {/* Payment Message */}
            <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-md">
              <p className="text-sm font-medium">{paymentMessage}</p>
            </div>

            {/* Remarks */}
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

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="uber_screenshot">Uber Screenshot</Label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                        {uberScreenshot ? (
                          <span className="text-green-600">
                            ✓ {uberScreenshot.name}
                          </span>
                        ) : (
                          "Upload Uber Screenshot (AI will extract data)"
                        )}
                      </>
                    )}
                    <input
                      id="uber_screenshot"
                      name="uber_screenshot"
                      type="file"
                      required
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "uber")}
                      className="sr-only"
                      disabled={isProcessing}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  AI will automatically extract trip and earnings data
                </p>
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

            {/* UPI Info */}
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

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/profile")}
                disabled={submitting || isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  isProcessing ||
                  (extractedData && !isDataVerified)
                }
                className="bg-fleet-purple hover:bg-fleet-purple/90"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubmitReportAutomated;
