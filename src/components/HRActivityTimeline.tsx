import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, User, MessageSquare } from "lucide-react";

interface HRActivityTimelineProps {
  hourlyBreakdown: { [hour: string]: number };
  date?: string;
  showLabels?: boolean;
}

const HRActivityTimeline: React.FC<HRActivityTimelineProps> = ({
  hourlyBreakdown,
  date,
  showLabels = true,
}) => {
  // Get max value for scaling
  const maxActivities = Math.max(...Object.values(hourlyBreakdown), 1);

  // Define work hours (9 AM to 6 PM)
  const workHours = Array.from({ length: 24 }, (_, i) => i);

  const getActivityColor = (count: number): string => {
    if (count === 0) return "bg-gray-100";
    const intensity = count / maxActivities;
    if (intensity >= 0.75) return "bg-green-500";
    if (intensity >= 0.5) return "bg-blue-500";
    if (intensity >= 0.25) return "bg-yellow-500";
    return "bg-orange-400";
  };

  const getBarHeight = (count: number): string => {
    if (count === 0) return "h-1";
    const percentage = (count / maxActivities) * 100;
    return `h-[${Math.max(percentage, 10)}%]`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Activity Timeline
          {date && (
            <span className="text-sm font-normal text-gray-500">
              - {new Date(date).toLocaleDateString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="relative">
            <div className="flex items-end justify-between gap-1 h-32">
              {workHours.map((hour) => {
                const hourKey = hour.toString().padStart(2, "0");
                const count = hourlyBreakdown[hourKey] || 0;
                const isWorkHour = hour >= 9 && hour <= 18;

                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                  >
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${getActivityColor(
                        count
                      )} ${
                        count === 0 ? "h-1" : ""
                      } group-hover:opacity-80 cursor-pointer`}
                      style={{
                        height: count > 0 ? `${(count / maxActivities) * 100}%` : "4px",
                        minHeight: "4px",
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          <div className="font-semibold">
                            {hour === 0
                              ? "12 AM"
                              : hour < 12
                              ? `${hour} AM`
                              : hour === 12
                              ? "12 PM"
                              : `${hour - 12} PM`}
                          </div>
                          <div>{count} activities</div>
                        </div>
                        <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                      </div>
                    </div>

                    {/* Hour label (show every 3 hours) */}
                    {showLabels && hour % 3 === 0 && (
                      <div
                        className={`text-xs mt-1 ${
                          isWorkHour ? "text-gray-700 font-medium" : "text-gray-400"
                        }`}
                      >
                        {hour === 0
                          ? "12a"
                          : hour < 12
                          ? `${hour}a`
                          : hour === 12
                          ? "12p"
                          : `${hour - 12}p`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Work hours indicator */}
            <div className="absolute bottom-6 left-0 right-0 h-px bg-gray-200 pointer-events-none"></div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-600">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded border border-gray-300"></div>
              <span className="text-gray-600">None</span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {Object.values(hourlyBreakdown).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-xs text-gray-500">Total Activities</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {Object.values(hourlyBreakdown).filter((v) => v > 0).length}
              </div>
              <div className="text-xs text-gray-500">Active Hours</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {maxActivities}
              </div>
              <div className="text-xs text-gray-500">Peak Hour</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HRActivityTimeline;

