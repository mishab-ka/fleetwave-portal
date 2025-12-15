import { supabase } from "@/integrations/supabase/client";

export interface WorkingHoursData {
  date: string;
  active_work_hours: number;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_sessions: number;
}

export interface WeeklyData {
  week_start: string;
  total_hours: number;
  days_worked: number;
  avg_hours_per_day: number;
}

export interface MonthlyData {
  month: string;
  year: number;
  total_hours: number;
  days_worked: number;
  avg_hours_per_day: number;
}

/**
 * Get working hours for a date range
 */
export async function getWorkingHoursRange(
  staffUserId: string | null,
  startDate: string,
  endDate: string
): Promise<WorkingHoursData[]> {
  try {
    if (staffUserId) {
      // Single staff member - use RPC function
      const { data, error } = await supabase.rpc("get_working_hours_range", {
        p_staff_user_id: staffUserId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } else {
      // All staff - aggregate from daily stats
      const { data, error } = await supabase
        .from("hr_staff_daily_stats")
        .select("date, active_work_hours, clock_in_time, clock_out_time")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;

      // Group by date and sum hours
      const grouped: { [key: string]: WorkingHoursData } = {};
      data?.forEach((record) => {
        const date = record.date;
        if (!grouped[date]) {
          grouped[date] = {
            date,
            active_work_hours: 0,
            clock_in_time: null,
            clock_out_time: null,
            total_sessions: 0,
          };
        }
        grouped[date].active_work_hours += record.active_work_hours || 0;
        if (record.clock_in_time && !grouped[date].clock_in_time) {
          grouped[date].clock_in_time = record.clock_in_time;
        }
        if (record.clock_out_time && !grouped[date].clock_out_time) {
          grouped[date].clock_out_time = record.clock_out_time;
        }
        grouped[date].total_sessions += 1;
      });

      return Object.values(grouped).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  } catch (error) {
    console.error("Error fetching working hours range:", error);
    return [];
  }
}

/**
 * Get weekly working hours
 */
export async function getWeeklyWorkingHours(
  staffUserId: string | null,
  weekStart: Date
): Promise<WeeklyData[]> {
  try {
    const weeks: WeeklyData[] = [];
    const startDate = new Date(weekStart);

    // Get last 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() - i * 7);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      const weekStartStr = weekStartDate.toISOString().split("T")[0];
      const weekEndStr = weekEndDate.toISOString().split("T")[0];

      let query = supabase
        .from("hr_staff_daily_stats")
        .select("date, active_work_hours")
        .gte("date", weekStartStr)
        .lte("date", weekEndStr);

      if (staffUserId) {
        query = query.eq("staff_user_id", staffUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalHours =
        data?.reduce((sum, record) => sum + (record.active_work_hours || 0), 0) || 0;
      const daysWorked =
        data?.filter((record) => (record.active_work_hours || 0) > 0).length || 0;

      weeks.push({
        week_start: weekStartStr,
        total_hours: Math.round(totalHours * 100) / 100,
        days_worked: daysWorked,
        avg_hours_per_day:
          daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
      });
    }

    return weeks;
  } catch (error) {
    console.error("Error fetching weekly working hours:", error);
    return [];
  }
}

/**
 * Get monthly working hours
 */
export async function getMonthlyWorkingHours(
  staffUserId: string | null
): Promise<MonthlyData[]> {
  try {
    const months: MonthlyData[] = [];
    const today = new Date();

    // Get last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const monthStartStr = monthStart.toISOString().split("T")[0];
      const monthEndStr = monthEnd.toISOString().split("T")[0];

      let query = supabase
        .from("hr_staff_daily_stats")
        .select("date, active_work_hours")
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);

      if (staffUserId) {
        query = query.eq("staff_user_id", staffUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalHours =
        data?.reduce((sum, record) => sum + (record.active_work_hours || 0), 0) || 0;
      const daysWorked =
        data?.filter((record) => (record.active_work_hours || 0) > 0).length || 0;

      months.push({
        month: date.toLocaleString("default", { month: "long" }),
        year: year,
        total_hours: Math.round(totalHours * 100) / 100,
        days_worked: daysWorked,
        avg_hours_per_day:
          daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
      });
    }

    return months;
  } catch (error) {
    console.error("Error fetching monthly working hours:", error);
    return [];
  }
}

/**
 * Calculate and update daily working hours for a staff member
 */
export async function updateDailyWorkingHours(
  staffUserId: string,
  date: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("calculate_daily_working_hours", {
      p_staff_user_id: staffUserId,
      p_date: date,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error("Error updating daily working hours:", error);
    return 0;
  }
}

/**
 * Format hours to readable string
 */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

