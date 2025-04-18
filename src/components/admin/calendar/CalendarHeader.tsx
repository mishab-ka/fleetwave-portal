
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, startOfWeek } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarHeaderProps {
  currentDate: Date;
  weekOffset: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onTodayClick: () => void;
  selectedShift: string;
  onShiftChange: (value: string) => void;
  isMobile?: boolean;
  hideShiftSelector?: boolean;
  onPreviousDay?: () => void;  // New prop for mobile day navigation
  onNextDay?: () => void;      // New prop for mobile day navigation
  mobileStartIndex?: number;   // New prop to track current mobile view position
}

export const CalendarHeader = ({
  currentDate,
  weekOffset,
  onPreviousWeek,
  onNextWeek,
  onTodayClick,
  selectedShift,
  onShiftChange,
  isMobile = false,
  hideShiftSelector = false,
  onPreviousDay,
  onNextDay,
  mobileStartIndex = 0,
}: CalendarHeaderProps) => {
  const weekStart = startOfWeek(addDays(currentDate, weekOffset * 7), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, isMobile ? 1 : 6);
  
  // For mobile view, calculate which days are being shown
  const mobileViewStart = isMobile ? addDays(weekStart, mobileStartIndex) : weekStart;
  const mobileViewEnd = isMobile ? addDays(mobileViewStart, 1) : weekEnd;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="flex items-center gap-2">
        {isMobile ? (
          <>
            <Button variant="outline" size="sm" onClick={onPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onTodayClick}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={onNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onTodayClick}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={onNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        <span className="text-sm font-medium">
          {isMobile 
            ? `${format(mobileViewStart, 'd MMM')} - ${format(mobileViewEnd, 'd MMM')}`
            : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
          }
        </span>
      </div>
      
      {!hideShiftSelector && (
        <Select value={selectedShift} onValueChange={onShiftChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Select Shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="night">Night</SelectItem>
            <SelectItem value="24hr">24 Hours</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
