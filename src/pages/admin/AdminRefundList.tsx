import React from "react";
import AdminLayout from "@/components/AdminLayout";
import RefundList from "@/components/admin/drivers/RefundList";

const AdminRefundList = () => {
  return (
    <AdminLayout title="Refund List">
      <RefundList />
    </AdminLayout>
  );
};

export default AdminRefundList;

