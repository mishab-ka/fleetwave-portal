import { supabase } from "@/integrations/supabase/client";

/**
 * HR Activity Tracker Service
 * Tracks and logs HR staff activities for performance monitoring
 */

export type ActivityType =
  | "clock_in"
  | "clock_out"
  | "call_started"
  | "call_completed"
  | "lead_viewed"
  | "lead_updated"
  | "status_updated"
  | "whatsapp_sent"
  | "page_viewed"
  | "search_performed"
  | "export_data"
  | "note_added";

export interface ActivityMetadata {
  lead_id?: string;
  page?: string;
  search_term?: string;
  status_from?: string;
  status_to?: string;
  call_duration?: number;
  [key: string]: any;
}

/**
 * Log a staff activity
 */
export async function logActivity(
  staffUserId: string,
  activityType: ActivityType,
  metadata: ActivityMetadata = {}
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from("hr_staff_activity_log").insert([
      {
        staff_user_id: staffUserId,
        activity_type: activityType,
        description: metadata,
      },
    ]);

    if (error) throw error;

    // Also update last activity time in attendance table
    await updateLastActivity(staffUserId);

    return { success: true };
  } catch (error) {
    console.error("Error logging activity:", error);
    return { success: false, error };
  }
}

/**
 * Update last activity time in attendance table
 */
export async function updateLastActivity(
  staffUserId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Check if attendance record exists for today
    const { data: existingAttendance } = await supabase
      .from("hr_staff_attendance")
      .select("id")
      .eq("staff_user_id", staffUserId)
      .gte("clock_in_time", `${today}T00:00:00`)
      .eq("is_active", true)
      .single();

    if (existingAttendance) {
      // Update existing record
      const { error } = await supabase
        .from("hr_staff_attendance")
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", existingAttendance.id);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating last activity:", error);
    return { success: false, error };
  }
}

/**
 * Check if a staff member is idle (no activity for specified minutes)
 */
export async function checkIdleStatus(
  staffUserId: string,
  idleThresholdMinutes: number = 30
): Promise<{
  isIdle: boolean;
  lastActivityTime: string | null;
  minutesSinceActivity: number;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: attendance } = await supabase
      .from("hr_staff_attendance")
      .select("last_activity_at, is_active")
      .eq("staff_user_id", staffUserId)
      .gte("clock_in_time", `${today}T00:00:00`)
      .eq("is_active", true)
      .single();

    if (!attendance || !attendance.last_activity_at) {
      return {
        isIdle: true,
        lastActivityTime: null,
        minutesSinceActivity: 0,
      };
    }

    const lastActivity = new Date(attendance.last_activity_at);
    const now = new Date();
    const minutesSinceActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    );

    return {
      isIdle: minutesSinceActivity >= idleThresholdMinutes,
      lastActivityTime: attendance.last_activity_at,
      minutesSinceActivity,
    };
  } catch (error) {
    console.error("Error checking idle status:", error);
    return {
      isIdle: false,
      lastActivityTime: null,
      minutesSinceActivity: 0,
    };
  }
}

/**
 * Get recent activities for a staff member
 */
export async function getRecentActivities(
  staffUserId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("hr_staff_activity_log")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return [];
  }
}

/**
 * Get activities for a specific date
 */
export async function getActivitiesForDate(
  staffUserId: string,
  date: string
): Promise<any[]> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("hr_staff_activity_log")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching activities for date:", error);
    return [];
  }
}

/**
 * Get activity summary by hour for a date
 */
export async function getHourlyActivitySummary(
  staffUserId: string,
  date: string
): Promise<{ [hour: string]: number }> {
  try {
    const activities = await getActivitiesForDate(staffUserId, date);

    const hourlySummary: { [hour: string]: number } = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlySummary[i.toString().padStart(2, "0")] = 0;
    }

    // Count activities per hour
    activities.forEach((activity) => {
      const hour = new Date(activity.created_at).getHours();
      const hourKey = hour.toString().padStart(2, "0");
      hourlySummary[hourKey]++;
    });

    return hourlySummary;
  } catch (error) {
    console.error("Error getting hourly activity summary:", error);
    return {};
  }
}

/**
 * Get all active staff (clocked in and not idle)
 */
export async function getActiveStaffList(
  idleThresholdMinutes: number = 30
): Promise<any[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const idleThreshold = new Date();
    idleThreshold.setMinutes(idleThreshold.getMinutes() - idleThresholdMinutes);

    const { data, error } = await supabase
      .from("hr_staff_attendance")
      .select(
        `
        *,
        users!hr_staff_attendance_staff_user_id_fkey (
          id,
          name,
          phone_number
        )
      `
      )
      .eq("date", today)
      .eq("status", "active")
      .gte("last_activity_time", idleThreshold.toISOString());

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting active staff list:", error);
    return [];
  }
}

/**
 * Batch log multiple activities (useful for bulk operations)
 */
export async function batchLogActivities(
  activities: Array<{
    staffUserId: string;
    activityType: ActivityType;
    metadata?: ActivityMetadata;
  }>
): Promise<{ success: boolean; error?: any }> {
  try {
    const activityRecords = activities.map((activity) => ({
      staff_user_id: activity.staffUserId,
      activity_type: activity.activityType,
      description: activity.metadata || {},
    }));

    const { error } = await supabase
      .from("hr_staff_activity_log")
      .insert(activityRecords);

    if (error) throw error;

    // Update last activity time for all unique staff members
    const uniqueStaffIds = [
      ...new Set(activities.map((a) => a.staffUserId)),
    ];
    await Promise.all(
      uniqueStaffIds.map((staffId) => updateLastActivity(staffId))
    );

    return { success: true };
  } catch (error) {
    console.error("Error batch logging activities:", error);
    return { success: false, error };
  }
}

