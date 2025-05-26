import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationFormData } from "@/types/hr";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface DriverApplicationFormProps {
  hiringCycleId: string;
  onSubmitSuccess?: () => void;
}

export default function DriverApplicationForm({
  hiringCycleId,
  onSubmitSuccess,
}: DriverApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    experience_years: 0,
    vehicle_type: "",
    joining_date: "",
    additional_info: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if email already exists in current cycle
      const { data: existingApplication, error: checkError } = await supabase
        .from("applicants")
        .select("id")
        .eq("hiring_cycle_id", hiringCycleId)
        .eq("email", formData.email)
        .single();

      if (existingApplication) {
        toast.error("You have already applied for this hiring cycle");
        return;
      }

      const { error } = await supabase.from("applicants").insert([
        {
          ...formData,
          hiring_cycle_id: hiringCycleId,
        },
      ]);

      if (error) throw error;

      toast.success("Application submitted successfully");
      onSubmitSuccess?.();

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        location: "",
        experience_years: 0,
        vehicle_type: "",
        joining_date: "",
        additional_info: "",
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <Input
            required
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            required
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <Input
            required
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="Enter your phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <Input
            required
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="Enter your location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Years of Experience
          </label>
          <Input
            required
            type="number"
            min="0"
            value={formData.experience_years}
            onChange={(e) =>
              setFormData({
                ...formData,
                experience_years: parseInt(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Vehicle Type</label>
          <Select
            value={formData.vehicle_type}
            onValueChange={(value) =>
              setFormData({ ...formData, vehicle_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedan">Sedan</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="van">Van</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Preferred Joining Date
          </label>
          <Input
            type="date"
            value={formData.joining_date}
            onChange={(e) =>
              setFormData({ ...formData, joining_date: e.target.value })
            }
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Additional Information
          </label>
          <Textarea
            value={formData.additional_info}
            onChange={(e) =>
              setFormData({ ...formData, additional_info: e.target.value })
            }
            placeholder="Any additional information you'd like to share"
            rows={4}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-fleet-purple"
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
