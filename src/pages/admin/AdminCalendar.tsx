
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
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

// Define the types for our rent data
type User = Tables<'users'>;
type FleetReport = Tables<'fleet_reports'>;
type RentHistory = Tables<'rent_history'>;

// Combined type for calendar display data
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
      // Calculate start and end dates for the current week view
      const weekStart = startOfWeek(addWeeks(currentDate, weekOffset), { weekStartsOn: 1 });
      
      // Format dates for query
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 13), 'yyyy-MM-dd');
      
      // Build query for fleet reports
      let query = supabase
        .from('fleet_reports')
        .select(`
          id, user_id, driver_name, vehicle_number, submission_date, 
          rent_date, shift, rent_paid_status, total_earnings, 
          remarks, created_at
        `)
        .gte('rent_date', startDate)
        .lte('rent_date', endDate);
      
      // Apply filters if selected
      if (selectedDriver !== 'all') {
        query = query.eq('user_id', selectedDriver);
      }
      
      if (selectedShift !== 'all') {
        query = query.eq('shift', selectedShift);
      }
      
      // Execute query
      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Process the data for the calendar
      const processedData: RentStatusData[] = [];
      
      if (reportsData && reportsData.length > 0) {
        reportsData.forEach(report => {
          // Determine status based on paid status and submission time
          let status: 'paid' | 'overdue' | 'pending' | 'leave' = 'pending';
          
          if (report.rent_paid_status === true) {
            status = 'paid';
          } else {
            // Calculate if overdue based on shift and submission time
            // Assuming rent is overdue if not submitted within 12 hours after shift end
            const submissionDate = report.created_at ? new Date(report.created_at) : null;
            const rentDate = new Date(report.rent_date);
            
            // Morning shift: 4 AM to 4 PM, submit by 4 AM next day
            // Night shift: 4 PM to 4 AM, submit by 4 PM same day
            if (submissionDate) {
              const hourDifference = (submissionDate.getTime() - rentDate.getTime()) / (1000 * 60 * 60);
              if (report.shift === 'morning' && hourDifference > 24) {
                status = 'overdue';
              } else if (report.shift === 'night' && hourDifference > 12) {
                status = 'overdue';
              }
            } else {
              // If no submission date but past due date, mark as overdue
              const now = new Date();
              const dayDifference = (now.getTime() - rentDate.getTime()) / (1000 * 60 * 60 * 24);
              if (dayDifference > 1) {
                status = 'overdue';
              }
            }
          }

          processedData.push({
            date: report.rent_date,
            userId: report.user_id,
            driverName: report.driver_name,
            vehicleNumber: report.vehicle_number,
            status,
            shift: report.shift,
            submissionTime: report.created_at,
            earnings: report.total_earnings,
            notes: report.remarks,
          });
        });
      }

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
    for (let i = 0; i < 14; i++) {
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
    
    if (driverEntries.length === 0) return null;
    
    // Return the first entry's status for simplicity
    // In a real app, you might want to handle multiple entries differently
    return driverEntries[0];
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
    <AdminLayout title="Rent Calendar">
      <div className="space-y-6">
        {/* Filters and navigation */}
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
              {format(weekDays[0], 'MMM d')} - {format(weekDays[13], 'MMM d, yyyy')}
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
        
        {/* Status legend */}
        <div className="flex flex-wrap gap-4 justify-start">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full bg-green-500 mr-2`}></span>
            <span className="text-sm">Paid {statusEmojis.paid}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full bg-red-500 mr-2`}></span>
            <span className="text-sm">Overdue {statusEmojis.overdue}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full bg-yellow-500 mr-2`}></span>
            <span className="text-sm">Pending {statusEmojis.pending}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full bg-blue-500 mr-2`}></span>
            <span className="text-sm">Leave {statusEmojis.leave}</span>
          </div>
        </div>
        
        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <Card>
            <CardHeader>
              <CardTitle>Rent Due Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                  {/* Header row - Dates */}
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
                  
                  {/* Driver rows */}
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
        
        {/* Mobile view - Calendar cards */}
        <div className="md:hidden mt-6 space-y-4">
          <h3 className="text-lg font-medium">Daily Status</h3>
          
          {weekDays.map((day, dayIndex) => (
            <Card key={dayIndex} className="overflow-hidden">
              <CardHeader className="p-4 bg-muted">
                <CardTitle className="text-base">
                  {format(day, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {filteredDrivers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-2">
                    No drivers found
                  </p>
                ) : (
                  filteredDrivers.map((driver) => {
                    const status = getStatusForCell(day, driver.id || '');
                    return (
                      <div 
                        key={`mobile-${driver.id}-${dayIndex}`}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium">{driver.name || driver.driver_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {driver.vehicle_number || 'No vehicle'} | {driver.shift || 'No shift'}
                          </div>
                        </div>
                        
                        {status ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className={`
                                  ${statusColors[status.status]} bg-opacity-20
                                  hover:bg-opacity-30
                                `}
                              >
                                {statusEmojis[status.status]} {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent>
                              <RentStatusTooltip data={status} />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Badge variant="outline">No data</Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
