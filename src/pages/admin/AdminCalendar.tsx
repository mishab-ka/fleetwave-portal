import { useEffect, useState } from "react";
import { format, startOfWeek, addDays, addWeeks, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import RentCalendarTable from "./ui/RentCalanderTable";

const RentDueCalendar = () => {
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterShift, setFilterShift] = useState("all");
  const [loading, setLoading] = useState(false);

  // Generate week days
  useEffect(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    setWeekDays(days);
  }, [currentWeek]);

  // Fetch data from Supabase
  const fetchRentData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rent_due_view")
      .select("*")
      .order("driver_id", { ascending: true });

    if (!error) setShiftData(data);
    // console.log("Fetched data:", data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRentData();

    // Set up realtime subscription
    const rentDueChannel = supabase
      .channel("rent_due_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fleet_reports",
        },
        (payload) => {
          console.log("Change received!", payload);
          fetchRentData(); // Refresh data when changes occur
        }
      )
      .subscribe();

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      supabase.removeChannel(rentDueChannel);
    };
  }, [currentWeek]);

  // Deadline calculation helpers
  const getDeadline = (date: Date, shift: string) => {
    const baseDate = new Date(date);
    switch (shift) {
      case "morning":
        return new Date(baseDate.setHours(17, 0, 0)); // 5 PM deadline
      case "night":
        return new Date(
          new Date(baseDate.setDate(baseDate.getDate() + 1)).setHours(5, 0, 0)
        ); // 5 AM next day deadline
      case "24":
        return new Date(
          new Date(baseDate.setDate(baseDate.getDate() + 1)).setHours(5, 0, 0)
        ); // 5 AM next day deadline
      default:
        return new Date();
    }
  };

  const isOverdue = (submissionDate: string | null, deadline: Date) => {
    if (!submissionDate) return true;
    return new Date(submissionDate) < deadline;
  };

  // Payment status calculation
  const getPaymentStatus = (driver: any, date: Date) => {
    const joinedDate = new Date(driver.joining_date);
    if (date < joinedDate) return null;

    const rentRecord = shiftData.find(
      (record) =>
        record.user_id === driver.user_id &&
        format(new Date(record.rent_date), "yyyy-MM-dd") ===
          format(date, "yyyy-MM-dd")
    );

    const deadline = getDeadline(date, rentRecord?.shift || driver.shift);

    if (!rentRecord) {
      // if (driver.is_online === false) return "Offline"; // 👈 Skip offline drivers who didn't submit
      if (driver.is_online === false) return null; // 👈 Skip offline drivers who didn't submit
      return new Date() > deadline ? "overdue" : "not paid";
    }

    if (rentRecord.rent_status === "Leave") return "leave";
    // if (rentRecord.is_online === false) return "Offline";
    // console.log("Rent Record:", rentRecord.is_online);

    if (rentRecord.rent_verified) return "paid";
    if (new Date(rentRecord.rent_date) > deadline) return "overdue";

    return "pending";
  };

  const uniqueDrivers = Array.from(
    new Map(shiftData.map((d) => [d.user_id, d])).values()
  );

  // Handle payment submission
  const handleMarkAsLeave = async (
    driverId: string,
    driverName: string,
    vehicleNumber: string,
    shift: "morning" | "night",
    date: Date
  ) => {
    const formattedDate = format(date, "yyyy-MM-dd"); // Ensure correct date format

    console.log(
      "Marking as leave:",
      driverId,
      driverName,
      vehicleNumber,
      shift,
      formattedDate
    );

    const { error } = await supabase.from("fleet_reports").upsert({
      user_id: driverId,
      driver_name: driverName,
      vehicle_number: vehicleNumber,
      shift: shift,
      submission_date: formattedDate,
      rent_date: formattedDate,
      rent_paid_status: false, // Since the driver is on leave, rent is not paid
      rent_verified: false, // No verification needed for leave
      status: "leave", // ✅ Explicitly marking as leave
    });

    if (error) {
      console.error("Error updating leave status:", error.message);
    } else {
      fetchRentData(); // Refresh data
    }
  };

  const handleChangeShift = async (
    driverId: string,
    date: Date,
    newShift: "morning" | "night" | "24"
  ) => {
    const formattedDate = format(date, "yyyy-MM-dd");

    const { error } = await supabase.from("shift_history").upsert({
      user_id: driverId,
      shift: newShift,
      effective_from_date: formattedDate,
      // submission_date: formattedDate,
    });

    if (error) {
      console.error("Error changing shift:", error.message);
    } else {
      fetchRentData();
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Rent Due Calendar</h2>

        <div className="flex gap-4 items-center">
          <select
            className="bg-gray-800 text-white px-4 py-2 rounded focus:outline-none"
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
          >
            <option value="all">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="night">Night</option>
            <option value="24">24 Hours</option>
          </select>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => setCurrentWeek((prev) => addWeeks(prev, -1))}
            >
              ←
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded">
              {format(currentWeek, "MMM yyyy")}
            </span>
            <button
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => setCurrentWeek((prev) => addWeeks(prev, 1))}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span className="text-sm">Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span className="text-sm">Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span className="text-sm">Pending Verification</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        </div>
      ) : (
        <RentCalendarTable
          weekDays={weekDays}
          uniqueDrivers={uniqueDrivers}
          filterShift={filterShift}
          getPaymentStatus={getPaymentStatus}
          handleMarkAsLeave={handleMarkAsLeave}
        />
      )}
    </div>
  );
};

export default RentDueCalendar;
