import React, { useState } from "react";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  ReportData,
  getStatusColor,
  getStatusLabel,
  getShiftBadgeColor,
} from "./CalendarUtils";
import { Button } from "@/components/ui/button";
import { WhatsAppShareButton } from "@/components/WhatsAppShareButton";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  MessageCircle,
  BadgeCheck,
  Copy,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface RentCalendarGridProps {
  currentDate: Date;
  weekOffset: number;
  filteredDrivers: any[];
  calendarData: ReportData[];
  isMobile?: boolean;
  shiftType?: string;
  // onMarkAsLeave?: (
  //   driverId: string,
  //   driverName: string,
  //   vehicleNumber: string,
  //   shift: string,
  //   date: string
  // ) => void;
  onCellClick?: (data: ReportData) => void;
  mobileStartIndex?: number; // New prop to track which day to start from on mobile
}

export const RentCalendarGrid = ({
  currentDate,
  weekOffset,
  filteredDrivers,
  calendarData,
  isMobile = false,
  shiftType,
  onCellClick,
  // onMarkAsLeave,
  mobileStartIndex = 0, // Default to the first day of the week
}: RentCalendarGridProps) => {
  // Determine number of days to display based on device
  const daysToShow = isMobile ? 2 : 7;

  // Create the full week array
  const weekStart = startOfWeek(addDays(currentDate, weekOffset * 7), {
    weekStartsOn: 1,
  });
  const fullWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i)
  );

  // For mobile, only show the subset of days based on mobileStartIndex
  const weekDays = isMobile
    ? fullWeekDays.slice(mobileStartIndex, mobileStartIndex + daysToShow)
    : fullWeekDays;

  const getStatusForDay = (driverId: string, date: Date) => {
    return calendarData.find(
      (data) =>
        data.userId === driverId && data.date === format(date, "yyyy-MM-dd")
    );
  };

  // Filter to show online drivers
  // For "All Shifts" tab: show all online drivers including "none" shift and N/A vehicle
  // For "none" shift tab: show only drivers with "none" shift
  // For other tabs: exclude drivers with "none" shift but include N/A vehicle drivers
  const onlineDrivers = filteredDrivers.filter((driver) => {
    if (!driver.online) return false;
    // Accept both null and "none" as valid shift values (including no-shift drivers)
    if (!driver.shift && driver.shift !== "none") return false;

    // If we're in the "none" shift tab, only show drivers with "none" shift or null
    if (shiftType === "none") {
      return driver.shift === "none" || driver.shift === null || driver.shift === "";
    }

    // For "All Shifts" tab, show all drivers including "none" shift
    if (!shiftType || shiftType === "all") {
      return true; // Show all online drivers with any shift
    }

    // For other specific shift tabs, exclude drivers with "none" shift or null
    return driver.shift !== "none" && driver.shift !== null && driver.shift !== "";
  });

  // Sort drivers by shift type and verified status
  // Priority: 1. Morning (highest), 2. Night, 3. None (lowest)
  // Within each shift group: Verified = true first, Verified = false after
  const sortedDrivers = [...onlineDrivers].sort((a, b) => {
    // Helper function to get shift priority
    const getShiftPriority = (shift: string | null | undefined): number => {
      if (shift === "morning") return 1; // Highest priority
      if (shift === "night") return 2;
      return 3; // none, null, or undefined - lowest priority
    };

    // First, sort by shift priority: Morning > Night > None
    const shiftPriorityA = getShiftPriority(a.shift);
    const shiftPriorityB = getShiftPriority(b.shift);

    if (shiftPriorityA !== shiftPriorityB) {
      return shiftPriorityA - shiftPriorityB;
    }

    // If same shift, sort by verified status
    // Drivers with Verified = true come first, Verified = false come after
    const isVerifiedA = a.is_verified === true;
    const isVerifiedB = b.is_verified === true;

    // Verified drivers come first within their shift group
    if (isVerifiedA && !isVerifiedB) return -1;
    if (!isVerifiedA && isVerifiedB) return 1;

    // If both have same verified status, sort by name for consistent ordering
    return (a.name || "").localeCompare(b.name || "");
  });

  // Calculate statistics from calendarData for the visible week
  const calculateStatistics = () => {
    const weekDateStrings = weekDays.map((day) => format(day, "yyyy-MM-dd"));
    const weekData = calendarData.filter((data) =>
      weekDateStrings.includes(data.date)
    );

    const stats = {
      paid: 0,
      overdue: 0,
      rejected: 0,
      pending: 0,
    };

    weekData.forEach((data) => {
      if (data.status === "paid" || data.status === "approved") {
        stats.paid++;
      } else if (data.status === "overdue") {
        stats.overdue++;
      } else if (data.status === "rejected") {
        stats.rejected++;
      } else if (
        data.status === "pending_verification" ||
        data.status === "pending"
      ) {
        stats.pending++;
      }
    });

    return stats;
  };

  const statistics = calculateStatistics();

  // State for bulk share modal
  const [showBulkShareModal, setShowBulkShareModal] = useState(false);
  const [bulkShareType, setBulkShareType] = useState<
    "overdue" | "rejected" | null
  >(null);
  const [bulkShareData, setBulkShareData] = useState<ReportData[]>([]);
  const [copiedDriverId, setCopiedDriverId] = useState<string | null>(null);

  const handleCellClick = (reportData: ReportData | undefined) => {
    if (reportData && onCellClick) {
      onCellClick(reportData);
    }
  };

  const handleCopyDriverId = async (driverId: string) => {
    try {
      await navigator.clipboard.writeText(driverId);
      setCopiedDriverId(driverId);
      toast.success("Driver ID copied to clipboard");
      setTimeout(() => setCopiedDriverId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy Driver ID");
    }
  };

  const handleStatisticsClick = (type: "overdue" | "rejected") => {
    const weekDateStrings = weekDays.map((day) => format(day, "yyyy-MM-dd"));
    const filteredData = calendarData.filter(
      (data) => weekDateStrings.includes(data.date) && data.status === type
    );

    if (filteredData.length === 0) {
      return;
    }

    setBulkShareType(type);
    setBulkShareData(filteredData);
    setShowBulkShareModal(true);
  };

  const handleBulkShareToManager = () => {
    if (bulkShareData.length === 0) return;

    const currentDate = format(new Date(), "dd MMM yyyy");
    let message = "";

    if (bulkShareType === "overdue") {
      message = `🚨 *URGENT: Overdue Rent Payment Report*\n\n`;
      message += `*Date:* ${currentDate}\n`;
      message += `*Total Overdue Drivers:* ${bulkShareData.length}\n\n`;
      message += `*Overdue Drivers List:*\n\n`;

      bulkShareData.forEach((data, index) => {
        const dateFormatted = format(parseISO(data.date), "dd MMM yyyy");
        message += `${index + 1}. *${data.driverName}*\n`;
        message += `   📅 Date: ${dateFormatted}\n`;
        if (data.vehicleNumber) {
          message += `   🚗 Vehicle: ${data.vehicleNumber}\n`;
        }
        message += `\n`;
      });

      message += `⚠️ Please ensure all drivers submit their payments immediately to avoid penalties.\n\n`;
      message += `*Deadline Information:*\n`;
      message += `• Morning Shift: 5:00 PM same day\n`;
      message += `• Night/24hr Shift: 5:00 AM next day`;
    } else if (bulkShareType === "rejected") {
      message = `❌ *Rejected Rent Payment Report*\n\n`;
      message += `*Date:* ${currentDate}\n`;
      message += `*Total Rejected Drivers:* ${bulkShareData.length}\n\n`;
      message += `*Rejected Drivers List:*\n\n`;

      bulkShareData.forEach((data, index) => {
        const dateFormatted = format(parseISO(data.date), "dd MMM yyyy");
        message += `${index + 1}. *${data.driverName}*\n`;
        message += `   📅 Date: ${dateFormatted}\n`;
        if (data.vehicleNumber) {
          message += `   🚗 Vehicle: ${data.vehicleNumber}\n`;
        }
        if (
          data.rent_paid_amount !== undefined &&
          data.rent_paid_amount !== null
        ) {
          message += `   💰 Amount: ₹${data.rent_paid_amount.toLocaleString()}\n`;
        }
        if (data.notes) {
          message += `   📝 Notes: ${data.notes}\n`;
        }
        message += `\n`;
      });

      message += `Please review and take necessary action for these rejected payments.`;
    }

    const encodedMessage = encodeURIComponent(message);
    // Open WhatsApp with the message (user can select manager group)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Statistics Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-600">Total Paid</div>
                  <div className="text-lg font-bold text-green-600">
                    {statistics.paid}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 bg-red-50 rounded-lg",
                  statistics.overdue > 0 &&
                    "cursor-pointer hover:bg-red-100 transition-colors"
                )}
                onClick={() =>
                  statistics.overdue > 0 && handleStatisticsClick("overdue")
                }
              >
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-xs text-gray-600">Total Overdue</div>
                  <div className="text-lg font-bold text-red-600">
                    {statistics.overdue}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-xs text-gray-600">Total Pending</div>
                  <div className="text-lg font-bold text-yellow-600">
                    {statistics.pending}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 bg-orange-50 rounded-lg",
                  statistics.rejected > 0 &&
                    "cursor-pointer hover:bg-orange-100 transition-colors"
                )}
                onClick={() =>
                  statistics.rejected > 0 && handleStatisticsClick("rejected")
                }
              >
                <XCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-xs text-gray-600">Total Rejected</div>
                  <div className="text-lg font-bold text-orange-600">
                    {statistics.rejected}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="space-y-6">
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="border rounded-md overflow-hidden">
                <div
                  className={cn(
                    "p-3 text-center font-medium border-b",
                    isSameDay(day, new Date()) && "bg-accent"
                  )}
                >
                  {format(day, "EEEE, d MMM")}
                </div>

                <div className="divide-y">
                  {sortedDrivers.map((driver, index) => {
                    const rentData = getStatusForDay(driver.id, day);
                    const driverStatus = rentData
                      ? rentData.status
                      : "not_joined";
                    const driverShift = driver.shift || "N/A";

                    // Debug logging
                    console.log(
                      `Driver: ${driver.name}, Date: ${format(
                        day,
                        "yyyy-MM-dd"
                      )}, Status: ${driverStatus}`
                    );

                    // Debug: Log status for overdue detection
                    if (driverStatus === "overdue") {
                      console.log(
                        `Overdue status detected for ${driver.name} on ${format(
                          day,
                          "yyyy-MM-dd"
                        )}`
                      );
                    }

                    return (
                      <div
                        key={`${driver.id}-${format(day, "yyyy-MM-dd")}`}
                        className={cn(
                          "p-3 flex items-center justify-between cursor-pointer hover:opacity-80",
                          getStatusColor(driverStatus, rentData?.hasAdjustment || rentData?.hasServiceDayAdjustment),
                          driverStatus === "overdue" &&
                            "!bg-red-600 !text-white"
                        )}
                        onClick={() => handleCellClick(rentData)}
                      >
                        <div className="text-sm flex items-center">
                          <span className="font-semibold w-6 mr-2">
                            {index + 1}.
                          </span>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {driver.name}
                              {driver.is_verified && (
                                <BadgeCheck className="h-4 w-4 text-white bg-green-600 rounded-full" />
                              )}
                            </div>
                            {driver.driver_id && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                <span className="font-mono">ID: {driver.driver_id}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyDriverId(driver.driver_id);
                                  }}
                                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                  title="Copy Driver ID"
                                >
                                  {copiedDriverId === driver.driver_id ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-500" />
                                  )}
                                </button>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              <span
                                className={cn(
                                  (!driver.vehicle_number ||
                                    driver.vehicle_number === "N/A") &&
                                    "text-orange-600 font-medium"
                                )}
                              >
                                {driver.vehicle_number || "N/A"}
                              </span>{" "}
                              •
                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-1 text-xs",
                                  getShiftBadgeColor(driverShift)
                                )}
                              >
                                {driverShift}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-medium text-center">
                          {getStatusLabel(driverStatus)}
                        </div>
                        {rentData?.rent_paid_amount !== undefined && (
                          <div className="text-xs mt-1">
                            ₹{rentData.rent_paid_amount.toLocaleString()}
                          </div>
                        )}
                        <div className="mt-2">
                          <WhatsAppShareButton
                            driverData={
                              rentData || {
                                userId: driver.id,
                                driverName: driver.name,
                                vehicleNumber: driver.vehicle_number,
                                shift: driver.shift,
                                date: format(day, "yyyy-MM-dd"),
                                status: driverStatus,
                              }
                            }
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* If no drivers for this day */}
                  {sortedDrivers.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No drivers available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bulk Share Modal */}
        <Dialog open={showBulkShareModal} onOpenChange={setShowBulkShareModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {bulkShareType === "overdue" ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Overdue Drivers List
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-orange-600" />
                    Rejected Drivers List
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {bulkShareType === "overdue"
                  ? `Total ${bulkShareData.length} driver(s) with overdue payments`
                  : `Total ${bulkShareData.length} driver(s) with rejected payments`}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {bulkShareData.map((data, index) => (
                  <div
                    key={`${data.userId}-${data.date}`}
                    className="p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {index + 1}. {data.driverName}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          📅 Date: {format(parseISO(data.date), "dd MMM yyyy")}
                        </div>
                        {data.vehicleNumber && (
                          <div className="text-xs text-gray-600">
                            🚗 Vehicle: {data.vehicleNumber}
                          </div>
                        )}
                        {data.rent_paid_amount !== undefined &&
                          data.rent_paid_amount !== null && (
                            <div className="text-xs text-gray-600">
                              💰 Amount: ₹
                              {data.rent_paid_amount.toLocaleString()}
                            </div>
                          )}
                        {data.notes && (
                          <div className="text-xs text-gray-600 mt-1">
                            📝 Notes: {data.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkShareModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleBulkShareToManager}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share to Manager Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop view with table
  return (
    <div className="space-y-4 ">
      {/* Statistics Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-xs text-gray-600">Total Paid</div>
                <div className="text-xl font-bold text-green-600">
                  {statistics.paid}
                </div>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-3 p-3 bg-red-50 rounded-lg",
                statistics.overdue > 0 &&
                  "cursor-pointer hover:bg-red-100 transition-colors"
              )}
              onClick={() =>
                statistics.overdue > 0 && handleStatisticsClick("overdue")
              }
            >
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-xs text-gray-600">Total Overdue</div>
                <div className="text-xl font-bold text-red-600">
                  {statistics.overdue}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-xs text-gray-600">Total Pending</div>
                <div className="text-xl font-bold text-yellow-600">
                  {statistics.pending}
                </div>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-3 p-3 bg-orange-50 rounded-lg",
                statistics.rejected > 0 &&
                  "cursor-pointer hover:bg-orange-100 transition-colors"
              )}
              onClick={() =>
                statistics.rejected > 0 && handleStatisticsClick("rejected")
              }
            >
              <XCircle className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-xs text-gray-600">Total Rejected</div>
                <div className="text-xl font-bold text-orange-600">
                  {statistics.rejected}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] sticky left-0 z-20 bg-muted/50">
                  #
                </TableHead>
                <TableHead className="w-[180px] sticky left-10 z-20 bg-muted/50">
                  {shiftType || "All Shifts"}
                </TableHead>
                {weekDays.map((day, index) => (
                  <TableHead
                    key={index}
                    className={cn(
                      "text-center min-w-[130px]",
                      isSameDay(day, new Date()) && "bg-accent"
                    )}
                  >
                    <div className="font-medium">{format(day, "EEE")}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(day, "d/MM")}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDrivers.map((driver, index) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-semibold sticky left-0 bg-background z-10 border-r text-center w-[40px]">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium sticky left-10 bg-background z-10 border-r">
                    <div className="font-semibold flex items-center gap-1">
                      {driver.name || "Unknown"}
                      {driver.is_verified && (
                        <BadgeCheck className="h-4 w-4 text-white bg-green-600 rounded-full" />
                      )}
                    </div>
                    {driver.driver_id && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <span className="font-mono">ID: {driver.driver_id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDriverId(driver.driver_id);
                          }}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                          title="Copy Driver ID"
                        >
                          {copiedDriverId === driver.driver_id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          (!driver.vehicle_number ||
                            driver.vehicle_number === "N/A") &&
                            "text-orange-600 font-medium"
                        )}
                      >
                        {driver.vehicle_number || "N/A"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-1 text-xs",
                          getShiftBadgeColor(driver.shift)
                        )}
                      >
                        {driver.shift || "N/A"}
                      </Badge>
                    </div>
                  </TableCell>
                  {weekDays.map((day) => {
                    const rentData = getStatusForDay(driver.id, day);
                    const driverStatus = rentData
                      ? rentData.status
                      : "not_joined";

                    // Debug logging
                    console.log(
                      `Driver: ${driver.name}, Date: ${format(
                        day,
                        "yyyy-MM-dd"
                      )}, Status: ${driverStatus}`
                    );

                    // Debug: Log status for overdue detection
                    if (driverStatus === "overdue") {
                      console.log(
                        `Overdue status detected for ${driver.name} on ${format(
                          day,
                          "yyyy-MM-dd"
                        )}`
                      );
                    }

                    return (
                      <TableCell
                        key={`${driver.id}-${format(day, "yyyy-MM-dd")}`}
                        className={cn(
                          "p-0 h-[50px] cursor-pointer hover:opacity-90",
                          getStatusColor(driverStatus, rentData?.hasAdjustment || rentData?.hasServiceDayAdjustment),
                          driverStatus === "overdue" &&
                            "!bg-red-600 !text-white",
                          "border"
                        )}
                        onClick={() => handleCellClick(rentData)}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-full w-full p-2">
                                <div className="text-xs font-medium text-center">
                                  {getStatusLabel(driverStatus)}
                                </div>
                                {rentData?.rent_paid_amount !== undefined && (
                                  <div className="text-xs mt-1">
                                    ₹
                                    {rentData.rent_paid_amount.toLocaleString()}
                                  </div>
                                )}
                                {/* <div className="mt-1">
                                <WhatsAppShareButton
                                  driverData={
                                    rentData || {
                                      userId: driver.id,
                                      driverName: driver.name,
                                      vehicleNumber: driver.vehicle_number,
                                      shift: driver.shift,
                                      date: format(day, "yyyy-MM-dd"),
                                      status: driverStatus,
                                    }
                                  }
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 text-[10px] px-1 py-0"
                                />
                              </div> */}
                                {/* {rentData?.shiftForDate &&
                                rentData.shiftForDate !== driver.shift && (
                                  <div className="text-xs mt-1">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px]",
                                        getShiftBadgeColor(
                                          rentData.shiftForDate
                                        )
                                      )}
                                    >
                                      {rentData.shiftForDate}
                                    </Badge>
                                  </div>
                                )} */}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="w-[200px]">
                              <div className="space-y-2">
                                <div className="font-bold">{driver.name}</div>
                                <div>
                                  Status: {getStatusLabel(driverStatus)}
                                </div>
                                <div>
                                  Vehicle: {driver.vehicle_number || "N/A"}
                                </div>
                                <div>
                                  Current Shift: {driver.shift || "N/A"}
                                </div>
                                {rentData?.shiftForDate &&
                                  rentData.shiftForDate !== driver.shift && (
                                    <div>
                                      Shift on this date:{" "}
                                      {rentData.shiftForDate}
                                    </div>
                                  )}
                                {rentData?.rent_paid_amount !== undefined && (
                                  <div>
                                    Earnings: ₹
                                    {rentData.rent_paid_amount.toLocaleString()}
                                  </div>
                                )}
                                {rentData?.notes && (
                                  <div>Notes: {rentData.notes}</div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {sortedDrivers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={weekDays.length + 2}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No drivers available for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Bulk Share Modal */}
      <Dialog open={showBulkShareModal} onOpenChange={setShowBulkShareModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkShareType === "overdue" ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Overdue Drivers List
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-orange-600" />
                  Rejected Drivers List
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {bulkShareType === "overdue"
                ? `Total ${bulkShareData.length} driver(s) with overdue payments`
                : `Total ${bulkShareData.length} driver(s) with rejected payments`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {bulkShareData.map((data, index) => (
                <div
                  key={`${data.userId}-${data.date}`}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        {index + 1}. {data.driverName}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        📅 Date: {format(parseISO(data.date), "dd MMM yyyy")}
                      </div>
                      {data.vehicleNumber && (
                        <div className="text-xs text-gray-600">
                          🚗 Vehicle: {data.vehicleNumber}
                        </div>
                      )}
                      {data.rent_paid_amount !== undefined &&
                        data.rent_paid_amount !== null && (
                          <div className="text-xs text-gray-600">
                            💰 Amount: ₹{data.rent_paid_amount.toLocaleString()}
                          </div>
                        )}
                      {data.notes && (
                        <div className="text-xs text-gray-600 mt-1">
                          📝 Notes: {data.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkShareModal(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleBulkShareToManager}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Share to Manager Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
