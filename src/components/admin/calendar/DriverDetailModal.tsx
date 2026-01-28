import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportData, RentStatus } from "./CalendarUtils";
import { RentStatusBadge } from "@/components/RentStatusBadge";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppShareButton } from "@/components/WhatsAppShareButton";

interface DriverDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverData: ReportData | null;
  onMarkAsLeave?: (
    driverId: string,
    driverName: string,
    vehicleNumber: string,
    shift: string,
    date: string
  ) => void;
  onMarkAsOffline?: (
    driverId: string,
    driverName: string,
    vehicleNumber: string,
    shift: string,
    date: string,
    notes?: string
  ) => void;
}

export const DriverDetailModal = ({
  onMarkAsLeave,
  onMarkAsOffline,
  isOpen,
  onClose,
  driverData,
}: DriverDetailModalProps) => {
  const { user } = useAuth();
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineNotes, setOfflineNotes] = useState("");

  if (!driverData) return null;

  const renderStatusDescription = () => {
    switch (driverData.status) {
      case "approved":
        return "Driver has submitted the report, and it has been approved.";
      case "pending_verification":
        return "Driver has submitted the report, but it has not been verified yet.";
      case "overdue":
        return "Driver has not submitted the report within the deadline.";
      case "leave":
        return "Driver is on leave for this day.";
      case "offline":
        return "Driver is offline and not working on this day.";
      case "not_joined":
        return "Driver had not joined the company on this date.";
      default:
        return "Status unknown";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "PPpp");
    } catch (e) {
      return dateString;
    }
  };

  const handleAddToBalance = async () => {
    if (!driverData.rent_paid_amount) {
      toast.error("No amount available to add to balance");
      return;
    }

    try {
      setIsSubmitting(true);

      const amount = Math.abs(driverData.rent_paid_amount);
      const transactionType =
        driverData.rent_paid_amount < 0 ? "refund" : "due";

      // Add transaction to driver_balance_transactions table
      const { error: txError } = await supabase
        .from("driver_balance_transactions")
        .insert({
          user_id: driverData.userId,
          amount: amount,
          type: transactionType,
          description:
            description.trim() ||
            `Report adjustment for ${driverData.date} - ${driverData.shift} shift`,
          created_by: user?.id,
        });

      if (txError) throw txError;

      // Update the driver's pending balance
      const { data: currentUser, error: userError } = await supabase
        .from("users")
        .select("pending_balance")
        .eq("id", driverData.userId)
        .single();

      if (userError) throw userError;

      const currentBalance = currentUser?.pending_balance || 0;
      const balanceChange = driverData.rent_paid_amount < 0 ? amount : -amount;
      const newBalance = currentBalance + balanceChange;

      const { error: updateError } = await supabase
        .from("users")
        .update({ pending_balance: newBalance })
        .eq("id", driverData.userId);

      if (updateError) throw updateError;

      toast.success(
        `Added ${
          transactionType === "refund" ? "refund" : "due"
        } of ₹${amount.toLocaleString()} to driver balance`
      );
      setIsBalanceModalOpen(false);
      setDescription("");
    } catch (error) {
      console.error("Error adding to balance:", error);
      toast.error("Failed to add to driver balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {driverData.driverName}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <RentStatusBadge
                  status={
                    driverData.status === "pending_verification"
                      ? "pending"
                      : (driverData.status as any)
                  }
                  hasAdjustment={driverData.hasServiceDayAdjustment}
                />
                <span>for {driverData.date}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 py-2">
              <div>
                <h3 className="font-medium">Status</h3>
                <p className="text-sm text-muted-foreground">
                  {renderStatusDescription()}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Driver Details</h3>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Vehicle</p>
                    <p>{driverData.vehicleNumber || "N/A"}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Assigned Shift</p>
                    <Badge variant="outline" className="mt-1">
                      {driverData.shift}
                    </Badge>
                  </div>
                  {driverData.shiftForDate &&
                    driverData.shiftForDate !== driverData.shift && (
                      <div className="text-sm col-span-2">
                        <p className="text-muted-foreground">
                          Shift on this date
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {driverData.shiftForDate}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          (Different from current assigned shift)
                        </p>
                      </div>
                    )}
                  <div className="text-sm">
                    <p className="text-muted-foreground">Joining Date</p>
                    <p>
                      {driverData.joiningDate
                        ? format(parseISO(driverData.joiningDate), "PP")
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {(driverData.status === "approved" ||
                driverData.status === "pending_verification") && (
                <div>
                  <h3 className="font-medium">Report Details</h3>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Submitted On</p>
                      <p>
                        {driverData.created_at
                          ? formatDate(driverData.created_at)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Earnings</p>
                      <p>
                        ₹{driverData.rent_paid_amount?.toLocaleString() || "0"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {driverData.notes && (
                <div>
                  <h3 className="font-medium">Notes</h3>
                  <p className="text-sm">{driverData.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <WhatsAppShareButton
                  driverData={driverData}
                  size="default"
                  variant="outline"
                />

                {/* Show Mark as Leave and Mark as Offline only for not_joined (no shift) and overdue statuses */}
                {(driverData.status === "not_joined" ||
                  driverData.status === "overdue") && (
                  <>
                    {/* <Button
                      onClick={() =>
                        onMarkAsLeave?.(
                          driverData.userId,
                          driverData.driverName,
                          driverData.vehicleNumber || "",
                          driverData.shift,
                          driverData.date
                        )
                      }
                      variant="secondary"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Mark as Leave
                    </Button> */}
                    <Button
                      onClick={() => {
                        setOfflineNotes("");
                        setShowOfflineModal(true);
                      }}
                      variant="outline"
                      className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
                    >
                      Mark as Offline
                    </Button>
                  </>
                )}

                {(driverData.status === "approved" ||
                  driverData.status === "pending_verification") &&
                  driverData.rent_paid_amount !== undefined && (
                    <Button
                      onClick={() => setIsBalanceModalOpen(true)}
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      Add to Balance
                    </Button>
                  )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Balance Transaction Modal */}
      <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Driver Balance</DialogTitle>
            <DialogDescription>
              Add this report's rent amount to the driver's balance transactions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Report Details:</div>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Driver:</strong> {driverData.driverName}
                </div>
                <div>
                  <strong>Date:</strong> {driverData.date}
                </div>
                <div>
                  <strong>Shift:</strong> {driverData.shift}
                </div>
                <div>
                  <strong>Amount:</strong> ₹
                  {driverData.rent_paid_amount?.toLocaleString()}
                </div>
                <div>
                  <strong>Type:</strong>
                  <span
                    className={`ml-1 px-2 py-1 rounded text-xs ${
                      driverData.rent_paid_amount &&
                      driverData.rent_paid_amount < 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {driverData.rent_paid_amount &&
                    driverData.rent_paid_amount < 0
                      ? "Refund"
                      : "Due"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter a description for this transaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                If left empty, a default description will be generated
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBalanceModalOpen(false);
                  setDescription("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToBalance}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Adding..." : "Add to Balance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Offline Modal */}
      <Dialog open={showOfflineModal} onOpenChange={setShowOfflineModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Offline</DialogTitle>
            <DialogDescription>
              Mark {driverData.driverName} as offline for{" "}
              {format(parseISO(driverData.date), "PP")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Driver Details:</div>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Driver:</strong> {driverData.driverName}
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {format(parseISO(driverData.date), "PP")}
                </div>
                <div>
                  <strong>Shift:</strong> {driverData.shift || "N/A"}
                </div>
                <div>
                  <strong>Vehicle:</strong> {driverData.vehicleNumber || "N/A"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offline-notes">Notes (Optional)</Label>
              <Textarea
                id="offline-notes"
                placeholder="Enter notes for this offline record..."
                value={offlineNotes}
                onChange={(e) => setOfflineNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Add any additional notes about why the driver is offline
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOfflineModal(false);
                  setOfflineNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onMarkAsOffline?.(
                    driverData.userId,
                    driverData.driverName,
                    driverData.vehicleNumber || "",
                    driverData.shift,
                    driverData.date,
                    offlineNotes.trim() || undefined
                  );
                  setShowOfflineModal(false);
                  setOfflineNotes("");
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Mark as Offline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
