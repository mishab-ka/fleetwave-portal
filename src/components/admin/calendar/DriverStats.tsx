
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatsCardProps {
  title: string;
  value: number | string;
  description?: string;
  className?: string;
}

const StatsCard = ({ title, value, description, className }: StatsCardProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

interface DriverStatsProps {
  drivers: any[];
  calendarData: any[];
}

export const DriverStats = ({ drivers, calendarData }: DriverStatsProps) => {
  // Get total active drivers (online)
  const totalActiveDrivers = drivers.filter(driver => driver.online).length;
  
  // Get shift distribution
  const morningShiftDrivers = drivers.filter(driver => driver.online && driver.shift === 'morning').length;
  const nightShiftDrivers = drivers.filter(driver => driver.online && driver.shift === 'night').length;
  const fullDayShiftDrivers = drivers.filter(driver => driver.online && driver.shift === '24hr').length;
  
  // Get payment status counts for today
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const todayData = calendarData.filter(data => data.date === todayStr);
  const paidCount = todayData.filter(data => data.status === 'paid').length;
  const pendingCount = todayData.filter(data => data.status === 'pending').length;
  const overdueCount = todayData.filter(data => data.status === 'overdue').length;
  const leaveCount = todayData.filter(data => data.status === 'leave').length;
  
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Driver Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Active Drivers" 
          value={totalActiveDrivers} 
          description="Currently online drivers"
        />
        
        <div className="col-span-2 md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shift Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-amber-100 text-amber-700">
                  Morning: {morningShiftDrivers}
                </Badge>
                <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                  Night: {nightShiftDrivers}
                </Badge>
                <Badge variant="outline" className="bg-purple-100 text-purple-700">
                  24hr: {fullDayShiftDrivers}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-2 md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  Paid: {paidCount}
                </Badge>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                  Pending: {pendingCount}
                </Badge>
                <Badge variant="outline" className="bg-red-100 text-red-700">
                  Overdue: {overdueCount}
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                  Leave: {leaveCount}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
