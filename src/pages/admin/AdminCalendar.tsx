
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RentStatusBadge } from '@/components/RentStatusBadge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type RentStatus = 'paid' | 'overdue' | 'pending' | 'leave' | 'offline';

type RentStatusData = {
  date: string;
  userId: string;
  driverName: string;
  vehicleNumber: string | null;
  status: RentStatus;
  shift: string;
  submissionTime?: string;
  earnings?: number;
  notes?: string;
};

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<RentStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDrivers();
    fetchCalendarData();
  }, [weekOffset, selectedDriver, selectedShift]);

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

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(addWeeks(currentDate, weekOffset), { weekStartsOn: 1 });
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      
      let query = supabase
        .from('fleet_reports')
        .select(`
          id, user_id, driver_name, vehicle_number, submission_date, 
          rent_date, shift, rent_paid_status, total_earnings, 
          remarks, created_at, users!inner(joining_date, online, offline_from_date)
        `)
        .gte('rent_date', startDate)
        .lte('rent_date', endDate);
      
      if (selectedDriver !== 'all') {
        query = query.eq('user_id', selectedDriver);
      }
      
      if (selectedShift !== 'all') {
        query = query.eq('shift', selectedShift);
      }
      
      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      const processedData: RentStatusData[] = reportsData?.map(report => {
        // Check if user is offline
        if (!report.users.online) {
          return {
            date: report.rent_date,
            userId: report.user_id,
            driverName: report.driver_name,
            vehicleNumber: report.vehicle_number,
            status: 'offline',
            shift: report.shift,
            submissionTime: report.created_at,
            earnings: report.total_earnings,
            notes: report.remarks,
          };
        }

        // Check if user is on leave
        if (report.remarks?.toLowerCase().includes('leave')) {
          return {
            date: report.rent_date,
            userId: report.user_id,
            driverName: report.driver_name,
            vehicleNumber: report.vehicle_number,
            status: 'leave',
            shift: report.shift,
            submissionTime: report.created_at,
            earnings: report.total_earnings,
            notes: report.remarks,
          };
        }

        let status: RentStatus = 'pending';
        
        if (report.rent_paid_status === true) {
          status = 'paid';
        } else {
          const submissionDate = report.created_at ? new Date(report.created_at) : null;
          const rentDate = new Date(report.rent_date);
          
          if (submissionDate) {
            const hourDifference = (submissionDate.getTime() - rentDate.getTime()) / (1000 * 60 * 60);
            if ((report.shift === 'morning' && hourDifference > 24) || 
                (report.shift === 'night' && hourDifference > 12)) {
              status = 'overdue';
            }
          }
        }

        return {
          date: report.rent_date,
          userId: report.user_id,
          driverName: report.driver_name,
          vehicleNumber: report.vehicle_number,
          status,
          shift: report.shift,
          submissionTime: report.created_at,
          earnings: report.total_earnings,
          notes: report.remarks,
        };
      }) || [];

      setCalendarData(processedData);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(addWeeks(currentDate, weekOffset), { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const handlePreviousWeek = () => setWeekOffset(weekOffset - 1);
  const handleNextWeek = () => setWeekOffset(weekOffset + 1);
  const handleCurrentWeek = () => {
    setWeekOffset(0);
    setCurrentDate(new Date());
  };

  const weekDays = getWeekDays();

  return (
    <AdminLayout title="Weekly Rent Calendar">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleCurrentWeek}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </span>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full sm:w-[200px]"
            />
            
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="Select Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name || driver.driver_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="w-full sm:w-[150px] h-9">
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="24hr">24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Rent Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 min-w-[700px] overflow-x-auto">
                {weekDays.map((day, index) => (
                  <div key={index} className={cn(
                    "font-medium text-center py-2",
                    isSameDay(day, new Date()) ? "bg-accent rounded-md" : ""
                  )}>
                    <div className="text-xs text-muted-foreground">
                      {format(day, 'EEE')}
                    </div>
                    <div>{format(day, 'd MMM')}</div>
                  </div>
                ))}

                {drivers
                  .filter(driver => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (driver.name && driver.name.toLowerCase().includes(query)) ||
                      (driver.driver_id && driver.driver_id.toLowerCase().includes(query)) ||
                      (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(query))
                    );
                  })
                  .map((driver) => (
                    <React.Fragment key={driver.id}>
                      <div className="col-span-7 mt-4 mb-2 py-2 bg-muted rounded-md px-3">
                        <div className="font-medium flex items-center gap-2">
                          {driver.name || 'Unknown'}
                          {!driver.online && (
                            <RentStatusBadge status="offline" className="text-xs" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {driver.driver_id} | Vehicle: {driver.vehicle_number || 'N/A'} | 
                          Shift: {driver.shift || 'N/A'}
                        </div>
                      </div>
                      
                      {weekDays.map((day) => {
                        const rentData = calendarData.find(
                          data => data.userId === driver.id && data.date === format(day, 'yyyy-MM-dd')
                        );

                        // Check if the date is before joining date
                        const isBeforeJoining = driver.joining_date && 
                          new Date(format(day, 'yyyy-MM-dd')) < new Date(driver.joining_date);

                        return (
                          <div 
                            key={`${driver.id}-${format(day, 'yyyy-MM-dd')}`}
                            className="min-h-[60px] border rounded-md p-1"
                          >
                            {isBeforeJoining ? (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                                Not joined
                              </div>
                            ) : rentData ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="h-full w-full flex items-center justify-center">
                                      <RentStatusBadge status={rentData.status} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    <div className="space-y-2 p-2">
                                      <div className="font-bold">{rentData.driverName}</div>
                                      <div>Vehicle: {rentData.vehicleNumber || 'N/A'}</div>
                                      <div>Shift: {rentData.shift}</div>
                                      <div>Status: {rentData.status}</div>
                                      {rentData.submissionTime && (
                                        <div>Submitted: {new Date(rentData.submissionTime).toLocaleString()}</div>
                                      )}
                                      {rentData.earnings !== undefined && (
                                        <div>Earnings: ₹{rentData.earnings.toLocaleString()}</div>
                                      )}
                                      {rentData.notes && <div>Notes: {rentData.notes}</div>}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                                -
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
