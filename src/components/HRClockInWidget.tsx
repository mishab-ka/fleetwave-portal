import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  clockIn,
  clockOut,
  getAttendanceStatus,
} from "@/services/hrAttendanceService";
import { checkIdleStatus } from "@/services/hrActivityTracker";
import { toast } from "sonner";

interface HRClockInWidgetProps {
  compact?: boolean;
  onStatusChange?: (isClockedIn: boolean) => void;
}

const HRClockInWidget: React.FC<HRClockInWidgetProps> = ({
  compact = false,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [minutesSinceActivity, setMinutesSinceActivity] = useState(0);
  const [clockInTime, setClockInTime] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAttendanceStatus();
      
      // Update hours worked every minute
      const interval = setInterval(() => {
        if (isClockedIn) {
          fetchAttendanceStatus();
          checkIdle();
        }
      }, 60000); // Every minute

      return () => clearInterval(interval);
    }
  }, [user, isClockedIn]);

  const fetchAttendanceStatus = async () => {
    if (!user) return;

    const status = await getAttendanceStatus(user.id);
    setIsClockedIn(status.isClockedIn);
    setHoursWorked(status.hoursWorked);
    
    if (status.attendance?.clock_in_time) {
      setClockInTime(status.attendance.clock_in_time);
    }

    if (onStatusChange) {
      onStatusChange(status.isClockedIn);
    }
  };

  const checkIdle = async () => {
    if (!user) return;

    const idleStatus = await checkIdleStatus(user.id, 30);
    setIsIdle(idleStatus.isIdle);
    setMinutesSinceActivity(idleStatus.minutesSinceActivity);
  };

  const handleClockIn = async () => {
    if (!user) return;

    setLoading(true);
    const result = await clockIn(user.id);

    if (result.success) {
      toast.success("Clocked in successfully!");
      await fetchAttendanceStatus();
    } else {
      toast.error(result.error || "Failed to clock in");
    }

    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!user) return;

    setLoading(true);
    const result = await clockOut(user.id);

    if (result.success) {
      toast.success(
        `Clocked out successfully! Total hours: ${hoursWorked.toFixed(2)}`
      );
      await fetchAttendanceStatus();
    } else {
      toast.error(result.error || "Failed to clock out");
    }

    setLoading(false);
  };

  const formatTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatClockInTime = (time: string): string => {
    const date = new Date(time);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isClockedIn ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">{formatTime(hoursWorked)}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClockOut}
              disabled={loading}
              className="h-8"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Clock Out
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={handleClockIn}
            disabled={loading}
            className="h-8 bg-green-600 hover:bg-green-700"
          >
            <LogIn className="w-3 h-3 mr-1" />
            Clock In
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="shadow-lg border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isClockedIn
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Attendance</h3>
              <p className="text-xs text-gray-500">
                {isClockedIn ? "Currently working" : "Not clocked in"}
              </p>
            </div>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              isClockedIn ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          ></div>
        </div>

        {isClockedIn && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <span className="text-sm text-gray-600">Hours Worked</span>
              <span className="text-lg font-bold text-blue-600">
                {formatTime(hoursWorked)}
              </span>
            </div>

            {clockInTime && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Clocked In At</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatClockInTime(clockInTime)}
                </span>
              </div>
            )}

            {isIdle && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Idle Detected
                  </p>
                  <p className="text-xs text-yellow-600">
                    No activity for {minutesSinceActivity} minutes
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          className={`w-full h-12 font-semibold ${
            isClockedIn
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              {isClockedIn ? (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  Clock Out
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Clock In
                </>
              )}
            </>
          )}
        </Button>

        {!isClockedIn && (
          <p className="text-xs text-center text-gray-500 mt-3">
            Remember to clock in when you start working
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HRClockInWidget;

