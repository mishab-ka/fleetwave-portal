import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const getISTDateTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 16);
};

const AdminVehicleAudit = () => {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [auditDate, setAuditDate] = useState(getISTDateTime());
  const [issues, setIssues] = useState("");
  const [km, setKm] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [checks, setChecks] = useState({
    tires: false,
    stepney: false,
    body: false,
    engine: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("vehicle_number")
          .eq("online", true);

        if (error) throw error;
        setVehicles(data || []);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles.");
      }
    };

    fetchVehicles();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages([...images, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleNumber || !km) {
      toast.error("Please fill in all required fields before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const uploadedImages = [];

      for (const image of images) {
        const fileName = `audits/${Date.now()}_${image.name}`;
        const { data, error } = await supabase.storage
          .from("uploads")
          .upload(fileName, image);

        if (error) throw error;
        uploadedImages.push(fileName);
      }

      const { error } = await supabase.from("vehicle_audits").insert({
        vehicle_number: vehicleNumber,
        audit_date: auditDate,
        issues,
        km,
        checks,
        images: uploadedImages,
      });

      if (error) throw error;

      toast.success("Vehicle audit submitted successfully.");
      setVehicleNumber("");
      setIssues("");
      setKm("");
      setImages([]);
      setChecks({ tires: false, stepney: false, body: false, engine: false });
    } catch (error) {
      console.error("Error submitting vehicle audit:", error);
      toast.error("Failed to submit vehicle audit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Vehicle Auditing">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-fleet-purple mb-6">
          Vehicle Auditing
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-lg p-6"
        >
          <div className="mb-6">
            <Label htmlFor="vehicle_number">Vehicle Number</Label>
            <Select
              value={vehicleNumber}
              onValueChange={setVehicleNumber}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem
                    key={vehicle.vehicle_number}
                    value={vehicle.vehicle_number}
                  >
                    {vehicle.vehicle_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6">
            <Label htmlFor="audit_date">Audit Date</Label>
            <Input
              id="audit_date"
              type="datetime-local"
              value={auditDate}
              disabled
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="km">KM</Label>
            <Input
              id="km"
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Enter KM"
              required
            />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <Checkbox
                id="tires"
                checked={checks.tires}
                onCheckedChange={(checked) =>
                  setChecks((prev) => ({ ...prev, tires: !!checked }))
                }
              />
              <Label htmlFor="tires" className="ml-2">
                Tires (4)
              </Label>
            </div>
            <div>
              <Checkbox
                id="stepney"
                checked={checks.stepney}
                onCheckedChange={(checked) =>
                  setChecks((prev) => ({ ...prev, stepney: !!checked }))
                }
              />
              <Label htmlFor="stepney" className="ml-2">
                Stepney
              </Label>
            </div>
            <div>
              <Checkbox
                id="body"
                checked={checks.body}
                onCheckedChange={(checked) =>
                  setChecks((prev) => ({ ...prev, body: !!checked }))
                }
              />
              <Label htmlFor="body" className="ml-2">
                Body
              </Label>
            </div>
            <div>
              <Checkbox
                id="engine"
                checked={checks.engine}
                onCheckedChange={(checked) =>
                  setChecks((prev) => ({ ...prev, engine: !!checked }))
                }
              />
              <Label htmlFor="engine" className="ml-2">
                Engine
              </Label>
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="images">Upload Images</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="issues">Remarks</Label>
            <Textarea
              id="issues"
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              placeholder="Describe any issues or damages"
              rows={5}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Audit"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminVehicleAudit;
