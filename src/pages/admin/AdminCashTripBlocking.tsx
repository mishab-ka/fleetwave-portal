import React from "react";
import AdminLayout from "@/components/AdminLayout";
import CashTripBlockingList from "@/components/admin/drivers/CashTripBlockingList";

const AdminCashTripBlocking = () => {
  return (
    <AdminLayout title="Cash Trip Blocking">
      <CashTripBlockingList />
    </AdminLayout>
  );
};

export default AdminCashTripBlocking;

