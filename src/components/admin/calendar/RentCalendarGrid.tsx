
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
}

export const RentCalendarGrid = ({
  currentDate,
  weekOffset,
  filteredDrivers,
  calendarData,
  isMobile = false,
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
      case 'paid': return 'bg-emerald-50';
      case 'pending': return 'bg-yellow-50';
      case 'overdue': return 'bg-red-50';
      case 'leave': return 'bg-gray-50';
      default: return '';
    }
  };

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
                {filteredDrivers.map((driver) => {
                  const rentData = getStatusForDay(driver.id, day);
                  return rentData ? (
                    <div 
                      key={`${driver.id}-${format(day, 'yyyy-MM-dd')}`}
                      className={cn(
                        "p-3 flex items-center justify-between",
                        rentData && getStatusColor(rentData.status)
                      )}
                    >
                      <div className="text-sm">
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {driver.vehicle_number} • {driver.shift || 'N/A'}
                        </div>
                      </div>
                      <RentStatusBadge status={rentData.status} />
                    </div>
                  ) : null;
                })}
                
                {/* If no drivers have data for this day */}
                {filteredDrivers.filter(driver => getStatusForDay(driver.id, day)).length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No rent data for this day
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
              <TableHead className="bg-muted/50 w-[200px] sticky left-0 z-20">Driver Info</TableHead>
              {weekDays.map((day, index) => (
                <TableHead 
                  key={index}
                  className={cn(
                    "text-center min-w-[130px]",
                    isSameDay(day, new Date()) && "bg-accent"
                  )}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div>{format(day, 'd MMM')}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {driver.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Shift: {driver.shift || 'N/A'}
                    </div>
                  </div>
                </TableCell>
                {weekDays.map((day) => {
                  const rentData = getStatusForDay(driver.id, day);
                  return (
                    <TableCell 
                      key={`${driver.id}-${format(day, 'yyyy-MM-dd')}`}
                      className={cn(
                        "text-center h-[72px]",
                        rentData && getStatusColor(rentData.status)
                      )}
                    >
                      {rentData ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-full flex items-center justify-center">
                                <RentStatusBadge status={rentData.status} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="w-[200px]">
                              <div className="space-y-2">
                                <div className="font-bold">{rentData.driverName}</div>
                                <div>Status: {rentData.status}</div>
                                {rentData.earnings !== undefined && (
                                  <div>Earnings: ₹{rentData.earnings.toLocaleString()}</div>
                                )}
                                {rentData.notes && <div>Notes: {rentData.notes}</div>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="text-muted-foreground text-xs">-</div>
                      )}
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
