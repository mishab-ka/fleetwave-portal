import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Bed, Calendar } from "lucide-react";

interface RoomBedInfo {
  room_number: number;
  room_name: string;
  bed_number: number;
  bed_name: string;
  assigned_date: string;
  daily_rent: number;
  monthly_rent: number;
}

interface DriverRoomBedInfoProps {
  userId: string;
  showActions?: boolean;
}

const DriverRoomBedInfo: React.FC<DriverRoomBedInfoProps> = ({
  userId,
  showActions = false,
}) => {
  const [roomBedInfo, setRoomBedInfo] = useState<RoomBedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyRent, setMonthlyRent] = useState(0);

  useEffect(() => {
    fetchRoomBedInfo();
  }, [userId]);

  const fetchRoomBedInfo = async () => {
    try {
      setLoading(true);

      // Get current bed assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("bed_assignments")
        .select(
          `
          *,
          bed:beds(
            id,
            bed_number,
            bed_name,
            daily_rent,
            room:rooms(
              id,
              room_number,
              room_name
            )
          )
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .is("end_date", null)
        .single();

      if (assignmentError && assignmentError.code !== "PGRST116") {
        throw assignmentError;
      }

      if (assignment) {
        const bed = assignment.bed;
        const room = bed.room;

        setRoomBedInfo({
          room_number: room.room_number,
          room_name: room.room_name,
          bed_number: bed.bed_number,
          bed_name: bed.bed_name,
          assigned_date: assignment.assigned_date,
          daily_rent: bed.daily_rent,
          monthly_rent: bed.daily_rent * 30, // Approximate monthly rent
        });
      }

      // Calculate actual monthly rent based on reports
      await calculateMonthlyRent();
    } catch (error) {
      console.error("Error fetching room/bed info:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyRent = async () => {
    try {
      const currentMonth = new Date();
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );

      const { data: reports, error } = await supabase
        .from("fleet_reports")
        .select("rent_date")
        .eq("user_id", userId)
        .gte("rent_date", startOfMonth.toISOString().split("T")[0])
        .lte("rent_date", endOfMonth.toISOString().split("T")[0])
        .neq("status", "rejected");

      if (error) throw error;

      const reportCount = reports?.length || 0;
      setMonthlyRent(reportCount * 100); // ₹100 per report
    } catch (error) {
      console.error("Error calculating monthly rent:", error);
    }
  };

  const handleRequestRoomChange = async () => {
    // This would typically open a dialog or navigate to a request form
    // For now, we'll just show a toast
    alert("Room change request functionality would be implemented here");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!roomBedInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Accommodation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Bed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No bed assignment found</p>
            {showActions && (
              <Button variant="outline" size="sm">
                Request Bed Assignment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Accommodation Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Room and Bed Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Room</p>
                <p className="font-semibold">{roomBedInfo.room_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bed className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bed</p>
                <p className="font-semibold">{roomBedInfo.bed_name}</p>
              </div>
            </div>
          </div>

          {/* Assignment Date */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Since</p>
              <p className="font-semibold">
                {new Date(roomBedInfo.assigned_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Rent Information */}
          {/* <div className="border-t pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rent Information</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Daily Rent</p>
                <p className="font-semibold">₹{roomBedInfo.daily_rent}</p>
              </div>
              <div>
                <p className="text-gray-600">This Month</p>
                <p className="font-semibold text-green-600">₹{monthlyRent}</p>
                <p className="text-xs text-gray-500">
                  Based on {Math.floor(monthlyRent / 100)} reports
                </p>
              </div>
            </div>
          </div> */}

          {/* Actions */}
          {showActions && (
            <div className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestRoomChange}
                className="w-full"
              >
                Request Room Change
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverRoomBedInfo;
