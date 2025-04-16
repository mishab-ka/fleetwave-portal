import { useState, useEffect } from 'react';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  subDays, 
  startOfMonth, 
  endOfMonth 
} from 'date-fns';

export const useCalendarDateRange = () => {
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
    preset: 'today'
  });

  const setDateRangeByPreset = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case 'today':
        setDateRange({
          startDate: startOfDay(today),
          endDate: endOfDay(today),
          preset
        });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateRange({
          startDate: startOfDay(yesterday),
          endDate: endOfDay(yesterday),
          preset
        });
        break;
      case 'last7days':
        setDateRange({
          startDate: startOfDay(subDays(today, 6)),
          endDate: endOfDay(today),
          preset
        });
        break;
      case 'last30days':
        setDateRange({
          startDate: startOfDay(subDays(today, 29)),
          endDate: endOfDay(today),
          preset
        });
        break;
      case 'thisMonth':
        setDateRange({
          startDate: startOfMonth(today),
          endDate: endOfMonth(today),
          preset
        });
        break;
      case 'thisWeek':
        setDateRange({
          startDate: startOfWeek(today, { weekStartsOn: 1 }),
          endDate: endOfWeek(today, { weekStartsOn: 1 }),
          preset
        });
        break;
      case 'custom':
        // For custom, we keep the current dates but change the preset
        setDateRange({
          ...dateRange,
          preset
        });
        break;
      default:
        // Default to today
        setDateRange({
          startDate: startOfDay(today),
          endDate: endOfDay(today),
          preset: 'today'
        });
    }
  };

  const setCustomDateRange = (startDate: Date, endDate: Date) => {
    setDateRange({
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
      preset: 'custom'
    });
  };

  return {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    preset: dateRange.preset,
    setDateRangeByPreset,
    setCustomDateRange
  };
};
