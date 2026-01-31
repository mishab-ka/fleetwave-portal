import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Search } from "lucide-react";
import { DriverSearchBar } from "@/components/admin/adjustments/DriverSearchBar";
import { Driver } from "@/hooks/useDriverSearch";

interface Vehicle {
  id: string;
  vehicle_number: string;
  online: boolean;
}

const SubmitAccidentReport = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    shift: "",
    description: "",
    place: "",
    status: "",
    penalty_amount: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast.error("You need to be logged in to access this page.");
      navigate("/");
      return;
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

  // Fetch active vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("id, vehicle_number, online")
          .eq("online", true)
          .order("vehicle_number");

        if (error) throw error;
        setVehicles(data || []);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles");
      }
    };

    fetchVehicles();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleVehicleSelect = (vehicleNumber: string) => {
    const vehicle = vehicles.find((v) => v.vehicle_number === vehicleNumber);
    setSelectedVehicle(vehicle || null);
  };

  const handleDriverSelect = (driver: Driver) => {
    setSelectedDriver(driver);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData) {
      toast.error("User data not available");
      return;
    }

    // Validate required fields
    if (!selectedVehicle) {
      toast.error("Please select a vehicle");
      return;
    }

    if (!formData.shift) {
      toast.error("Please select a shift");
      return;
    }

    if (!selectedDriver) {
      toast.error("Please select a driver");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!formData.place.trim()) {
      toast.error("Please enter the place");
      return;
    }

    if (!formData.status) {
      toast.error("Please select a status");
      return;
    }

    // Validate penalty amount if provided
    const penaltyAmount = formData.penalty_amount
      ? parseFloat(formData.penalty_amount)
      : 0;
    if (formData.penalty_amount && (isNaN(penaltyAmount) || penaltyAmount < 0)) {
      toast.error("Please enter a valid penalty amount");
      return;
    }

    setSubmitting(true);

    try {
      const submissionDate = new Date().toISOString();

      // Insert the accident report
      const reportData = {
        user_id: userData.id,
        submitted_by_name: userData.name || "Unknown",
        vehicle_id: selectedVehicle.id,
        vehicle_number: selectedVehicle.vehicle_number,
        shift: formData.shift,
        driver_id: selectedDriver.id,
        driver_name: selectedDriver.name,
        description: formData.description.trim(),
        place: formData.place.trim(),
        status: formData.status,
        penalty_amount: penaltyAmount,
        verification_status: "pending_verification",
        submission_date: submissionDate,
      };

      const { error: reportError } = await supabase
        .from("accident_reports")
        .insert(reportData);

      if (reportError) throw reportError;

      toast.success("Accident report submitted successfully!");
      
      // Reset form
      setSelectedVehicle(null);
      setSelectedDriver(null);
      setFormData({
        shift: "",
        description: "",
        place: "",
        status: "",
        penalty_amount: "",
      });

      // Navigate to accident reports page
      navigate("/admin/accident-reports");
    } catch (error: any) {
      console.error("Error submitting accident report:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !userData) {
    return (
      <AdminLayout title="Submit Accident Report">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Submit Accident Report">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-fleet-purple" />
          <h1 className="text-2xl font-bold text-fleet-purple">
            Accident Submission Report
          </h1>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Submitted By (Read-only) */}
            <div>
              <Label htmlFor="submitted_by">Submitted By</Label>
              <Input
                id="submitted_by"
                value={userData.name || ""}
                disabled
                className="bg-gray-100"
              />
            </div>

            {/* Active Vehicle - Searchable Dropdown */}
            <div>
              <Label htmlFor="vehicle">
                Active Vehicle <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    type="button"
                  >
                    {selectedVehicle
                      ? selectedVehicle.vehicle_number
                      : "Search vehicle..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-full" align="start">
                  <Command>
                    <CommandInput placeholder="Search vehicle number..." />
                    <CommandList>
                      <CommandEmpty>No vehicle found.</CommandEmpty>
                      <CommandGroup>
                        {vehicles.map((vehicle) => (
                          <CommandItem
                            key={vehicle.id}
                            value={vehicle.vehicle_number}
                            onSelect={() => handleVehicleSelect(vehicle.vehicle_number)}
                          >
                            {vehicle.vehicle_number}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Shift */}
            <div>
              <Label htmlFor="shift">
                Shift <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.shift}
                onValueChange={(value) => handleSelectChange("shift", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                  <SelectItem value="24 Hours">24 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Driver Name - Searchable Dropdown */}
            <div>
              <Label htmlFor="driver">
                Driver Name <span className="text-red-500">*</span>
              </Label>
              <DriverSearchBar
                onSelectDriver={handleDriverSelect}
                placeholder="Search driver by name, vehicle, or phone..."
              />
              {selectedDriver && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    Selected: <span className="font-medium">{selectedDriver.name}</span>
                    {selectedDriver.vehicle_number && (
                      <span className="text-gray-500 ml-2">
                        ({selectedDriver.vehicle_number})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter accident description..."
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                required
              />
            </div>

            {/* Place */}
            <div>
              <Label htmlFor="place">
                Place <span className="text-red-500">*</span>
              </Label>
              <Input
                id="place"
                name="place"
                type="text"
                placeholder="Enter accident location"
                value={formData.place}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Not Running Condition">
                    Not Running Condition
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Penalty Amount */}
            <div>
              <Label htmlFor="penalty_amount">
                Penalty Amount (₹)
              </Label>
              <Input
                id="penalty_amount"
                name="penalty_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter penalty amount (optional)"
                value={formData.penalty_amount}
                onChange={handleInputChange}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/vehicles")}
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
      </div>
    </AdminLayout>
  );
};

export default SubmitAccidentReport;

