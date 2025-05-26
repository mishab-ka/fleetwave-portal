import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VehicleAttendanceCalendar from "@/components/admin/vehicles/VehicleAttendanceCalendar";
import AdminLayout from "@/components/AdminLayout";

const VehicleAttendance = () => {
  return (
    <AdminLayout title="Vehicle Attendance">
      <div className="container mx-auto py-6">
        <Card className="w-full pt-6">
          <CardContent>
            <VehicleAttendanceCalendar />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default VehicleAttendance;
