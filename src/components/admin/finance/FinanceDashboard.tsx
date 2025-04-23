
import React from 'react';
import { TransactionForm } from './TransactionForm';
import { JournalEntriesView } from './JournalEntriesView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialOverview } from './FinancialOverview';

const FinanceDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <FinancialOverview />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm />
          </CardContent>
        </Card>
        
        <Card>
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
