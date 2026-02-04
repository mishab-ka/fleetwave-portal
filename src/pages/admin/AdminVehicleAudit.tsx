import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CarFront,
  Car,
  ArrowLeftRight,
  ArrowRightLeft,
  Cog,
  Music2,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUDIT_IMAGE_KEYS = [
  { key: "front", label: "1. Front", icon: CarFront },
  { key: "right", label: "2. Right Side", icon: ArrowRightLeft },
  { key: "left", label: "3. Left Side", icon: ArrowLeftRight },
  { key: "back", label: "4. Back Side", icon: Car },
  { key: "bonnet", label: "5. Bonnet", icon: Cog },
  { key: "music_system", label: "6. Music System", icon: Music2 },
] as const;

type AuditImageKey = (typeof AUDIT_IMAGE_KEYS)[number]["key"];

const getISTDateTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 16);
};

interface VehicleOption {
  vehicle_number: string;
  online: boolean;
}

const AdminVehicleAudit = () => {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);
  const [auditDate, setAuditDate] = useState(getISTDateTime());
  const [issues, setIssues] = useState("");
  const [km, setKm] = useState("");
  const [auditImages, setAuditImages] = useState<
    Record<AuditImageKey, File | null>
  >({
    front: null,
    right: null,
    left: null,
    back: null,
    bonnet: null,
    music_system: null,
  });
  const [checks, setChecks] = useState<{
    tires: boolean | null;
    stepney: boolean | null;
    body: boolean | null;
    engine: boolean | null;
  }>({
    tires: null,
    stepney: null,
    body: null,
    engine: null,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("vehicle_number, online")
          .order("vehicle_number");

        if (error) throw error;
        setVehicles((data as VehicleOption[]) || []);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles.");
      }
    };

    fetchVehicles();
  }, []);

  const handleImageChange = (key: AuditImageKey, file: File | null) => {
    setAuditImages((prev) => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleNumber) {
      toast.error("Please select a vehicle.");
      return;
    }
    if (!km || km.trim() === "") {
      toast.error("Please enter KM.");
      return;
    }

    const unselectedItems = (
      ["tires", "stepney", "body", "engine"] as const
    ).filter((k) => checks[k] === null);
    if (unselectedItems.length > 0) {
      const labels = {
        tires: "Tires",
        stepney: "Stepney",
        body: "Body",
        engine: "Engine",
      };
      toast.error(
        `Please select Yes or No for: ${unselectedItems
          .map((k) => labels[k])
          .join(", ")}`
      );
      return;
    }

    const missingImages = AUDIT_IMAGE_KEYS.filter(
      ({ key }) => !auditImages[key]
    );
    if (missingImages.length > 0) {
      toast.error(
        `Please upload all 6 required images: ${missingImages
          .map((m) => m.label)
          .join(", ")}`
      );
      return;
    }

    setSubmitting(true);

    try {
      const imagePaths: string[] = [];
      const basePrefix = `audits/${Date.now()}`;

      for (const { key } of AUDIT_IMAGE_KEYS) {
        const file = auditImages[key];
        if (!file) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${basePrefix}_${key}.${ext}`;
        const { error } = await supabase.storage
          .from("uploads")
          .upload(fileName, file);

        if (error) throw error;
        imagePaths.push(fileName);
      }

      const { error } = await supabase.from("vehicle_audits").insert({
        vehicle_number: vehicleNumber,
        audit_date: auditDate,
        issues,
        km,
        checks: {
          tires: checks.tires ?? false,
          stepney: checks.stepney ?? false,
          body: checks.body ?? false,
          engine: checks.engine ?? false,
        },
        images: imagePaths,
      });

      if (error) throw error;

      toast.success("Vehicle audit submitted successfully.");
      setVehicleNumber("");
      setIssues("");
      setKm("");
      setAuditImages({
        front: null,
        right: null,
        left: null,
        back: null,
        bonnet: null,
        music_system: null,
      });
      setChecks({ tires: null, stepney: null, body: null, engine: null });
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
            <Label htmlFor="vehicle_number">
              Vehicle Number <span className="text-red-500">*</span>
            </Label>
            <Popover
              open={vehicleSearchOpen}
              onOpenChange={setVehicleSearchOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={vehicleSearchOpen}
                  className="w-full justify-between font-normal"
                  type="button"
                >
                  {vehicleNumber ? (
                    <span className="flex items-center gap-2">
                      {vehicleNumber}
                      {(() => {
                        const v = vehicles.find(
                          (x) => x.vehicle_number === vehicleNumber
                        );
                        return v ? (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              v.online
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {v.online ? "Active" : "Inactive"}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  ) : (
                    "Search and select vehicle..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search vehicle number..." />
                  <CommandList>
                    <CommandEmpty>No vehicle found.</CommandEmpty>
                    <CommandGroup>
                      {vehicles.map((vehicle) => (
                        <CommandItem
                          key={vehicle.vehicle_number}
                          value={vehicle.vehicle_number}
                          onSelect={() => {
                            setVehicleNumber(vehicle.vehicle_number);
                            setVehicleSearchOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          {vehicle.vehicle_number}
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded ml-2",
                              vehicle.online
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {vehicle.online ? "Active" : "Inactive"}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="mb-6">
            <Label htmlFor="audit_date">
              Audit Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="audit_date"
              type="datetime-local"
              value={auditDate}
              disabled
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="km">
              KM <span className="text-red-500">*</span>
            </Label>
            <Input
              id="km"
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Enter KM"
              required
            />
          </div>

          <div className="mb-6">
            <Label className="block mb-3">
              Checks <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select Yes or No for each item. All 4 are required.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { key: "tires", label: "Tires (4)" },
                  { key: "stepney", label: "Stepney" },
                  { key: "body", label: "Body" },
                  { key: "engine", label: "Engine" },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <Label className="font-medium">{label}</Label>
                  <RadioGroup
                    value={
                      checks[key] === null ? "" : checks[key] ? "yes" : "no"
                    }
                    onValueChange={(v) =>
                      setChecks((prev) => ({
                        ...prev,
                        [key]: v === "yes" ? true : v === "no" ? false : null,
                      }))
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`${key}-yes`} />
                      <Label
                        htmlFor={`${key}-yes`}
                        className="font-normal cursor-pointer text-green-700"
                      >
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`${key}-no`} />
                      <Label
                        htmlFor={`${key}-no`}
                        className="font-normal cursor-pointer text-red-700"
                      >
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <Label className="block mb-3">
              Audit Images <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Upload one image for each view. All 6 images are required to
              submit the audit.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AUDIT_IMAGE_KEYS.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="border rounded-lg p-4 space-y-2 bg-gray-50/50"
                >
                  <Label className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-fleet-purple" />
                    {label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`image-${key}`}
                      type="file"
                      accept="image/*"
                      className="flex-1"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleImageChange(key, file || null);
                      }}
                    />
                    {auditImages[key] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          handleImageChange(key, null);
                          const input = document.getElementById(
                            `image-${key}`
                          ) as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {auditImages[key] && (
                    <p className="text-xs text-green-600 truncate">
                      ✓ {auditImages[key]?.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="issues">Remarks (Optional)</Label>
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
