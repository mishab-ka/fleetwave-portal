
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Tables } from "@/integrations/supabase/types";
import { Upload, Loader2, CheckCircle } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  total_trips: z.string().min(1, { message: "Total trips is required" }).transform(val => parseInt(val, 10)),
  total_earnings: z.string().min(1, { message: "Total earnings is required" }).transform(val => parseFloat(val)),
  total_cashcollect: z.string().min(1, { message: "Total cash collection is required" }).transform(val => parseFloat(val)),
  rent_paid: z.string().min(1, { message: "Rent paid is required" }).transform(val => parseFloat(val)),
  remarks: z.string().optional()
});

const SubmitReport = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<Tables<"users"> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingUberScreenshot, setUploadingUberScreenshot] = useState(false);
  const [uploadingRentScreenshot, setUploadingRentScreenshot] = useState(false);
  const [uberScreenshotUrl, setUberScreenshotUrl] = useState<string | null>(null);
  const [rentScreenshotUrl, setRentScreenshotUrl] = useState<string | null>(null);

  // Set up the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      total_trips: "",
      total_earnings: "",
      total_cashcollect: "",
      rent_paid: "",
      remarks: ""
    }
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        setProfileData(data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    fileType: "uber_screenshot" | "rent_screenshot"
  ) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !user) {
        return;
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${fileType}_${Date.now()}.${fileExt}`;
      const filePath = `fleet_reports/${fileName}`;

      if (fileType === "uber_screenshot") {
        setUploadingUberScreenshot(true);
      } else {
        setUploadingRentScreenshot(true);
      }

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Set the URL based on file type
      if (fileType === "uber_screenshot") {
        setUberScreenshotUrl(publicUrlData.publicUrl);
      } else {
        setRentScreenshotUrl(publicUrlData.publicUrl);
      }

      toast.success(`${fileType === "uber_screenshot" ? "Uber" : "Rent"} screenshot uploaded successfully!`);
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      toast.error(`Failed to upload ${fileType === "uber_screenshot" ? "Uber" : "Rent"} screenshot`);
    } finally {
      if (fileType === "uber_screenshot") {
        setUploadingUberScreenshot(false);
      } else {
        setUploadingRentScreenshot(false);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!user || !profileData) {
        toast.error("User profile data is missing");
        return;
      }

      if (!profileData.vehicle_number) {
        toast.error("You don't have a vehicle assigned. Please contact support.");
        return;
      }

      setSubmitting(true);

      // Prepare data for submission
      const reportData = {
        user_id: user.id,
        vehicle_number: profileData.vehicle_number,
        driver_name: profileData.name,
        total_trips: values.total_trips,
        total_earnings: values.total_earnings,
        total_cashcollect: values.total_cashcollect,
        rent_paid: values.rent_paid,
        remarks: values.remarks || null,
        uber_screenshot: uberScreenshotUrl,
        rent_screenshot: rentScreenshotUrl,
      };

      // Submit the report
      const { error } = await supabase
        .from('fleet_reports')
        .insert(reportData);

      if (error) throw error;

      toast.success("Daily report submitted successfully!");
      navigate("/profile");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6 text-fleet-purple">Submit Daily Report</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Daily Earnings Report</CardTitle>
            <CardDescription>
              Submit your daily earnings and trip details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileData && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-500">Driver Name</p>
                  <p className="text-lg font-semibold">{profileData.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vehicle Number</p>
                  <p className="text-lg font-semibold">{profileData.vehicle_number || "Not Assigned"}</p>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="total_trips"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Trips</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter total trips" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="total_earnings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Earnings (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Enter total earnings" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="total_cashcollect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Cash Collection (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Enter cash collected" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rent_paid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Paid (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Enter rent paid" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional information or comments" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormLabel>Uber Screenshot</FormLabel>
                    <div className="mt-2">
                      {uberScreenshotUrl ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-600 font-medium">Uploaded</span>
                          <a 
                            href={uberScreenshotUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-fleet-purple hover:underline ml-2"
                          >
                            View Image
                          </a>
                        </div>
                      ) : (
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full bg-white hover:bg-gray-50 border-dashed"
                          disabled={uploadingUberScreenshot}
                          asChild
                        >
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, "uber_screenshot")}
                            />
                            {uploadingUberScreenshot ? (
                              <span className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Uber Screenshot
                              </span>
                            )}
                          </label>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel>Rent Payment Screenshot</FormLabel>
                    <div className="mt-2">
                      {rentScreenshotUrl ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-600 font-medium">Uploaded</span>
                          <a 
                            href={rentScreenshotUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-fleet-purple hover:underline ml-2"
                          >
                            View Image
                          </a>
                        </div>
                      ) : (
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full bg-white hover:bg-gray-50 border-dashed"
                          disabled={uploadingRentScreenshot}
                          asChild
                        >
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, "rent_screenshot")}
                            />
                            {uploadingRentScreenshot ? (
                              <span className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Rent Receipt
                              </span>
                            )}
                          </label>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              
                <CardFooter className="px-0 pt-6">
                  <Button 
                    type="submit" 
                    className="w-full bg-fleet-purple hover:bg-purple-700"
                    disabled={submitting || !profileData?.vehicle_number}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Daily Report"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default SubmitReport;
