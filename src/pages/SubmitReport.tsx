
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
import { FileUp } from "lucide-react";

const SubmitReport = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [uberScreenshot, setUberScreenshot] = useState<File | null>(null);
  const [rentScreenshot, setRentScreenshot] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    total_trips: 0,
    total_earnings: 0,
    total_cashcollect: 0,
    rent_paid: 0,
    remarks: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // For number inputs, convert string to number
    if (["total_trips", "total_earnings", "total_cashcollect", "rent_paid"].includes(name)) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "uber" | "rent") => {
    if (e.target.files && e.target.files[0]) {
      if (type === "uber") {
        setUberScreenshot(e.target.files[0]);
      } else {
        setRentScreenshot(e.target.files[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) {
      toast.error("User data not available");
      return;
    }
    
    setSubmitting(true);
    
    try {
      let uberScreenshotUrl = null;
      let rentScreenshotUrl = null;
      
      // Upload uber screenshot if provided
      if (uberScreenshot) {
        const fileName = `${user?.id}/reports/${Date.now()}_uber_screenshot.${uberScreenshot.name.split('.').pop()}`;
        const { data: uberData, error: uberError } = await supabase.storage
          .from("uploads")
          .upload(fileName, uberScreenshot);
          
        if (uberError) throw uberError;
        uberScreenshotUrl = fileName;
      }
      
      // Upload rent screenshot if provided
      if (rentScreenshot) {
        const fileName = `${user?.id}/reports/${Date.now()}_rent_screenshot.${rentScreenshot.name.split('.').pop()}`;
        const { data: rentData, error: rentError } = await supabase.storage
          .from("uploads")
          .upload(fileName, rentScreenshot);
          
        if (rentError) throw rentError;
        rentScreenshotUrl = fileName;
      }
      
      // Create report record
      const { data, error } = await supabase.from("fleet_reports").insert({
        user_id: user?.id,
        driver_name: userData.name,
        vehicle_number: userData.vehicle_number || "Not Assigned",
        total_trips: formData.total_trips,
        total_earnings: formData.total_earnings,
        total_cashcollect: formData.total_cashcollect,
        rent_paid: formData.rent_paid,
        remarks: formData.remarks,
        uber_screenshot: uberScreenshotUrl,
        rent_screenshot: rentScreenshotUrl,
      });
      
      if (error) throw error;
      
      toast.success("Daily report submitted successfully!");
      navigate("/profile");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
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
        <h1 className="text-3xl font-bold text-fleet-purple mb-6">Submit Daily Report</h1>
        
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="total_trips">Total Trips</Label>
                <Input
                  id="total_trips"
                  name="total_trips"
                  type="number"
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
                  type="number"
                  placeholder="Enter total earnings"
                  value={formData.total_earnings}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="total_cashcollect">Total Cash Collected (₹)</Label>
                <Input
                  id="total_cashcollect"
                  name="total_cashcollect"
                  type="number"
                  placeholder="Enter cash collected"
                  value={formData.total_cashcollect}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="rent_paid">Rent Paid (₹)</Label>
                <Input
                  id="rent_paid"
                  name="rent_paid"
                  type="number"
                  placeholder="Enter rent paid"
                  value={formData.rent_paid}
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="uber_screenshot">Uber Screenshot</Label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                    {uberScreenshot ? uberScreenshot.name : "Upload Uber Screenshot"}
                    <input
                      id="uber_screenshot"
                      name="uber_screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "uber")}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="rent_screenshot">Rent Screenshot</Label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <FileUp className="mr-2 h-5 w-5 text-gray-400" />
                    {rentScreenshot ? rentScreenshot.name : "Upload Rent Screenshot"}
                    <input
                      id="rent_screenshot"
                      name="rent_screenshot"
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
              <Button 
                type="submit"
                disabled={submitting}
              >
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
