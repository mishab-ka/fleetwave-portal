import React from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
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

interface RentCalendarGridProps {
  currentDate: Date;
  weekOffset: number;
  filteredDrivers: any[];
  calendarData: ReportData[];
  isMobile?: boolean;
  shiftType?: string;
  onMarkAsLeave?: (
    driverId: string,
    driverName: string,
    vehicleNumber: string,
    shift: string,
    date: string
  ) => void;
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
  onMarkAsLeave,
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

  // Filter to show only online drivers
  const onlineDrivers = filteredDrivers.filter((driver) => driver.online);

  // Sort drivers by shift type - morning first, then night
  const sortedDrivers = [...onlineDrivers].sort((a, b) => {
    if (a.shift === "morning" && b.shift !== "morning") return -1;
    if (a.shift !== "morning" && b.shift === "morning") return 1;
    return 0;
  });

  const handleCellClick = (reportData: ReportData | undefined) => {
    if (reportData && onCellClick) {
      onCellClick(reportData);
    }
  };

  if (isMobile) {
    return (
      <ScrollArea className="h-[calc(100vh-280px)]">
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

                  return (
                    <div
                      key={`${driver.id}-${format(day, "yyyy-MM-dd")}`}
                      className={cn(
                        "p-3 flex items-center justify-between cursor-pointer hover:opacity-80",
                        getStatusColor(driverStatus)
                      )}
                      onClick={() => handleCellClick(rentData)}
                    >
                      <div className="text-sm flex items-center">
                        <span className="font-semibold w-6 mr-2">
                          {index + 1}.
                        </span>
                        <div>
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {driver.vehicle_number} •
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

                      <div className="text-xs font-medium">
                        {getStatusLabel(driverStatus)}
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
    );
  }

  // Desktop view with table
  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
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
                  <div className="font-semibold">
                    {driver.name || "Unknown"}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {driver.vehicle_number}
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

                  return (
                    <TableCell
                      key={`${driver.id}-${format(day, "yyyy-MM-dd")}`}
                      className={cn(
                        "p-0 h-[50px] cursor-pointer hover:opacity-90",
                        getStatusColor(driverStatus),
                        "border"
                      )}
                      onClick={() => handleCellClick(rentData)}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-full w-full p-2">
                              <div className="text-xs font-medium">
                                {getStatusLabel(driverStatus)}
                              </div>
                              {rentData?.rent_paid_amount !== undefined && (
                                <div className="text-xs mt-1">
                                  ₹{rentData.rent_paid_amount.toLocaleString()}
                                </div>
                              )}
                              {rentData?.shiftForDate &&
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
                                )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="w-[200px]">
                            <div className="space-y-2">
                              <div className="font-bold">{driver.name}</div>
                              <div>Status: {getStatusLabel(driverStatus)}</div>
                              <div>Current Shift: {driver.shift || "N/A"}</div>
                              {rentData?.shiftForDate &&
                                rentData.shiftForDate !== driver.shift && (
                                  <div>
                                    Shift on this date: {rentData.shiftForDate}
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
  );
};
