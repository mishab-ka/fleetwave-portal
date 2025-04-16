
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tables } from '@/integrations/supabase/types';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type User = Tables<'users'>;
type FleetReport = Tables<'fleet_reports'>;
type RentHistory = Tables<'rent_history'>;
type ShiftHistory = Tables<'shift_history'>;

type RentStatusData = {
  date: string;
  userId: string;
  driverName: string;
  vehicleNumber: string | null;
  status: 'paid' | 'overdue' | 'pending' | 'leave';
  shift: string;
  submissionTime?: string;
  earnings?: number;
  notes?: string;
};

const statusColors = {
  paid: 'bg-green-500',
  overdue: 'bg-red-500',
  pending: 'bg-yellow-500',
  leave: 'bg-blue-500',
};

const statusEmojis = {
  paid: '✅',
  overdue: '❌',
  pending: '⏳',
  leave: '☀️',
};

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<RentStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

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
          remarks, created_at
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
        let status: 'paid' | 'overdue' | 'pending' | 'leave' = 'pending';
        
        if (report.rent_paid_status === true) {
          status = 'paid';
        } else {
          const submissionDate = report.created_at ? new Date(report.created_at) : null;
          const rentDate = new Date(report.rent_date);
          
          if (submissionDate) {
            const hourDifference = (submissionDate.getTime() - rentDate.getTime()) / (1000 * 60 * 60);
            if (report.shift === 'morning' && hourDifference > 24) {
              status = 'overdue';
            } else if (report.shift === 'night' && hourDifference > 12) {
              status = 'overdue';
            }
          } else {
            const now = new Date();
            const dayDifference = (now.getTime() - rentDate.getTime()) / (1000 * 60 * 60 * 24);
            if (dayDifference > 1) {
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

  const handlePreviousWeek = () => {
    setWeekOffset(weekOffset - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const handleCurrentWeek = () => {
    setWeekOffset(0);
    setCurrentDate(new Date());
  };

  const getStatusForCell = (date: Date, driverId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const driverEntries = calendarData.filter(
      entry => entry.userId === driverId && entry.date === dateStr
    );
    
    return driverEntries.length > 0 ? driverEntries[0] : null;
  };

  const filteredDrivers = drivers.filter(driver => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (driver.name && driver.name.toLowerCase().includes(query)) ||
      (driver.driver_id && driver.driver_id.toLowerCase().includes(query)) ||
      (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(query))
    );
  });

  const RentStatusTooltip = ({ data }: { data: RentStatusData }) => (
    <div className="space-y-2 p-2">
      <div className="font-bold">{data.driverName}</div>
      {data.vehicleNumber && <div>Vehicle: {data.vehicleNumber}</div>}
      <div>Shift: {data.shift}</div>
      <div>Status: {data.status.charAt(0).toUpperCase() + data.status.slice(1)}</div>
      {data.submissionTime && (
        <div>Submitted: {new Date(data.submissionTime).toLocaleString()}</div>
      )}
      {data.earnings !== undefined && (
        <div>Earnings: ₹{data.earnings.toLocaleString()}</div>
      )}
      {data.notes && <div>Notes: {data.notes}</div>}
    </div>
  );

  const weekDays = getWeekDays();

  return (
    <AdminLayout title="Weekly Rent Calendar">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCurrentWeek}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-full sm:w-auto">
              <Input
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            
            <Select 
              value={selectedDriver} 
              onValueChange={setSelectedDriver}
            >
              <SelectTrigger className="w-[180px] h-9">
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
            
            <Select 
              value={selectedShift} 
              onValueChange={setSelectedShift}
            >
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
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-start">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center">
              <span className={`w-3 h-3 rounded-full ${color} mr-2`}></span>
              <span className="text-sm">{status.charAt(0).toUpperCase() + status.slice(1)} {statusEmojis[status as keyof typeof statusEmojis]}</span>
            </div>
          ))}
        </div>
        
        <div className="overflow-x-auto">
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
                <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                  {weekDays.map((day, index) => (
                    <div 
                      key={index}
                      className={`font-medium text-center py-2 ${
                        isSameDay(day, new Date()) ? 'bg-accent rounded-md' : ''
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'EEE')}
                      </div>
                      <div>{format(day, 'd MMM')}</div>
                    </div>
                  ))}
                  
                  {filteredDrivers.length === 0 ? (
                    <div className="col-span-7 py-8 text-center text-muted-foreground">
                      No drivers found matching your criteria
                    </div>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <React.Fragment key={driver.id}>
                        <div className="col-span-7 mt-4 mb-2 py-2 bg-muted rounded-md px-3">
                          <div className="font-medium">{driver.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {driver.driver_id} | Vehicle: {driver.vehicle_number || 'N/A'} | 
                            Shift: {driver.shift || 'N/A'}
                          </div>
                        </div>
                        
                        {weekDays.map((day, index) => {
                          const status = getStatusForCell(day, driver.id || '');
                          return (
                            <div 
                              key={`${driver.id}-${index}`}
                              className="min-h-[60px] border rounded-md p-1"
                            >
                              {status ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={`
                                          h-full w-full rounded-md flex items-center justify-center 
                                          ${statusColors[status.status]} bg-opacity-20 cursor-pointer
                                        `}
                                      >
                                        <span className="text-xl">
                                          {statusEmojis[status.status]}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <RentStatusTooltip data={status} />
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
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
