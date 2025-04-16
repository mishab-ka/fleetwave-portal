
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RentStatusBadge } from '@/components/RentStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
          rent_date, shift, rent_paid_status, total_earnings, status,
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
            notes: `Offline since ${format(parseISO(report.users.offline_from_date), 'PP')}`,
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

        // Handle rent status based on fleet_reports status
        let status: RentStatus;
        switch (report.status?.toLowerCase()) {
          case 'approved':
            status = 'paid';
            break;
          case 'pending_for_verification':
            status = 'pending';
            break;
          case 'overdue':
            status = 'overdue';
            break;
          default:
            status = 'pending';
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

  const weekDays = getWeekDays();

  return (
    <AdminLayout title="Weekly Rent Calendar">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setWeekOffset(0);
              setCurrentDate(new Date());
            }}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
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
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-muted/50 w-[250px] sticky left-0">Driver Info</TableHead>
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
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium sticky left-0 bg-background">
                              <div className="space-y-1">
                                <div className="font-semibold flex items-center gap-2">
                                  {driver.name || 'Unknown'}
                                  {!driver.online && (
                                    <RentStatusBadge status="offline" className="text-xs" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ID: {driver.driver_id}<br />
                                  Vehicle: {driver.vehicle_number || 'N/A'}<br />
                                  Shift: {driver.shift || 'N/A'}
                                </div>
                              </div>
                            </TableCell>
                            
                            {weekDays.map((day) => {
                              const rentData = calendarData.find(
                                data => data.userId === driver.id && data.date === format(day, 'yyyy-MM-dd')
                              );
                              const isBeforeJoining = driver.joining_date && 
                                new Date(format(day, 'yyyy-MM-dd')) < new Date(driver.joining_date);

                              return (
                                <TableCell 
                                  key={`${driver.id}-${format(day, 'yyyy-MM-dd')}`}
                                  className="text-center h-[90px]"
                                >
                                  {isBeforeJoining ? (
                                    <div className="text-muted-foreground text-xs">
                                      Not joined
                                    </div>
                                  ) : rentData ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center justify-center">
                                            <RentStatusBadge status={rentData.status} />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="w-[200px]">
                                          <div className="space-y-2">
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
