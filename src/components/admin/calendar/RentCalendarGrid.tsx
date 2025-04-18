import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const shiftLabel = {
  morning: "🌅 Morning Shift",
  night: "🌙 Night Shift",
  "24": "🕐 24-Hour Shift",
};

export default function RentCalendarTable({
  weekDays,
  uniqueDrivers,
  filterShift,
  getPaymentStatus,
  handleMarkAsLeave,
}: any) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px] space-y-8">
        {["morning", "night", "24"].map((shift) =>
          filterShift === "all" || filterShift === shift ? (
            <div
              key={shift}
              className="bg-white shadow rounded-xl overflow-hidden border"
            >
              {/* Shift Header */}
              <div className="bg-gray-100 px-4 py-3 text-lg font-semibold text-gray-800 border-b capitalize">
                {shiftLabel[shift]}
              </div>

              {/* Table */}
              <table className="w-full table-fixed text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    {shift === "24" && (
                      <th className="w-32 px-4 py-2 text-left">Driver</th>
                    )}
                    {weekDays.map((day) => (
                      <th
                        key={day.toString()}
                        className="px-4 py-2 text-center"
                      >
                        <div
                          className={cn(
                            "font-medium",
                            isToday(day) && "text-blue-600"
                          )}
                        >
                          {format(day, "EEE")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(day, "dd/MM")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueDrivers
                    .filter((d) => d.shift === shift)
                    .map((driver) => (
                      <tr
                        key={driver.user_id}
                        className="border-t hover:bg-gray-50 transition"
                      >
                        {shift === "24" && (
                          <td className="px-4 py-2 font-medium text-gray-800">
                            {driver.name}
                          </td>
                        )}

                        {weekDays.map((day) => {
                          const status = getPaymentStatus(driver, day);
                          if (!status) return <td key={day.toString()} />;

                          const cellClasses = cn(
                            "px-2 py-2 text-center text-xs font-medium rounded cursor-pointer transition",
                            {
                              "bg-white text-black": status === "leave",
                              "bg-red-400 hover:bg-red-300 text-black":
                                status === "overdue",
                              "bg-green-300": status === "paid",
                              "bg-yellow-200": status === "pending",
                              "bg-gray-200": ![
                                "leave",
                                "overdue",
                                "paid",
                                "pending",
                              ].includes(status),
                            }
                          );

                          return (
                            <td
                              key={day.toString()}
                              onClick={() =>
                                status === "overdue" &&
                                handleMarkAsLeave(
                                  driver.user_id,
                                  driver.name,
                                  driver.vehicle_number,
                                  driver.shift,
                                  day
                                )
                              }
                            >
                              <div className={cellClasses}>
                                {shift === "24" ? (
                                  status
                                ) : (
                                  <>
                                    <div className="truncate">
                                      {driver.name}
                                    </div>
                                    <div className="capitalize text-gray-600">
                                      {status}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
