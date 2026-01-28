import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, DollarSign, Gift, AlertCircle, RefreshCw, Receipt, Wrench } from "lucide-react";
import { DriverSearchBar } from "./DriverSearchBar";
import { Driver } from "@/hooks/useDriverSearch";
import { useAuth } from "@/context/AuthContext";
import { useAdjustments } from "@/hooks/useAdjustments";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface AdjustmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "service_day", label: "Service Day", icon: Wrench, color: "text-purple-600", description: "₹300 discount (default)" },
  { value: "custom", label: "Custom", icon: DollarSign, color: "text-gray-600", description: "Any custom amount" },
];

export const AdjustmentForm: React.FC<AdjustmentFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { createAdjustment, loading } = useAdjustments();
  const { logActivity } = useActivityLogger();

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [adjustmentDate, setAdjustmentDate] = useState<Date>();
  const [category, setCategory] = useState<string>("custom");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedDriver(null);
      setAdjustmentDate(undefined);
      setCategory("custom");
      setAmount("");
      setDescription("");
    }
  }, [open]);

  // Set default amount for service_day
  useEffect(() => {
    if (category === "service_day" && !amount) {
      setAmount("-300");
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!selectedDriver || !adjustmentDate || !amount || !description || !user) {
      return;
    }

    setSubmitting(true);

    try {
      await createAdjustment({
        user_id: selectedDriver.id,
        driver_name: selectedDriver.name,
        vehicle_number: selectedDriver.vehicle_number,
        adjustment_date: format(adjustmentDate, "yyyy-MM-dd"),
        category: category,
        amount: parseFloat(amount),
        description: description,
        created_by: user.id,
      });

      // Log activity
      await logActivity({
        actionType: "other",
        actionCategory: "reports",
        description: `Created ${category} adjustment for driver ${selectedDriver.name} (${selectedDriver.vehicle_number}) - Amount: ₹${amount} - Date: ${format(adjustmentDate, "yyyy-MM-dd")}`,
        metadata: {
          driver_id: selectedDriver.id,
          driver_name: selectedDriver.name,
          vehicle_number: selectedDriver.vehicle_number,
          adjustment_date: format(adjustmentDate, "yyyy-MM-dd"),
          category: category,
          amount: parseFloat(amount),
          description: description,
        },
        pageName: "Common Adjustments",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating adjustment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = CATEGORY_OPTIONS.find((opt) => opt.value === category);
  const CategoryIcon = selectedCategory?.icon || DollarSign;

  const calculateImpact = () => {
    const amountValue = parseFloat(amount) || 0;
    
    if (amountValue === 0) return null;

    if (amountValue < 0) {
      return {
        type: "discount",
        text: `Driver will receive ₹${Math.abs(amountValue)} discount on rent`,
        color: "text-green-600 bg-green-50",
      };
    } else {
      return {
        type: "charge",
        text: `₹${amountValue} will be added to other expenses`,
        color: "text-red-600 bg-red-50",
      };
    }
  };

  const impact = calculateImpact();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Adjustment</DialogTitle>
          <DialogDescription>
            Create a custom adjustment for a driver. The adjustment will be auto-approved and reflected immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Driver Selection */}
          <div className="space-y-2">
            <Label>Select Driver *</Label>
            <DriverSearchBar
              onSelectDriver={setSelectedDriver}
              placeholder="Search driver by name, vehicle, or phone..."
            />
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Adjustment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !adjustmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {adjustmentDate ? format(adjustmentDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={adjustmentDate}
                  onSelect={setAdjustmentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", option.color)} />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <CategoryIcon className={cn("h-5 w-5", selectedCategory.color)} />
                <div className="text-sm text-gray-700">
                  {selectedCategory.description}
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-gray-500">
              Use negative values for discounts (e.g., -300 for ₹300 discount)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Enter reason or notes for this adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Impact Preview */}
          {impact && (
            <div className={cn("p-4 rounded-lg border-2", impact.color)}>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Impact Preview</p>
                  <p className="text-sm">{impact.text}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedDriver ||
              !adjustmentDate ||
              !amount ||
              !description ||
              submitting
            }
          >
            {submitting ? "Creating..." : "Create Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
