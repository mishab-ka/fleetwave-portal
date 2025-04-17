
import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BankAccountsSection from '@/components/admin/finance/BankAccountsSection';
import TransactionsSection from '@/components/admin/finance/TransactionsSection';
import FinanceDashboard from '@/components/admin/finance/FinanceDashboard';
import AssetsLiabilitiesSection from '@/components/admin/finance/AssetsLiabilitiesSection';
import ReportsSection from '@/components/admin/finance/ReportsSection';

const AdminFinance = () => {
  return (
    <AdminLayout title="Finance Management">
      <div className="p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="assets-liabilities">Assets & Liabilities</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <FinanceDashboard />
          </TabsContent>
          
          <TabsContent value="accounts">
            <BankAccountsSection />
          </TabsContent>
          
          <TabsContent value="transactions">
            <TransactionsSection />
          </TabsContent>
          
          <TabsContent value="assets-liabilities">
            <AssetsLiabilitiesSection />
          </TabsContent>
          
          <TabsContent value="reports">
            <ReportsSection />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
