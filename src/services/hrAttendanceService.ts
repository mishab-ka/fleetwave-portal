import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "./hrActivityTracker";

/**
 * HR Attendance Service
 * Manages clock-in/clock-out and work session tracking
 */

export interface AttendanceRecord {
  id: string;
  staff_user_id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number;
  status: "active" | "completed" | "missed" | "auto_clocked_out";
  last_activity_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Clock in a staff member
 */
export async function clockIn(
  staffUserId: string,
  notes?: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Check if already clocked in today (active record with today's clock_in_time)
    const { data: existing } = await supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .gte("clock_in_time", `${today}T00:00:00`)
      .eq("is_active", true)
      .single();

    if (existing) {
      return {
        success: false,
        error: "Already clocked in today",
      };
    }

    // Create new attendance record
    const { data, error } = await supabase
      .from("hr_staff_attendance")
      .insert([
        {
          staff_user_id: staffUserId,
          clock_in_time: now,
          is_active: true,
          last_activity_at: now,
          total_work_duration_seconds: 0,
          total_idle_duration_seconds: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity(staffUserId, "clock_in", {});

    return { success: true, data };
  } catch (error) {
    console.error("Error clocking in:", error);
    return { success: false, error };
  }
}

/**
 * Clock out a staff member
 */
export async function clockOut(
  staffUserId: string,
  notes?: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Get today's attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .gte("clock_in_time", `${today}T00:00:00`)
      .eq("is_active", true)
      .single();

    if (fetchError || !attendance) {
      return {
        success: false,
        error: "No active clock-in found for today",
      };
    }

    // Calculate total duration in seconds
    const clockInTime = new Date(attendance.clock_in_time);
    const clockOutTime = new Date(now);
    const totalSeconds = Math.floor(
      (clockOutTime.getTime() - clockInTime.getTime()) / 1000
    );

    // Update attendance record
    const { data, error } = await supabase
      .from("hr_staff_attendance")
      .update({
        clock_out_time: now,
        total_work_duration_seconds: totalSeconds,
        is_active: false,
      })
      .eq("id", attendance.id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity(staffUserId, "clock_out", {});

    return { success: true, data };
  } catch (error) {
    console.error("Error clocking out:", error);
    return { success: false, error };
  }
}

/**
 * Get current attendance status for a staff member
 */
export async function getAttendanceStatus(
  staffUserId: string
): Promise<{
  isClockedIn: boolean;
  attendance: AttendanceRecord | null;
  hoursWorked: number;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: attendance } = await supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .gte("clock_in_time", `${today}T00:00:00`)
      .eq("is_active", true)
      .single();

    if (!attendance) {
      return {
        isClockedIn: false,
        attendance: null,
        hoursWorked: 0,
      };
    }

    const isClockedIn = attendance.is_active;
    let hoursWorked = (attendance.total_work_duration_seconds || 0) / 3600;

    // If currently clocked in, calculate current hours
    if (isClockedIn && attendance.clock_in_time) {
      const clockInTime = new Date(attendance.clock_in_time);
      const now = new Date();
      hoursWorked =
        (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    }

    return {
      isClockedIn,
      attendance: attendance as AttendanceRecord,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    };
  } catch (error) {
    console.error("Error getting attendance status:", error);
    return {
      isClockedIn: false,
      attendance: null,
      hoursWorked: 0,
    };
  }
}

/**
 * Get all currently active (clocked in) staff
 */
export async function getActiveStaff(): Promise<any[]> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        *,
        users!hr_staff_attendance_staff_user_id_fkey (
          id,
          name,
          phone_number,
          email_id
        )
      `
      )
      .eq("date", today)
      .eq("status", "active");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting active staff:", error);
    return [];
  }
}

/**
 * Auto clock-out staff after specified hours or extended idle time
 */
export async function autoClockOut(
  maxWorkHours: number = 12,
  maxIdleHours: number = 2
): Promise<{ success: boolean; clockedOutCount: number }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Get all active attendance records
    const { data: activeAttendance } = await supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("date", today)
      .eq("status", "active");

    if (!activeAttendance || activeAttendance.length === 0) {
      return { success: true, clockedOutCount: 0 };
    }

    let clockedOutCount = 0;

    for (const attendance of activeAttendance) {
      let shouldAutoClockOut = false;
      let reason = "";

      // Check if worked more than max hours
      if (attendance.clock_in_time) {
        const clockInTime = new Date(attendance.clock_in_time);
        const hoursWorked =
          (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

        if (hoursWorked >= maxWorkHours) {
          shouldAutoClockOut = true;
          reason = `Auto clocked out after ${maxWorkHours} hours`;
        }
      }

      // Check if idle for too long
      if (
        !shouldAutoClockOut &&
        attendance.last_activity_time
      ) {
        const lastActivity = new Date(attendance.last_activity_time);
        const hoursIdle =
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

        if (hoursIdle >= maxIdleHours) {
          shouldAutoClockOut = true;
          reason = `Auto clocked out after ${maxIdleHours} hours of inactivity`;
        }
      }

      if (shouldAutoClockOut) {
        // Calculate total hours
        const clockInTime = new Date(attendance.clock_in_time);
        const totalHours =
          (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

        await supabase
          .from("hr_staff_attendance")
          .update({
            clock_out_time: now.toISOString(),
            total_hours: Math.round(totalHours * 100) / 100,
            status: "auto_clocked_out",
            notes: attendance.notes
              ? `${attendance.notes}\n${reason}`
              : reason,
          })
          .eq("id", attendance.id);

        clockedOutCount++;
      }
    }

    return { success: true, clockedOutCount };
  } catch (error) {
    console.error("Error auto clocking out:", error);
    return { success: false, clockedOutCount: 0 };
  }
}

/**
 * Calculate work hours for a staff member in a date range
 */
export async function calculateWorkHours(
  staffUserId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalHours: number;
  totalDays: number;
  avgHoursPerDay: number;
  records: AttendanceRecord[];
}> {
  try {
    const { data, error } = await supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw error;

    const records = (data || []) as AttendanceRecord[];
    const totalHours = records.reduce(
      (sum, record) => sum + (record.total_hours || 0),
      0
    );
    const totalDays = records.length;
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalDays,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      records,
    };
  } catch (error) {
    console.error("Error calculating work hours:", error);
    return {
      totalHours: 0,
      totalDays: 0,
      avgHoursPerDay: 0,
      records: [],
    };
  }
}

/**
 * Get attendance records for a staff member
 */
export async function getAttendanceRecords(
  staffUserId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 30
): Promise<AttendanceRecord[]> {
  try {
    let query = supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .order("date", { ascending: false });

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as AttendanceRecord[];
  } catch (error) {
    console.error("Error getting attendance records:", error);
    return [];
  }
}

/**
 * Get attendance summary for all staff (for managers)
 */
export async function getTeamAttendanceSummary(date?: string): Promise<any[]> {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        *,
        users!hr_staff_attendance_staff_user_id_fkey (
          id,
          name,
          phone_number,
          email_id
        )
      `
      )
      .eq("date", targetDate)
      .order("clock_in_time", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting team attendance summary:", error);
    return [];
  }
}

/**
 * Mark attendance as missed if no clock-in by specified time
 */
export async function markMissedAttendance(
  cutoffTime: string = "10:00"
): Promise<{ success: boolean; markedCount: number }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const [hours, minutes] = cutoffTime.split(":").map(Number);

