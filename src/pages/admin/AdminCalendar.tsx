
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CalendarHeader } from '@/components/admin/calendar/CalendarHeader';
import { RentCalendarGrid } from '@/components/admin/calendar/RentCalendarGrid';
import { useIsMobile } from '@/hooks/use-mobile';

// Define the RentStatus type to fix the TypeScript error
type RentStatus = 'paid' | 'overdue' | 'pending' | 'leave' | 'offline';

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any[]>([]);
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
      const endDate = format(addDays(weekStart, isMobile ? 1 : 6), 'yyyy-MM-dd');
      
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

      const processedData: any[] = reportsData?.map(report => {
        // Check if user is offline
        if (!report.users.online) {
          return {
            date: report.rent_date,
            userId: report.user_id,
            driverName: report.driver_name,
            vehicleNumber: report.vehicle_number,
            status: 'offline' as RentStatus,
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
            status: 'leave' as RentStatus,
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

  const filteredDrivers = drivers.filter(driver => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (driver.name && driver.name.toLowerCase().includes(query)) ||
      (driver.driver_id && driver.driver_id.toLowerCase().includes(query)) ||
      (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(query))
    );
  });

  return (
    <AdminLayout title="Rent Due Calendar">
      <div className="space-y-4">
        {!isMobile && (
          <div className="flex justify-end">
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}

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
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
