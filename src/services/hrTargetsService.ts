import { supabase } from "@/integrations/supabase/client";

/**
 * HR Targets and Alerts Service
 * Manages performance targets and generates automated alerts
 */

export type TargetType = "daily" | "weekly" | "monthly";
export type AlertType =
  | "target_missed"
  | "low_activity"
  | "no_clock_in"
  | "idle_time"
  | "late_clock_in"
  | "early_clock_out"
  | "low_conversion"
  | "no_calls"
  | "target_50_percent"
  | "target_achieved"
  | "excellent_performance";
export type AlertSeverity = "info" | "warning" | "critical";

export interface Target {
  id: string;
  staff_user_id: string;
  target_type: string;
  target_value: number;
  period: "daily" | "weekly" | "monthly";
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAlert {
  id: string;
  staff_user_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  date: string;
  is_read: boolean;
  is_resolved: boolean;
  metadata: any;
  created_at: string;
}

/**
 * Get active targets for a staff member
 */
export async function getActiveTargets(
  staffUserId: string,
  period?: "daily" | "weekly" | "monthly"
): Promise<Target[]> {
  try {
    let query = supabase
      .from("hr_staff_targets")
      .select("*")
      .eq("is_active", true)
      .eq("staff_user_id", staffUserId)
      .order("created_at", { ascending: false });

    if (period) {
      query = query.eq("period", period);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as Target[];
  } catch (error) {
    console.error("Error getting active targets:", error);
    return [];
  }
}

/**
 * Create or update a target
 */
export async function setTarget(
  target: Partial<Target>,
  createdBy: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const targetData = {
      ...target,
      created_by: createdBy,
    };

    if (target.id) {
      // Update existing target
      const { data, error } = await supabase
        .from("hr_staff_targets")
        .update(targetData)
        .eq("id", target.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } else {
      // Create new target
      const { data, error } = await supabase
        .from("hr_staff_targets")
        .insert([targetData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    console.error("Error setting target:", error);
    return { success: false, error };
  }
}

/**
 * Check daily targets and generate alerts
 */
export async function checkDailyTargets(): Promise<{
  success: boolean;
  alertsGenerated: number;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentHour = new Date().getHours();

    // Get all HR staff
    const { data: hrStaff } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "hr_staff");

    if (!hrStaff || hrStaff.length === 0) {
      return { success: true, alertsGenerated: 0 };
    }

    let alertsGenerated = 0;

    for (const staff of hrStaff) {
      // Get daily targets
      const targets = await getActiveTargets(staff.id, "daily");
      if (targets.length === 0) continue;

      const target = targets[0]; // Use first active target

      // Get today's metrics
      const { data: metrics } = await supabase
        .from("hr_staff_daily_stats")
        .select("*")
        .eq("staff_user_id", staff.id)
        .eq("date", today)
        .maybeSingle();

      const totalCalls = metrics?.total_calls || 0;
      const successfulCalls = metrics?.successful_calls || 0;

      // Check for no clock-in (after 10 AM)
      if (currentHour >= 10) {
        const { data: attendance } = await supabase
          .from("hr_staff_attendance")
          .select("status")
          .eq("staff_user_id", staff.id)
          .eq("date", today)
          .single();

        if (!attendance || attendance.status === "missed") {
          await createAlert({
            staff_user_id: staff.id,
            alert_type: "no_clock_in",
            severity: "critical",
            message: `${staff.name || "Staff member"} has not clocked in today`,
            date: today,
          });
          alertsGenerated++;
        }
      }

      // Check for no calls (after 12 PM)
      if (currentHour >= 12 && totalCalls === 0) {
        await createAlert({
          staff_user_id: staff.id,
          alert_type: "no_calls",
          severity: "warning",
          message: `${staff.name || "Staff member"} has made no calls today`,
          date: today,
        });
        alertsGenerated++;
      }

      // Check 50% target achievement (at 2 PM)
      if (currentHour >= 14 && target.target_value > 0) {
        const achievementPercent = (totalCalls / target.target_value) * 100;

        if (achievementPercent < 50) {
          await createAlert({
            staff_user_id: staff.id,
            alert_type: "target_50_percent",
            severity: "warning",
            message: `${staff.name || "Staff member"} is at ${Math.round(achievementPercent)}% of daily target (${totalCalls}/${target.target_value} calls)`,
            date: today,
            metadata: {
              target_calls: target.target_value,
              actual_calls: totalCalls,
              achievement_percent: achievementPercent,
            },
          });
          alertsGenerated++;
        }
      }

      // End of day check (at 6 PM)
      if (currentHour >= 18) {
        // Check if target was missed
        if (target.target_value > 0 && totalCalls < target.target_value) {
          const achievementPercent = (totalCalls / target.target_value) * 100;

          await createAlert({
            staff_user_id: staff.id,
            alert_type: "target_missed",
            severity: "warning",
            message: `${staff.name || "Staff member"} missed daily target: ${totalCalls}/${target.target_value} calls (${Math.round(achievementPercent)}%)`,
            date: today,
            metadata: {
              target_calls: target.target_value,
              actual_calls: totalCalls,
              achievement_percent: achievementPercent,
            },
          });
          alertsGenerated++;
        }

        // Check for excellent performance
        if (target.target_value > 0 && totalCalls >= target.target_value * 1.2) {
          await createAlert({
            staff_user_id: staff.id,
            alert_type: "excellent_performance",
            severity: "info",
            message: `${staff.name || "Staff member"} exceeded daily target by 20%! (${totalCalls}/${target.target_value} calls)`,
            date: today,
            metadata: {
              target_calls: target.target_value,
              actual_calls: totalCalls,
            },
          });
          alertsGenerated++;
        }

        // Check low conversion rate
        if (totalCalls >= 10) {
          const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

          if (conversionRate < 30) {
            await createAlert({
              staff_user_id: staff.id,
              alert_type: "low_conversion",
              severity: "warning",
              message: `${staff.name || "Staff member"} has low conversion rate: ${Math.round(conversionRate)}%`,
              date: today,
              metadata: {
                total_calls: totalCalls,
                successful_calls: successfulCalls,
                conversion_rate: conversionRate,
              },
            });
            alertsGenerated++;
          }
        }
      }
    }

    return { success: true, alertsGenerated };
  } catch (error) {
    console.error("Error checking daily targets:", error);
    return { success: false, alertsGenerated: 0 };
  }
}

/**
 * Check weekly targets and generate alerts
 */
export async function checkWeeklyTargets(): Promise<{
  success: boolean;
  alertsGenerated: number;
}> {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Only check on Friday (5) or Saturday (6)
    if (dayOfWeek < 5) {
      return { success: true, alertsGenerated: 0 };
    }

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const todayStr = today.toISOString().split("T")[0];

    // Get all HR staff
    const { data: hrStaff } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "hr_staff");

    if (!hrStaff || hrStaff.length === 0) {
      return { success: true, alertsGenerated: 0 };
    }

    let alertsGenerated = 0;

    for (const staff of hrStaff) {
      // Get weekly targets
      const targets = await getActiveTargets(staff.id, "weekly");
      if (targets.length === 0) continue;

      const target = targets[0];

      // Get week's metrics
      const { data: weekMetrics } = await supabase
        .from("hr_staff_daily_stats")
        .select("total_calls, successful_calls")
        .eq("staff_user_id", staff.id)
        .gte("date", weekStartStr)
        .lte("date", todayStr);

      const totalCalls = weekMetrics?.reduce((sum, m) => sum + (m.total_calls || 0), 0) || 0;
      const successfulCalls = weekMetrics?.reduce((sum, m) => sum + (m.successful_calls || 0), 0) || 0;

      // Check if weekly target was missed
      if (target.target_value > 0 && totalCalls < target.target_value) {
        const achievementPercent = (totalCalls / target.target_value) * 100;

        await createAlert({
          staff_user_id: staff.id,
          alert_type: "target_missed",
          severity: "warning",
          message: `${staff.name || "Staff member"} missed weekly target: ${totalCalls}/${target.target_value} calls (${Math.round(achievementPercent)}%)`,
          date: todayStr,
          metadata: {
            target_calls: target.target_value,
            actual_calls: totalCalls,
            achievement_percent: achievementPercent,
            period: "weekly",
          },
        });
        alertsGenerated++;
      }

      // Check for excellent weekly performance
      if (target.target_value > 0 && totalCalls >= target.target_value * 1.2) {
        await createAlert({
          staff_user_id: staff.id,
          alert_type: "excellent_performance",
          severity: "info",
          message: `${staff.name || "Staff member"} exceeded weekly target by 20%! (${totalCalls}/${target.target_value} calls)`,
          date: todayStr,
          metadata: {
            target_calls: target.target_value,
            actual_calls: totalCalls,
            period: "weekly",
          },
        });
        alertsGenerated++;
      }
    }

    return { success: true, alertsGenerated };
  } catch (error) {
    console.error("Error checking weekly targets:", error);
    return { success: false, alertsGenerated: 0 };
  }
}

/**
 * Create a performance alert
 */
export async function createAlert(
  alert: Partial<PerformanceAlert>
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Check if similar alert already exists today
    const { data: existing } = await supabase
      .from("hr_performance_alerts")
      .select("id")
      .eq("staff_user_id", alert.staff_user_id)
      .eq("alert_type", alert.alert_type)
      .eq("date", alert.date)
      .single();

    if (existing) {
      // Alert already exists, don't create duplicate
      return { success: true, data: existing };
    }

    const { data, error } = await supabase
      .from("hr_performance_alerts")
      .insert([alert])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating alert:", error);
    return { success: false, error };
  }
}

