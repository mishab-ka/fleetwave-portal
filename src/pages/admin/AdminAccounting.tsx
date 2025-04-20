
import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountingDashboard } from '@/components/admin/finance/accounting/AccountingDashboard';
import { AccountingTransactionForm } from '@/components/admin/finance/accounting/AccountingTransactionForm';
import { JournalEntriesList } from '@/components/admin/finance/accounting/JournalEntriesList';
import { ChartOfAccounts } from '@/components/admin/finance/accounting/ChartOfAccounts';
import { IncomeStatementReport } from '@/components/admin/finance/accounting/IncomeStatementReport';
import { BalanceSheetReport } from '@/components/admin/finance/accounting/BalanceSheetReport';
import { CashFlowReport } from '@/components/admin/finance/accounting/CashFlowReport';

const AdminAccounting = () => {
  return (
    <AdminLayout title="Accounting System">
      <div className="p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-7 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">New Transaction</TabsTrigger>
            <TabsTrigger value="journal">Journal Entries</TabsTrigger>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <AccountingDashboard />
          </TabsContent>
          
          <TabsContent value="transactions">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Create New Transaction</h2>
              <AccountingTransactionForm />
            </div>
          </TabsContent>
          
          <TabsContent value="journal">
            <JournalEntriesList />
          </TabsContent>
          
          <TabsContent value="accounts">
            <ChartOfAccounts />
          </TabsContent>
          
          <TabsContent value="income-statement">
            <IncomeStatementReport />
          </TabsContent>
          
          <TabsContent value="balance-sheet">
            <BalanceSheetReport />
          </TabsContent>
          
          <TabsContent value="cash-flow">
            <CashFlowReport />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAccounting;
