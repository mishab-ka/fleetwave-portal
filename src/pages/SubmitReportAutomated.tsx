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
import {
  FileUp,
  Wand2,
  Eye,
  EyeOff,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Camera,
  Sparkles,
  Zap,
  ImageIcon,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import WeeklyCalendar from "@/components/ui/weeklycalander";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ExtractedData,
  ProcessingState,
  OCRConfig,
  DEFAULT_OCR_CONFIG,
  processImageWithTesseract,
  combineMultipleOCRResults,
  validateExtractedData,
  getConfidenceDescription,
  parseUberScreenshotText,
} from "@/utils/ocrUtils";

const SubmitReportAutomated = () => {
  const [totalTrips, setTotalTrips] = useState(0);
  const [vehicleTrips, setVehicleTrips] = useState<number>(0);
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [currentEarnings, setCurrentEarnings] = useState();
  const [currentTrips, setCurrentTrips] = useState();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [uberScreenshots, setUberScreenshots] = useState<File[]>([]);
  const [rentScreenshot, setRentScreenshot] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    status: "",
  });
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [showPreviews, setShowPreviews] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [isDataVerified, setIsDataVerified] = useState(false);
  const [ocrConfig, setOcrConfig] = useState<OCRConfig>(DEFAULT_OCR_CONFIG);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } | null>(null);
  const [ocrAttempts, setOcrAttempts] = useState(0);

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

  // Using enhanced OCR utility functions for comprehensive data extraction

  // Enhanced OCR implementation using utility functions
  const processImageWithOCR = async (imageFiles: File[]) => {
    setProcessingState({
      isProcessing: true,
      progress: 0,
      status: "Initializing OCR...",
    });

    try {
      // Create previews for all images
      const previews: string[] = [];
      for (const file of imageFiles) {
        const reader = new FileReader();
        const preview = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        previews.push(preview);
      }

      setPreviewImages(previews);
      setShowPreviews(true);

      // Use the enhanced OCR utility function
      const extractedResults = await processImageWithTesseract(
        imageFiles,
        ocrConfig,
        (progress, status) => {
          setProcessingState({
            isProcessing: true,
            progress,
            status,
          });
        }
      );

      setExtractedData(extractedResults);

      // Combine results from multiple images
      const bestResult = combineMultipleOCRResults(extractedResults);

      // Validate extracted data
      if (bestResult) {
        const validation = validateExtractedData(bestResult);
        setValidationResult(validation);
      }

      // Auto-fill ALL form fields with best result
      if (bestResult) {
        // Only update fields that have values
        const updates: any = {};
        if (bestResult.totalTrips) updates.total_trips = bestResult.totalTrips;
        if (bestResult.totalEarnings)
          updates.total_earnings = bestResult.totalEarnings;
        if (bestResult.toll) updates.toll = bestResult.toll;
        if (bestResult.cashCollected)
          updates.total_cashcollect = bestResult.cashCollected;

        setFormData((prev) => ({
          ...prev,
          ...updates,
        }));

        const confidencePercent = Math.round(bestResult.confidence * 100);
        const confidenceInfo = getConfidenceDescription(bestResult.confidence);
        const fieldsCount = bestResult.fieldsFound.length;
        const fieldsText = bestResult.fieldsFound.join(", ");

        console.log("📊 OCR Results:", {
          confidence: confidencePercent,
          fieldsFound: bestResult.fieldsFound,
          extractedData: {
            trips: bestResult.totalTrips,
            earnings: bestResult.totalEarnings,
            toll: bestResult.toll,
            cash: bestResult.cashCollected,
          },
          rawText: bestResult.rawText.substring(0, 500) + "...",
        });

        // Debug: Show what each image extracted
        extractedResults.forEach((result, index) => {
          console.log(`📱 Image ${index + 1} results:`, {
            trips: result.totalTrips,
            earnings: result.totalEarnings,
            toll: result.toll,
            cash: result.cashCollected,
            confidence: Math.round(result.confidence * 100) + "%",
            fieldsFound: result.fieldsFound,
          });
        });

        if (bestResult.confidence >= ocrConfig.confidenceThreshold / 100) {
          toast.success(
            `🎉 Auto-filled ${fieldsCount} fields (${fieldsText})! Confidence: ${confidencePercent}%`
          );
        } else {
          toast.warning(
            `⚠️ ${confidenceInfo.description} - Found: ${fieldsText} (${confidencePercent}%). Please verify data carefully.`
          );
        }

        // Show what was actually filled
        const filledFields = Object.keys(updates);
        if (filledFields.length > 0) {
          toast.info(`✅ Filled: ${filledFields.join(", ")}`);
        }

        // Show additional data found
        if (
          bestResult.onlineTime ||
          bestResult.distance ||
          bestResult.surge ||
          bestResult.tips
        ) {
          const additionalInfo = [];
          if (bestResult.onlineTime)
            additionalInfo.push(`${bestResult.onlineTime} hrs online`);
          if (bestResult.distance)
            additionalInfo.push(`${bestResult.distance} km driven`);
          if (bestResult.surge)
            additionalInfo.push(`₹${bestResult.surge} surge`);
          if (bestResult.tips) additionalInfo.push(`₹${bestResult.tips} tips`);

          toast.info(`📊 Additional data: ${additionalInfo.join(", ")}`);
        }
      } else {
        console.log("❌ No OCR result obtained");
        toast.error(
          "Could not extract reliable data from images. Please check image quality and try again or enter manually."
        );
      }

      setProcessingState({
        isProcessing: false,
        progress: 100,
        status: "Processing complete",
      });
    } catch (error) {
      console.error("OCR processing error:", error);
      toast.error(
        "Failed to process images. Please try again or enter data manually."
      );
      setProcessingState({
        isProcessing: false,
        progress: 0,
        status: "Processing failed",
      });
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
    if (e.target.files) {
      if (type === "uber") {
        const files = Array.from(e.target.files).slice(0, ocrConfig.maxImages); // Limit to maxImages
        setUberScreenshots(files);
        setOcrAttempts((prev) => prev + 1);

        if (files.length > 0) {
          // Automatically process the Uber screenshots with OCR
          await processImageWithOCR(files);
        }
      } else {
        setRentScreenshot(e.target.files[0]);
      }
    }
  };

  const removeImage = (index: number) => {
    const newScreenshots = uberScreenshots.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);

    setUberScreenshots(newScreenshots);
    setPreviewImages(newPreviews);

    // If no images left, clear extracted data
    if (newScreenshots.length === 0) {
      setExtractedData([]);
      setIsDataVerified(false);
      setFormData((prev) => ({
        ...prev,
        total_trips: "",
        total_earnings: "",
      }));
    }
  };

  const reprocessImages = async () => {
    if (uberScreenshots.length > 0) {
      setExtractedData([]);
      setIsDataVerified(false);
      setOcrAttempts((prev) => prev + 1);

      // Try with different OCR settings for better results
      const enhancedConfig = {
        ...ocrConfig,
        tesseractOptions: {
          ...ocrConfig.tesseractOptions,
          tessedit_pageseg_mode: ocrAttempts % 2 === 0 ? 6 : 3, // Alternate between modes
        },
      };

      setOcrConfig(enhancedConfig);
      toast.info(
        `🔄 Reprocessing with enhanced settings (Attempt ${ocrAttempts + 1})`
      );
      await processImageWithOCR(uberScreenshots);
    } else {
      toast.error("No images to reprocess");
    }
  };

  const handleVerifyData = () => {
    if (extractedData.length === 0) {
      toast.error("No extracted data to verify");
      return;
    }

    const bestResult = combineMultipleOCRResults(extractedData);
    if (
      bestResult &&
      bestResult.confidence < ocrConfig.confidenceThreshold / 100
    ) {
      toast.warning("Data has low confidence. Are you sure it's correct?");
    }

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

    if (extractedData.length > 0 && !isDataVerified) {
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

      let uberScreenshotUrls: string[] = [];
      let rentScreenshotUrl = null;

      // Upload multiple Uber screenshots
      if (uberScreenshots.length > 0) {
        const uploadPromises = uberScreenshots.map(
          async (screenshot, index) => {
            const fileName = `${
              user?.id
            }/reports/${Date.now()}_uber_screenshot_${
              index + 1
            }.${screenshot.name.split(".").pop()}`;
            const { data, error } = await supabase.storage
              .from("uploads")
              .upload(fileName, screenshot);
            if (error) throw error;
            return fileName;
          }
        );

        uberScreenshotUrls = await Promise.all(uploadPromises);
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

      // Get best OCR result for metadata
      const bestOCRResult =
        extractedData.length > 0
          ? combineMultipleOCRResults(extractedData)
          : null;

      // Insert the fleet report with enhanced OCR metadata
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
        uber_screenshot: uberScreenshotUrls.join(","), // Store multiple URLs
        payment_screenshot: rentScreenshotUrl,
        submission_date: formattedSubmissionDate,
        // Enhanced OCR metadata
        ocr_processed: extractedData.length > 0,
        ocr_confidence: bestOCRResult?.confidence || null,
        ocr_raw_text: bestOCRResult?.rawText || null,
        data_verified: isDataVerified,
        ocr_attempts: ocrAttempts,
        images_processed: uberScreenshots.length,
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

      toast.success(
        "Daily report submitted successfully with AI processing data!"
      );
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

  const bestResult =
    extractedData.length > 0 ? combineMultipleOCRResults(extractedData) : null;
  const hasLowConfidence =
    bestResult && bestResult.confidence < ocrConfig.confidenceThreshold / 100;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Wand2 className="h-8 w-8 text-fleet-purple" />
          <h1 className="text-3xl font-bold text-fleet-purple">
            Submit Daily Report - AI Automated
          </h1>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Tesseract OCR
          </Badge>
        </div>

        {/* OCR Settings */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Camera className="h-5 w-5" />
              AI Processing Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-blue-700">
                  Confidence Threshold
                </Label>
                <Input
                  type="range"
                  min="50"
                  max="95"
                  value={ocrConfig.confidenceThreshold}
                  onChange={(e) =>
                    setOcrConfig((prev) => ({
                      ...prev,
                      confidenceThreshold: Number(e.target.value),
                    }))
                  }
                  className="mt-1"
                />
                <p className="text-xs text-blue-600 mt-1">
                  {ocrConfig.confidenceThreshold}% minimum
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-blue-700">
                  Max Images
                </Label>
                <p className="text-lg font-semibold">
                  {ocrConfig.maxImages} images
                </p>
                <p className="text-xs text-blue-600">
                  Better accuracy with multiple screenshots
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-blue-700">
                  OCR Attempts
                </Label>
                <p className="text-lg font-semibold">{ocrAttempts}</p>
                {ocrAttempts > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={reprocessImages}
                    className="mt-1"
                    disabled={
                      processingState.isProcessing ||
                      uberScreenshots.length === 0
                    }
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reprocess
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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

            {/* Processing Progress */}
            {processingState.isProcessing && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">
                        {processingState.status}
                      </span>
                      <span className="text-sm text-blue-600">
                        {Math.round(processingState.progress)}%
                      </span>
                    </div>
                    <Progress
                      value={processingState.progress}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OCR Results */}
            {extractedData.length > 0 && (
              <Card
                className={`mb-6 ${
                  hasLowConfidence
                    ? "border-orange-200 bg-orange-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <CardHeader>
                  <CardTitle
                    className={`${
                      hasLowConfidence ? "text-orange-800" : "text-green-800"
                    } flex items-center gap-2`}
                  >
                    <Wand2 className="h-5 w-5" />
                    AI Extracted Data
                    {hasLowConfidence && (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasLowConfidence && (
                    <Alert className="mb-4 border-orange-300 bg-orange-100">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-orange-800">
                        Low confidence detected (
                        {Math.round((bestResult?.confidence || 0) * 100)}%).
                        Please verify the data carefully or try uploading
                        clearer screenshots.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Total Trips
                      </Label>
                      <p className="text-lg font-semibold">
                        {bestResult?.totalTrips || "Not found"}
                      </p>
                    </div>
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Total Earnings
                      </Label>
                      <p className="text-lg font-semibold">
                        {bestResult?.totalEarnings
                          ? `₹${bestResult.totalEarnings}`
                          : "Not found"}
                      </p>
                    </div>
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Toll/Fees
                      </Label>
                      <p className="text-lg font-semibold">
                        {bestResult?.toll ? `₹${bestResult.toll}` : "Not found"}
                      </p>
                    </div>
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Cash Collected
                      </Label>
                      <p className="text-lg font-semibold">
                        {bestResult?.cashCollected
                          ? `₹${bestResult.cashCollected}`
                          : "Not found"}
                      </p>
                    </div>
                  </div>

                  {/* Additional Fields Row */}
                  {(bestResult?.onlineTime ||
                    bestResult?.distance ||
                    bestResult?.surge ||
                    bestResult?.tips) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-blue-50 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium text-blue-700">
                          Online Time
                        </Label>
                        <p className="text-lg font-semibold">
                          {bestResult?.onlineTime
                            ? `${bestResult.onlineTime} hrs`
                            : "Not found"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-blue-700">
                          Distance
                        </Label>
                        <p className="text-lg font-semibold">
                          {bestResult?.distance
                            ? `${bestResult.distance} km`
                            : "Not found"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-blue-700">
                          Surge/Bonus
                        </Label>
                        <p className="text-lg font-semibold">
                          {bestResult?.surge
                            ? `₹${bestResult.surge}`
                            : "Not found"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-blue-700">
                          Tips
                        </Label>
                        <p className="text-lg font-semibold">
                          {bestResult?.tips
                            ? `₹${bestResult.tips}`
                            : "Not found"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Confidence
                      </Label>
                      <p className="text-lg font-semibold">
                        {Math.round((bestResult?.confidence || 0) * 100)}%
                      </p>
                    </div>
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Fields Found
                      </Label>
                      <p className="text-lg font-semibold">
                        {bestResult?.fieldsFound?.length || 0} fields
                      </p>
                    </div>
                    <div>
                      <Label
                        className={`text-sm font-medium ${
                          hasLowConfidence
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Images Processed
                      </Label>
                      <p className="text-lg font-semibold">
                        {extractedData.length}
                      </p>
                    </div>
                  </div>

                  {/* Data Validation */}
                  {validationResult && (
                    <div className="space-y-2 mt-4 p-4 bg-gray-50 rounded-lg border">
                      <Label className="text-sm font-medium">
                        🔍 Data Validation Results
                      </Label>
                      {validationResult.isValid ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">
                            All critical data looks good!
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {validationResult.issues.map((issue, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show warnings */}
                      {validationResult.warnings &&
                        validationResult.warnings.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {validationResult.warnings.map((warning, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 text-orange-600"
                              >
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">{warning}</span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {!isDataVerified && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleVerifyData}
                        className={
                          hasLowConfidence
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "bg-green-600 hover:bg-green-700"
                        }
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify Data
                      </Button>
                      <span className="text-sm text-orange-600">
                        Please verify the extracted data before submitting
                      </span>
                    </div>
                  )}

                  {isDataVerified && (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Data Verified
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Image Previews */}
            {previewImages.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Uploaded Screenshots ({previewImages.length})</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreviews(!showPreviews)}
                    >
                      {showPreviews ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {showPreviews ? "Hide" : "Show"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showPreviews && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {previewImages.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Uber Screenshot ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {extractedData[index] && (
                            <Badge
                              className={`absolute bottom-2 left-2 ${
                                extractedData[index].confidence >=
                                ocrConfig.confidenceThreshold / 100
                                  ? "bg-green-600"
                                  : "bg-orange-600"
                              } text-white`}
                            >
                              {Math.round(
                                extractedData[index].confidence * 100
                              )}
                              %
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
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
                    extractedData.length > 0
                      ? "border-green-300 bg-green-50"
                      : ""
                  }
                />
                {extractedData.length > 0 && (
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
                    extractedData.length > 0
                      ? "border-green-300 bg-green-50"
                      : ""
                  }
                />
                {extractedData.length > 0 && (
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
                <Label htmlFor="uber_screenshot">
                  Uber Screenshots (Max {ocrConfig.maxImages})
                </Label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    {processingState.isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                        {uberScreenshots.length > 0 ? (
                          <span className="text-green-600">
                            ✓ {uberScreenshots.length} image
                            {uberScreenshots.length > 1 ? "s" : ""} selected
                          </span>
                        ) : (
                          "Upload Uber Screenshots (AI will extract data)"
                        )}
                      </>
                    )}
                    <input
                      id="uber_screenshot"
                      name="uber_screenshot"
                      type="file"
                      multiple
                      required
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "uber")}
                      className="sr-only"
                      disabled={processingState.isProcessing}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload multiple screenshots for better accuracy. AI will
                  automatically extract trip and earnings data.
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
                disabled={submitting || processingState.isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  processingState.isProcessing ||
                  (extractedData.length > 0 && !isDataVerified)
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
