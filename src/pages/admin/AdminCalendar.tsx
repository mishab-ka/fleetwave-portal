
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CalendarHeader } from '@/components/admin/calendar/CalendarHeader';
import { RentCalendarGrid } from '@/components/admin/calendar/RentCalendarGrid';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DateRangeFilter } from '@/components/admin/calendar/DateRangeFilter';
import { DriverDetailModal } from '@/components/admin/calendar/DriverDetailModal';
import { useCalendarDateRange } from '@/hooks/useCalendarDateRange';
import { processReportData, ReportData, getStatusColor, getStatusLabel, shouldIncludeDriver } from '@/components/admin/calendar/CalendarUtils';

const AdminCalendar = () => {
  const [calendarData, setCalendarData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDriverData, setSelectedDriverData] = useState<ReportData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [rentHistory, setRentHistory] = useState<any[]>([]);
  const isMobile = useIsMobile();
  
  const {
    startDate,
    endDate,
    preset: selectedDatePreset,
    setDateRangeByPreset,
    setCustomDateRange
  } = useCalendarDateRange();
  
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchDrivers();
    fetchCalendarData();
    fetchRentHistory();
  }, [weekOffset, selectedDriver, selectedShift, startDate, endDate]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchRentHistory = async () => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('rent_history')
        .select('*')
        .gte('rent_date', formattedStartDate)
        .lte('rent_date', formattedEndDate);
        
      if (error) throw error;
      setRentHistory(data || []);
    } catch (error) {
      console.error('Error fetching rent history:', error);
    }
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      let query = supabase
        .from('fleet_reports')
        .select(`
          id, user_id, driver_name, vehicle_number, submission_date, 
          rent_date, shift, rent_paid_status, total_earnings, status,
          remarks, created_at, users!inner(joining_date, online, offline_from_date)
        `)
        .gte('rent_date', formattedStartDate)
        .lte('rent_date', formattedEndDate);
      
      if (selectedDriver !== 'all') {
        query = query.eq('user_id', selectedDriver);
      }
      
      if (selectedShift !== 'all') {
        query = query.eq('shift', selectedShift);
      }
      
      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Get all online drivers
      const { data: onlineDrivers, error: driversError } = await supabase
        .from('users')
        .select('id, name, vehicle_number, joining_date, shift, online')
        .eq('online', true);
        
      if (driversError) throw driversError;
      
      // Create an array of all dates in the date range
      const allDates: string[] = [];
      let currentDateInRange = new Date(formattedStartDate);
      const endDateObj = new Date(formattedEndDate);
      
      while (currentDateInRange <= endDateObj) {
        allDates.push(format(currentDateInRange, 'yyyy-MM-dd'));
        currentDateInRange.setDate(currentDateInRange.getDate() + 1);
      }
      
      // Process existing reports
      let processedData: ReportData[] = reportsData?.map(report => processReportData(report)) || [];
      
      // Create "not_joined" entries for drivers without reports
      if (onlineDrivers) {
        for (const driver of onlineDrivers) {
          for (const dateStr of allDates) {
            // Skip if the driver hadn't joined yet
            if (!shouldIncludeDriver(driver, dateStr)) continue;
            
            // Check if a report exists for this driver and date
            const existingReport = processedData.find(
              report => report.userId === driver.id && report.date === dateStr
            );
            
            // If no report exists, create a placeholder with "not_joined" status
            if (!existingReport) {
              // Check rent history if this was marked as leave or offline
              const historyEntry = rentHistory.find(
                entry => entry.user_id === driver.id && entry.rent_date === dateStr
              );
              
              let status: RentStatus = 'not_joined';
              let notes = '';
              
              if (historyEntry) {
                if (historyEntry.payment_status === 'leave') {
                  status = 'leave';
                  notes = 'Driver on leave';
                } else if (!historyEntry.is_online) {
                  status = 'offline';
                  notes = 'Driver offline on this date';
                }
              }
              
              processedData.push({
                date: dateStr,
                userId: driver.id,
                driverName: driver.name || 'Unknown',
                vehicleNumber: driver.vehicle_number || '',
                status,
                shift: driver.shift || 'unknown',
                notes,
                joiningDate: driver.joining_date,
              });
            }
          }
        }
      }
      
      setCalendarData(processedData);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDriverDetail = (driverData: ReportData) => {
    setSelectedDriverData(driverData);
    setIsDetailModalOpen(true);
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setCustomDateRange(start, end);
  };

  const handleDatePresetChange = (preset: string) => {
    setDateRangeByPreset(preset);
  };

  const filteredDrivers = drivers.filter(driver => {
    if (searchQuery && !((driver.name && driver.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.driver_id && driver.driver_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase())))) {
      return false;
    }
    
    if (!driver.online) {
      return false;
    }
    
    return true;
  });

  const getShiftFilteredDrivers = (shiftType: string) => {
    return filteredDrivers.filter(driver => driver.shift === shiftType);
  };

  const morningShiftDrivers = getShiftFilteredDrivers('morning');
  const nightShiftDrivers = getShiftFilteredDrivers('night');
  const fullDayShiftDrivers = getShiftFilteredDrivers('24hr');

  const morningShiftData = calendarData.filter(data => data.shift === 'morning');
  const nightShiftData = calendarData.filter(data => data.shift === 'night');
  const fullDayShiftData = calendarData.filter(data => data.shift === '24hr');

  const statusLegend = [
    { status: 'paid', label: 'Paid' },
    { status: 'pending', label: 'Pending Verification' },
    { status: 'overdue', label: 'Overdue' },
    { status: 'leave', label: 'Leave' },
    { status: 'not_joined', label: 'Not Paid' }
  ];

  return (
    <AdminLayout title="Rent Due Calendar">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <DateRangeFilter 
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
            onPresetChange={handleDatePresetChange}
            selectedPreset={selectedDatePreset}
          />
          
          {!isMobile && (
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 mb-4">
          {statusLegend.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded",
                getStatusColor(item.status)
              )}></div>
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-4">
            <TabsTrigger value="all">All Shifts</TabsTrigger>
            <TabsTrigger value="morning">Morning</TabsTrigger>
            <TabsTrigger value="night">Night</TabsTrigger>
            <TabsTrigger value="fullday">24 Hours</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <>
                    <CalendarHeader
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      onPreviousWeek={() => setWeekOffset(weekOffset - 1)}
                      onNextWeek={() => setWeekOffset(weekOffset + 1)}
                      onTodayClick={() => {
                        setWeekOffset(0);
                        setCurrentDate(new Date());
                      }}
                      selectedShift={selectedShift}
                      onShiftChange={setSelectedShift}
                      isMobile={isMobile}
                    />
                    <RentCalendarGrid
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      filteredDrivers={filteredDrivers}
                      calendarData={calendarData}
                      isMobile={isMobile}
                      onCellClick={handleOpenDriverDetail}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="morning">
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <>
                    <CalendarHeader
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      onPreviousWeek={() => setWeekOffset(weekOffset - 1)}
                      onNextWeek={() => setWeekOffset(weekOffset + 1)}
                      onTodayClick={() => {
                        setWeekOffset(0);
                        setCurrentDate(new Date());
                      }}
                      selectedShift="morning"
                      onShiftChange={() => {}}
                      isMobile={isMobile}
                      hideShiftSelector
                    />
                    <RentCalendarGrid
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      filteredDrivers={morningShiftDrivers}
                      calendarData={morningShiftData}
                      isMobile={isMobile}
                      shiftType="morning"
                      onCellClick={handleOpenDriverDetail}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="night">
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <>
                    <CalendarHeader
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      onPreviousWeek={() => setWeekOffset(weekOffset - 1)}
                      onNextWeek={() => setWeekOffset(weekOffset + 1)}
                      onTodayClick={() => {
                        setWeekOffset(0);
                        setCurrentDate(new Date());
                      }}
                      selectedShift="night"
                      onShiftChange={() => {}}
                      isMobile={isMobile}
                      hideShiftSelector
                    />
                    <RentCalendarGrid
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      filteredDrivers={nightShiftDrivers}
                      calendarData={nightShiftData}
                      isMobile={isMobile}
                      shiftType="night"
                      onCellClick={handleOpenDriverDetail}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fullday">
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <>
                    <CalendarHeader
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      onPreviousWeek={() => setWeekOffset(weekOffset - 1)}
                      onNextWeek={() => setWeekOffset(weekOffset + 1)}
                      onTodayClick={() => {
                        setWeekOffset(0);
                        setCurrentDate(new Date());
                      }}
                      selectedShift="24hr"
                      onShiftChange={() => {}}
                      isMobile={isMobile}
                      hideShiftSelector
                    />
                    <RentCalendarGrid
                      currentDate={currentDate}
                      weekOffset={weekOffset}
                      filteredDrivers={fullDayShiftDrivers}
                      calendarData={fullDayShiftData}
                      isMobile={isMobile}
                      shiftType="24hr"
                      onCellClick={handleOpenDriverDetail}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DriverDetailModal 
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          driverData={selectedDriverData}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
