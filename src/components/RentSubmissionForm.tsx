import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  submitRentPayment,
  submitRentForApproval,
} from "@/lib/rentProcessingAPI";
import { useAuth } from "@/context/AuthContext";

interface RentSubmissionFormProps {
  onSuccess?: () => void;
}

export const RentSubmissionForm: React.FC<RentSubmissionFormProps> = ({
  onSuccess,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    rent_date: new Date().toISOString().split("T")[0], // Today's date
    amount_collected: "",
    standard_rent: "600",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    if (
      !formData.amount_collected ||
      parseFloat(formData.amount_collected) <= 0
    ) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // Option 1: Direct processing (immediate extra collection transaction)
      const result = await submitRentPayment({
        user_id: user.id,
        rent_date: formData.rent_date,
        amount_collected: parseFloat(formData.amount_collected),
        standard_rent: parseFloat(formData.standard_rent),
        notes: formData.notes,
      });

      if (result.success) {
        if (result.extra_collection_added) {
          toast.success(
            `Rent processed successfully! Extra collection of ₹${result.extra_amount} has been added to your transactions.`
          );
        } else {
          toast.success("Rent processed successfully!");
        }

        // Reset form
        setFormData({
          rent_date: new Date().toISOString().split("T")[0],
          amount_collected: "",
          standard_rent: "600",
          notes: "",
        });

        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error submitting rent:", error);
      toast.error("Failed to submit rent payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    if (
      !formData.amount_collected ||
      parseFloat(formData.amount_collected) <= 0
    ) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // Option 2: Submit for admin approval (extra collection will be processed when approved)
      await submitRentForApproval({
        user_id: user.id,
        rent_date: formData.rent_date,
        amount_collected: parseFloat(formData.amount_collected),
        standard_rent: parseFloat(formData.standard_rent),
        notes: formData.notes,
      });

      toast.success("Rent submitted for admin approval!");

      // Reset form
      setFormData({
        rent_date: new Date().toISOString().split("T")[0],
        amount_collected: "",
        standard_rent: "600",
        notes: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting rent for approval:", error);
      toast.error("Failed to submit rent for approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  const extraAmount =
    parseFloat(formData.amount_collected) - parseFloat(formData.standard_rent);
  const isAfterSept15 = new Date(formData.rent_date) >= new Date("2024-09-15");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Submit Rent Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rent_date">Rent Date</Label>
            <Input
              id="rent_date"
              type="date"
              value={formData.rent_date}
              onChange={(e) =>
                setFormData({ ...formData, rent_date: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="standard_rent">Standard Rent (₹)</Label>
            <Input
              id="standard_rent"
              type="number"
              value={formData.standard_rent}
              onChange={(e) =>
                setFormData({ ...formData, standard_rent: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount_collected">Amount Collected (₹)</Label>
            <Input
              id="amount_collected"
              type="number"
              value={formData.amount_collected}
              onChange={(e) =>
                setFormData({ ...formData, amount_collected: e.target.value })
              }
              placeholder="Enter amount collected"
              required
            />
          </div>

          {extraAmount > 0 && isAfterSept15 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-purple-800">
                <strong>Extra Collection:</strong> ₹{extraAmount.toFixed(2)}{" "}
                will be automatically added as a transaction.
              </p>
            </div>
          )}

          {extraAmount > 0 && !isAfterSept15 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">
                Extra collection will not be processed (before Sept 15th, 2024).
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional notes"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Processing..." : "Submit & Process"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSubmitForApproval}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};










