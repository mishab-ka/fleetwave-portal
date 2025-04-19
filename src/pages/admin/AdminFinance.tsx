
import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BankAccountsSection from '@/components/admin/finance/BankAccountsSection';
import TransactionsSection from '@/components/admin/finance/TransactionsSection';
import FinanceDashboard from '@/components/admin/finance/FinanceDashboard';
import AssetsLiabilitiesSection from '@/components/admin/finance/AssetsLiabilitiesSection';
import ReportsSection from '@/components/admin/finance/ReportsSection';
import CategoriesSection from '@/components/admin/finance/CategoriesSection';
import BalanceSheet from '@/components/admin/finance/BalanceSheet';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const AdminFinance = () => {
  const navigate = useNavigate();
  
  return (
    <AdminLayout title="Finance Management">
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Finance Management</h1>
          <Button 
            onClick={() => navigate('/admin/accounting')}
            className="bg-fleet-purple hover:bg-fleet-purple-dark flex items-center gap-2"
          >
            <BookOpen size={16} />
            <span>Advanced Accounting System</span>
          </Button>
        </div>
        
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-7 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="assets-liabilities">Assets & Liabilities</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <FinanceDashboard />
          </TabsContent>
          
          <TabsContent value="transactions">
            <TransactionsSection />
          </TabsContent>
          
          <TabsContent value="accounts">
            <BankAccountsSection />
          </TabsContent>

          <TabsContent value="balance-sheet">
            <BalanceSheet />
          </TabsContent>
          
          <TabsContent value="categories">
            <CategoriesSection />
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
