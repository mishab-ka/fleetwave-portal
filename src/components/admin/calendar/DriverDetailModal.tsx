import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportData } from "./CalendarUtils";
import { RentStatusBadge } from "@/components/RentStatusBadge";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

export const DriverDetailModal = ({
  onMarkAsLeave,
  isOpen,
  onClose,
  driverData,
}: DriverDetailModalProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {driverData.driverName}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-1">
              <RentStatusBadge status={driverData.status} />
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
            <Button
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
            >
              Mark as Leave
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
