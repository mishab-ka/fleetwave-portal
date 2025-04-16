
import React from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RentStatusBadge } from '@/components/RentStatusBadge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RentCalendarGridProps {
  currentDate: Date;
  weekOffset: number;
  filteredDrivers: any[];
  calendarData: any[];
  isMobile?: boolean;
  shiftType?: string;
}

export const RentCalendarGrid = ({
  currentDate,
  weekOffset,
  filteredDrivers,
  calendarData,
  isMobile = false,
  shiftType,
}: RentCalendarGridProps) => {
  // Determine number of days to display based on device
  const daysToShow = isMobile ? 2 : 7;
  
  const weekDays = Array.from({ length: daysToShow }, (_, i) => 
    addDays(startOfWeek(addDays(currentDate, weekOffset * 7), { weekStartsOn: 1 }), i)
  );

  const getStatusForDay = (driverId: string, date: Date) => {
    return calendarData.find(
      data => data.userId === driverId && data.date === format(date, 'yyyy-MM-dd')
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100';
      case 'pending': return 'bg-yellow-100';
      case 'overdue': return 'bg-red-100';
      case 'leave': return 'bg-blue-100';
      case 'offline': return 'bg-gray-100';
      case 'not_joined': return 'bg-white';
      default: return '';
    }
  };

  // Filter to show only online drivers
  const onlineDrivers = filteredDrivers.filter(driver => driver.online);

  if (isMobile) {
    return (
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-6">
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="border rounded-md overflow-hidden">
              <div className={cn(
                "p-3 text-center font-medium border-b",
                isSameDay(day, new Date()) && "bg-accent"
              )}>
                {format(day, 'EEEE, d MMM')}
              </div>
              
              <div className="divide-y">
                {onlineDrivers.map((driver) => {
                  const rentData = getStatusForDay(driver.id, day);
                  const driverStatus = rentData ? rentData.status : 'not_joined';
                  
                  return (
                    <div 
                      key={`${driver.id}-${format(day, 'yyyy-MM-dd')}`}
                      className={cn(
                        "p-3 flex items-center justify-between",
                        getStatusColor(driverStatus)
                      )}
                    >
                      <div className="text-sm">
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {driver.vehicle_number} • {driver.shift || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="text-xs font-medium">
                        {driverStatus === 'paid' && 'Paid'}
                        {driverStatus === 'pending' && 'Pending'}
                        {driverStatus === 'overdue' && 'Overdue'}
                        {driverStatus === 'leave' && 'Leave'}
                        {driverStatus === 'offline' && 'Offline'}
                        {driverStatus === 'not_joined' && 'Not Paid'}
                      </div>
                    </div>
                  );
                })}
                
                {/* If no drivers for this day */}
                {onlineDrivers.length === 0 && (
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

  // Desktop view with table - redesigned to match the image
  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] sticky left-0 z-20 bg-muted/50">
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
                  <div className="font-medium">{format(day, 'EEE')}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'd/MM')}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {onlineDrivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                  <div className="font-semibold">
                    {driver.name || 'Unknown'}
                  </div>
                </TableCell>
                {weekDays.map((day) => {
                  const rentData = getStatusForDay(driver.id, day);
                  const driverStatus = rentData ? rentData.status : 'not_joined';
                  
                  return (
                    <TableCell 
                      key={`${driver.id}-${format(day, 'yyyy-MM-dd')}`}
                      className={cn(
                        "p-0 h-[50px]",
                        getStatusColor(driverStatus),
                        "border"
                      )}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-full w-full p-2">
                              <div className="text-xs font-medium">
                                {driverStatus === 'paid' && 'Paid'}
                                {driverStatus === 'pending' && 'Pending'}
                                {driverStatus === 'overdue' && 'Overdue'}
                                {driverStatus === 'leave' && 'Leave'}
                                {driverStatus === 'offline' && 'Offline'}
                                {driverStatus === 'not_joined' && 'Not Paid'}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="w-[200px]">
                            <div className="space-y-2">
                              <div className="font-bold">{driver.name}</div>
                              <div>Status: {driverStatus}</div>
                              {rentData?.earnings !== undefined && (
                                <div>Earnings: ₹{rentData.earnings.toLocaleString()}</div>
                              )}
                              {rentData?.notes && <div>Notes: {rentData.notes}</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};
