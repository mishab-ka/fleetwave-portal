import React from "react";
import AdminLayout from "@/components/AdminLayout";
import VehicleAttendanceCalendar from "@/components/admin/vehicles/VehicleAttendanceCalendar";
import { Card, CardContent } from "@/components/ui/card";

const AdminVehicleAttendance = () => {
  return (
    <AdminLayout title="Vehicle Attendance">
      <div className=" mx-auto ">
        <Card className="w-full pt-6">
          <CardContent>
            <VehicleAttendanceCalendar />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminVehicleAttendance;
