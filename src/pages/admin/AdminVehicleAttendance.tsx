import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { VehicleAttendance } from "@/components/admin/vehicles/VehicleAttendance";

const AdminVehicleAttendance = () => {
  return (
    <AdminLayout title="Vehicle Attendance">
      <VehicleAttendance />
    </AdminLayout>
  );
};

export default AdminVehicleAttendance;
