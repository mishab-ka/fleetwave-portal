
import React, { useState, useEffect } from 'react';
import { TransactionForm } from './TransactionForm';
import { JournalEntriesView } from './JournalEntriesView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { RentStatusBadge } from '@/components/RentStatusBadge';
import { format } from 'date-fns';

const FinanceDashboard: React.FC = () => {
  const [todayStats, setTodayStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    leave: 0
  });

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('fleet_reports')
        .select('status')
        .eq('rent_date', today);
      
      if (error) throw error;
      
      if (data) {
        const stats = {
          total: data.length,
          paid: data.filter(r => r.status === 'approved').length,
          pending: data.filter(r => r.status === 'pending_verification').length,
          overdue: data.filter(r => r.status === 'overdue').length,
          leave: data.filter(r => r.status === 'leave').length
        };
        
        setTodayStats(stats);
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.total}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <RentStatusBadge status="paid" showText={false} />
              <span className="text-xs">{todayStats.paid}</span>
              
              <RentStatusBadge status="pending" showText={false} />
              <span className="text-xs">{todayStats.pending}</span>
              
              <RentStatusBadge status="overdue" showText={false} />
              <span className="text-xs">{todayStats.overdue}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm />
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <JournalEntriesView />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
