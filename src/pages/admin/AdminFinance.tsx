import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BankAccountsSection from "@/components/admin/finance/BankAccountsSection";
import TransactionsSection from "@/components/admin/finance/TransactionsSection";
import FinanceDashboard from "@/components/admin/finance/FinanceDashboard";
import AssetsLiabilitiesSection from "@/components/admin/finance/AssetsLiabilitiesSection";
import FinancialReportsSection from "@/components/admin/finance/FinancialReportsSection";
import CategoriesSection from "@/components/admin/finance/CategoriesSection";
import JournalEntriesSection from "@/components/admin/finance/JournalEntriesSection";
import ChartOfAccountsSection from "@/components/admin/finance/ChartOfAccountsSection";
import AccountsPayableSection from "@/components/admin/finance/AccountsPayableSection";
import { useFinanceRefresh } from "@/hooks/useFinanceRefresh";

const AdminFinance = () => {
  const { refreshTrigger, triggerRefresh } = useFinanceRefresh();

  return (
    <AdminLayout title="Finance Management">
      <div className="p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-9 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">
              Chart of Accounts
            </TabsTrigger>
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="accounts-payable">Accounts Payable</TabsTrigger>
            <TabsTrigger value="assets-liabilities">
              Assets & Liabilities
            </TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FinanceDashboard />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsSection onTransactionAdded={triggerRefresh} />
          </TabsContent>

          <TabsContent value="accounts">
            <BankAccountsSection />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesSection />
          </TabsContent>

          <TabsContent value="chart-of-accounts">
            <ChartOfAccountsSection refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="journal-entries"></TabsContent>

          <TabsContent value="accounts-payable">
            <AccountsPayableSection refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="assets-liabilities">
            <AssetsLiabilitiesSection refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReportsSection refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
