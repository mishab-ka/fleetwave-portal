import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type VehicleStatus = "running" | "stopped" | "breakdown" | "leave";

interface VehicleStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: VehicleStatus, notes: string) => void;
  vehicleNumber: string;
  date: string;
  currentStatus?: VehicleStatus;
  currentNotes?: string;
}

const VehicleStatusModal = ({
  isOpen,
  onClose,
  onSubmit,
  vehicleNumber,
  date,
  currentStatus = "running",
  currentNotes = "",
}: VehicleStatusModalProps) => {
  const [status, setStatus] = React.useState<VehicleStatus>(currentStatus);
  const [notes, setNotes] = React.useState(currentNotes);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset state when modal opens with new values
  React.useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setNotes(currentNotes);
      setIsSubmitting(false);
    }
  }, [isOpen, currentStatus, currentNotes]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(status, notes);
    } catch (error) {
      console.error("Error submitting status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStatus(currentStatus);
    setNotes(currentNotes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Vehicle Status - {vehicleNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} disabled />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as VehicleStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleStatusModal;
