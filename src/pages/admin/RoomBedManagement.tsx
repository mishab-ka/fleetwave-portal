import React from "react";
import AdminLayout from "@/components/AdminLayout";
import RoomBedManagement from "@/components/RoomBedManagement";

const RoomBedManagementPage: React.FC = () => {
  return (
    <AdminLayout title="Room & Bed Management">
      <RoomBedManagement />
    </AdminLayout>
  );
};

export default RoomBedManagementPage;
