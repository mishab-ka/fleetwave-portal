import React from "react";
import AdminLayout from "@/components/AdminLayout";
import RefundRequestsList from "@/components/admin/drivers/RefundRequestsList";

const AdminRefundRequests = () => {
  return (
    <AdminLayout title="Refund Requests">
      <RefundRequestsList />
    </AdminLayout>
  );
};

export default AdminRefundRequests;

