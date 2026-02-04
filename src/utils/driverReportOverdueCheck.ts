import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  processReportData,
  determineOverdueStatus,
} from "@/components/admin/calendar/CalendarUtils";

/**
 * Check if a driver has overdue or rejected reports (report submission overdue).
 * Uses the same logic as CalendarUtils - overdue = report not submitted past deadline.
 */
export const getDriverBlockingIssues = async (
  driver: {
    id: string;
    shift?: string;
    joining_date?: string;
    online?: boolean;
    offline_from_date?: string;
    online_from_date?: string;
  } | null
): Promise<{ overdueCount: number; rejectedCount: number }> => {
  if (!driver) return { overdueCount: 0, rejectedCount: 0 };

  try {
    const today = new Date();
    const baseStart = new Date();
    baseStart.setDate(baseStart.getDate() - 30);

    const joiningDate = driver.joining_date
      ? new Date(driver.joining_date)
      : null;

    let startDate = baseStart;
    if (joiningDate && joiningDate > baseStart) {
      startDate = new Date(
        joiningDate.getFullYear(),
        joiningDate.getMonth(),
        joiningDate.getDate()
      );
    }

    const endDate = today;
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    const { data: reports, error: reportsError } = await supabase
      .from("fleet_reports")
      .select(
        `
        *,
        users!fleet_reports_user_id_fkey (
          id,
          name,
          online,
          joining_date,
          offline_from_date,
          online_from_date,
          shift
        )
      `
      )
      .eq("user_id", driver.id)
      .gte("rent_date", startDateStr)
      .lte("rent_date", endDateStr)
      .order("rent_date", { ascending: true });

    if (reportsError) throw reportsError;

    const reportsByDate: Record<string, any[]> = {};
    reports?.forEach((report) => {
      const dateStr = report.rent_date;
      if (!reportsByDate[dateStr]) reportsByDate[dateStr] = [];
      reportsByDate[dateStr].push(report);
    });

    let overdueCount = 0;
    let rejectedCount = 0;
    const cursor = new Date(startDate);

    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0];
      const dayReports = reportsByDate[dateStr];

      if (dayReports && dayReports.length > 0) {
        dayReports.forEach((report) => {
          const processed = processReportData(report);
          if (processed.status === "overdue") overdueCount += 1;
          else if (processed.status === "rejected") rejectedCount += 1;
        });
      } else {
        const driverShift = driver.shift || "none";
        const status = determineOverdueStatus(
          dateStr,
          driverShift,
          driver.joining_date,
          driver.online ?? true,
          driver.offline_from_date,
          driver.online_from_date
        );
        if (status === "overdue") overdueCount += 1;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return { overdueCount, rejectedCount };
  } catch (error) {
    console.error("Error checking driver report overdue:", error);
    return { overdueCount: 0, rejectedCount: 0 };
  }
};
