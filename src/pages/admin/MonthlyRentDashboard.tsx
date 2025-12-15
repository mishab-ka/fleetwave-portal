import React from "react";
import AdminLayout from "@/components/AdminLayout";
import MonthlyRentDashboard from "@/components/MonthlyRentDashboard";

const MonthlyRentDashboardPage: React.FC = () => {
  return (
    <AdminLayout title="Monthly Rent Dashboard">
      <MonthlyRentDashboard />
    </AdminLayout>
  );
};

export default MonthlyRentDashboardPage;