    const cutoffDateTime = new Date(today);
    cutoffDateTime.setHours(hours, minutes, 0, 0);

    // Only mark as missed if current time is past cutoff
    if (now < cutoffDateTime) {
      return { success: true, markedCount: 0 };
    }

    // Get all HR staff users
    const { data: hrStaff } = await supabase
      .from("users")
      .select("id")
      .eq("role", "hr_staff");

    if (!hrStaff || hrStaff.length === 0) {
      return { success: true, markedCount: 0 };
    }

    let markedCount = 0;

    for (const staff of hrStaff) {
      // Check if attendance record exists for today
      const { data: existing } = await supabase
        .from("hr_staff_attendance")
        .select("id, status")
        .eq("staff_user_id", staff.id)
        .eq("date", today)
        .single();

      // If no record or status is not active/completed, mark as missed
      if (
        !existing ||
        (existing.status !== "active" && existing.status !== "completed")
      ) {
        if (existing) {
          await supabase
            .from("hr_staff_attendance")
            .update({ status: "missed" })
            .eq("id", existing.id);
        } else {
          await supabase.from("hr_staff_attendance").insert([
            {
              staff_user_id: staff.id,
              date: today,
              status: "missed",
              notes: `Marked as missed - no clock-in by ${cutoffTime}`,
            },
          ]);
        }
        markedCount++;
      }
    }

    return { success: true, markedCount };
  } catch (error) {
    console.error("Error marking missed attendance:", error);
    return { success: false, markedCount: 0 };
  }
}