/**
 * Get alerts for a staff member
 */
export async function getAlerts(
  staffUserId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<PerformanceAlert[]> {
  try {
    let query = supabase
      .from("hr_performance_alerts")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (options?.startDate) {
      query = query.gte("date", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("date", options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as PerformanceAlert[];
  } catch (error) {
    console.error("Error getting alerts:", error);
    return [];
  }
}

/**
 * Get all alerts for managers
 */
export async function getAllAlerts(options?: {
  unreadOnly?: boolean;
  severity?: AlertSeverity;
  limit?: number;
}): Promise<any[]> {
  try {
    let query = supabase
      .from("hr_performance_alerts")
      .select(
        `
        *,
        users!hr_performance_alerts_staff_user_id_fkey (
          id,
          name,
          phone_number
        )
      `
      )
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (options?.severity) {
      query = query.eq("severity", options.severity);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting all alerts:", error);
    return [];
  }
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(
  alertId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("hr_performance_alerts")
      .update({ is_read: true })
      .eq("id", alertId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error marking alert as read:", error);
    return { success: false, error };
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string,
  resolvedBy: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("hr_performance_alerts")
      .update({
        is_resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error resolving alert:", error);
    return { success: false, error };
  }
}

/**
 * Get target achievement percentage
 */
export async function getTargetAchievement(
  staffUserId: string,
  period: "daily" | "weekly" | "monthly",
  date?: string
): Promise<{
  targetValue: number;
  actualValue: number;
  achievementPercent: number;
}> {
  try {
    const targets = await getActiveTargets(staffUserId, period);
    if (targets.length === 0) {
      return {
        targetValue: 0,
        actualValue: 0,
        achievementPercent: 0,
      };
    }

    const target = targets[0];
    const today = date || new Date().toISOString().split("T")[0];

    let startDate = today;
    if (period === "weekly") {
      const todayDate = new Date(today);
      const dayOfWeek = todayDate.getDay();
      const weekStart = new Date(todayDate);
      weekStart.setDate(todayDate.getDate() - dayOfWeek);
      startDate = weekStart.toISOString().split("T")[0];
    } else if (period === "monthly") {
      const todayDate = new Date(today);
      startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    }

    // Get metrics for the period
    const { data: metrics } = await supabase
      .from("hr_staff_daily_stats")
      .select("total_calls, successful_calls")
      .eq("staff_user_id", staffUserId)
      .gte("date", startDate)
      .lte("date", today);

    const actualCalls = metrics?.reduce((sum, m) => sum + (m.total_calls || 0), 0) || 0;

    const achievementPercent =
      target.target_value > 0 ? (actualCalls / target.target_value) * 100 : 0;

    return {
      targetValue: target.target_value,
      actualValue: actualCalls,
      achievementPercent: Math.round(achievementPercent * 100) / 100,
    };
  } catch (error) {
    console.error("Error getting target achievement:", error);
    return {
      targetValue: 0,
      actualValue: 0,
      achievementPercent: 0,
    };
  }
}

/**
 * Get unread alert count for a staff member
 */
export async function getUnreadAlertCount(staffUserId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("hr_performance_alerts")
      .select("*", { count: "exact", head: true })
      .eq("staff_user_id", staffUserId)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error getting unread alert count:", error);
    return 0;
  }
}

