import React from "react";
import AdminLayout from "@/components/AdminLayout";
import ShiftManagement from "@/components/admin/shifts/ShiftManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users2, CalendarClock } from "lucide-react";

const AdminShifts = () => {
  return (
    <AdminLayout title="Shift Management">
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-purple-100 to-purple-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Shift Schedule
            </CardTitle>
            <Clock className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              Morning / Night
            </div>
            <p className="text-sm text-purple-600 mt-2">
              4AM - 4PM / 4PM - 4AM
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-100 to-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Driver Rotation
            </CardTitle>
            <Users2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">Automatic</div>
            <p className="text-sm text-blue-600 mt-2">12-hour shift rotation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">
              Vehicle Assignment
            </CardTitle>
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              2 Drivers Max
            </div>
            <p className="text-sm text-emerald-600 mt-2">Per vehicle limit</p>
          </CardContent>
        </Card>
      </div> */}

      <ShiftManagement />
    </AdminLayout>
  );
};

export default AdminShifts;
