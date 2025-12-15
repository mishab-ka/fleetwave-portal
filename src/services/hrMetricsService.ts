import { supabase } from "@/integrations/supabase/client";

/**
 * HR Metrics Service
 * Calculates and caches daily performance metrics
 */

export interface DailyMetrics {
  id?: string;
  staff_user_id: string;
  date: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_duration: number;
  avg_duration: number;
  leads_contacted: number;
  hot_leads_generated: number;
  joined_count: number;
  callback_scheduled: number;
  conversion_rate: number;
  first_activity_time: string | null;
  last_activity_time: string | null;
  active_hours: number;
  target_achievement_percentage: number;
  calls_target: number;
  conversions_target: number;
  avg_response_time_hours: number;
  quality_score: number;
  status_breakdown: any;
  source_breakdown: any;
  hourly_breakdown: any;
}

/**
 * Calculate daily metrics for a staff member
 */
export async function calculateDailyMetrics(
  staffUserId: string,
  date: string
): Promise<{ success: boolean; data?: DailyMetrics; error?: any }> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all calls for the day
    const { data: calls, error: callsError } = await supabase
      .from("hr_call_tracking")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .eq("called_date", date);

    if (callsError) throw callsError;

    const callsData = calls || [];

    // Calculate call metrics
    const totalCalls = callsData.length;
    const successfulStatuses = ["joined", "hot_lead", "callback"];
    const successfulCalls = callsData.filter((call) =>
      successfulStatuses.includes(call.status)
    ).length;
    const failedStatuses = ["not_interested", "call_not_picked"];
    const failedCalls = callsData.filter((call) =>
      failedStatuses.includes(call.status)
    ).length;

    const totalDuration = callsData.reduce(
      (sum, call) => sum + (call.call_duration || 0),
      0
    );
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    // Calculate lead metrics
    const uniqueLeads = new Set(callsData.map((call) => call.lead_id));
    const leadsContacted = uniqueLeads.size;

    const hotLeadsGenerated = callsData.filter(
      (call) => call.status === "hot_lead"
    ).length;
    const joinedCount = callsData.filter((call) => call.status === "joined").length;
    const callbackScheduled = callsData.filter(
      (call) => call.callback_date !== null
    ).length;

    // Calculate conversion rate
    const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    // Get attendance data
    const { data: attendance } = await supabase
      .from("hr_staff_attendance")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .eq("date", date)
      .single();

    const activeHours = attendance?.total_hours || 0;

    // Get activity data for first/last activity times
    const { data: activities } = await supabase
      .from("hr_staff_activity_log")
      .select("timestamp")
      .eq("staff_user_id", staffUserId)
      .gte("timestamp", startOfDay.toISOString())
      .lte("timestamp", endOfDay.toISOString())
      .order("timestamp", { ascending: true });

    const firstActivityTime =
      activities && activities.length > 0 ? activities[0].timestamp : null;
    const lastActivityTime =
      activities && activities.length > 0
        ? activities[activities.length - 1].timestamp
        : null;

    // Calculate response time (average time from lead assignment to first call)
    const responseTimeHours = await calculateAverageResponseTime(
      staffUserId,
      date
    );

    // Calculate quality score
    const qualityScore = calculateQualityScore({
      conversionRate,
      avgDuration,
      totalCalls,
      responseTimeHours,
    });

    // Get targets for achievement calculation
    const { data: targets } = await supabase
      .from("hr_staff_targets")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .eq("period", "daily")
      .eq("is_active", true)
      .single();

    const callsTarget = targets?.target_value || 0;
    const conversionsTarget = 0; // Not tracked in simplified schema
    const targetAchievementPercentage =
      callsTarget > 0 ? (totalCalls / callsTarget) * 100 : 0;

    // Calculate status breakdown
    const statusBreakdown: any = {};
    callsData.forEach((call) => {
      statusBreakdown[call.status] = (statusBreakdown[call.status] || 0) + 1;
    });

    // Calculate source breakdown
    const sourceBreakdown: any = {};
    callsData.forEach((call) => {
      if (call.source) {
        sourceBreakdown[call.source] = (sourceBreakdown[call.source] || 0) + 1;
      }
    });

    // Calculate hourly breakdown
    const hourlyBreakdown: any = {};
    for (let i = 0; i < 24; i++) {
      hourlyBreakdown[i.toString().padStart(2, "0")] = 0;
    }
    callsData.forEach((call) => {
      if (call.created_at) {
        const hour = new Date(call.created_at).getHours();
        const hourKey = hour.toString().padStart(2, "0");
        hourlyBreakdown[hourKey]++;
      }
    });

    // Prepare metrics object
    const metrics: DailyMetrics = {
      staff_user_id: staffUserId,
      date,
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      total_duration: totalDuration,
      avg_duration: Math.round(avgDuration * 100) / 100,
      leads_contacted: leadsContacted,
      hot_leads_generated: hotLeadsGenerated,
      joined_count: joinedCount,
      callback_scheduled: callbackScheduled,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      first_activity_time: firstActivityTime,
      last_activity_time: lastActivityTime,
      active_hours: Math.round(activeHours * 100) / 100,
      target_achievement_percentage:
        Math.round(targetAchievementPercentage * 100) / 100,
      calls_target: callsTarget,
      conversions_target: conversionsTarget,
      avg_response_time_hours: Math.round(responseTimeHours * 100) / 100,
      quality_score: Math.round(qualityScore * 100) / 100,
      status_breakdown: statusBreakdown,
      source_breakdown: sourceBreakdown,
      hourly_breakdown: hourlyBreakdown,
    };

    // Save or update metrics
    const { data: existing } = await supabase
      .from("hr_staff_daily_stats")
      .select("id")
      .eq("staff_user_id", staffUserId)
      .eq("date", date)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("hr_staff_daily_stats")
        .update(metrics)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as DailyMetrics };
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("hr_staff_daily_stats")
        .insert([metrics])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as DailyMetrics };
    }
  } catch (error) {
    console.error("Error calculating daily metrics:", error);
    return { success: false, error };
  }
}

/**
 * Calculate average response time (hours from lead assignment to first call)
 */
export async function calculateResponseTime(
  leadId: string,
  staffUserId: string
): Promise<number> {
  try {
    // Get lead assignment time
    const { data: lead } = await supabase
      .from("hr_leads")
      .select("created_at")
      .eq("id", leadId)
      .eq("assigned_staff_user_id", staffUserId)
      .single();

    if (!lead) return 0;

    // Get first call time
    const { data: firstCall } = await supabase
      .from("hr_call_tracking")
      .select("created_at")
      .eq("lead_id", leadId)
      .eq("staff_user_id", staffUserId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!firstCall) return 0;

    const assignmentTime = new Date(lead.created_at);
    const firstCallTime = new Date(firstCall.created_at);

    const responseTimeHours =
      (firstCallTime.getTime() - assignmentTime.getTime()) / (1000 * 60 * 60);

    return Math.max(0, responseTimeHours);
  } catch (error) {
    console.error("Error calculating response time:", error);
    return 0;
  }
}

/**
 * Calculate average response time for all calls on a date
 */
async function calculateAverageResponseTime(
  staffUserId: string,
  date: string
): Promise<number> {
  try {
    const { data: calls } = await supabase
      .from("hr_call_tracking")
      .select("lead_id, response_time_hours")
      .eq("staff_user_id", staffUserId)
      .eq("called_date", date);

    if (!calls || calls.length === 0) return 0;

    // Filter out calls with valid response times
    const validResponseTimes = calls
      .filter((call) => call.response_time_hours !== null)
      .map((call) => call.response_time_hours);

    if (validResponseTimes.length === 0) return 0;

    const avgResponseTime =
      validResponseTimes.reduce((sum, time) => sum + time, 0) /
      validResponseTimes.length;

    return avgResponseTime;
  } catch (error) {
    console.error("Error calculating average response time:", error);
    return 0;
  }
}

/**
 * Calculate quality score based on multiple factors
 */
export function calculateQualityScore(params: {
  conversionRate: number;
  avgDuration: number;
  totalCalls: number;
  responseTimeHours: number;
}): number {
  const { conversionRate, avgDuration, totalCalls, responseTimeHours } = params;

  let score = 0;

  // Conversion rate (40% weight)
  if (conversionRate >= 50) score += 40;
  else if (conversionRate >= 40) score += 32;
  else if (conversionRate >= 30) score += 24;
  else if (conversionRate >= 20) score += 16;
  else score += (conversionRate / 20) * 16;

  // Call volume (30% weight)
  if (totalCalls >= 50) score += 30;
  else if (totalCalls >= 40) score += 24;
  else if (totalCalls >= 30) score += 18;
  else if (totalCalls >= 20) score += 12;
  else score += (totalCalls / 20) * 12;

  // Average call duration (15% weight) - optimal is 2-5 minutes
  const durationMinutes = avgDuration / 60;
  if (durationMinutes >= 2 && durationMinutes <= 5) score += 15;
  else if (durationMinutes >= 1 && durationMinutes < 2) score += 10;
  else if (durationMinutes > 5 && durationMinutes <= 10) score += 10;
  else score += 5;

  // Response time (15% weight) - faster is better
  if (responseTimeHours <= 1) score += 15;
  else if (responseTimeHours <= 3) score += 12;
  else if (responseTimeHours <= 6) score += 9;
  else if (responseTimeHours <= 24) score += 6;
  else score += 3;

  return Math.min(100, Math.max(0, score));
}

/**
 * Update metrics for all staff for a given date
 */
export async function updateAllStaffMetrics(
  date: string
): Promise<{ success: boolean; updatedCount: number }> {
  try {
    // Get all HR staff
    const { data: hrStaff } = await supabase
      .from("users")
      .select("id")
      .eq("role", "hr_staff");

    if (!hrStaff || hrStaff.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    let updatedCount = 0;

    for (const staff of hrStaff) {
      const result = await calculateDailyMetrics(staff.id, date);
      if (result.success) {
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error("Error updating all staff metrics:", error);
    return { success: false, updatedCount: 0 };
  }
}

/**
 * Get daily metrics for a staff member
 */
export async function getDailyMetrics(
  staffUserId: string,
  date: string
): Promise<DailyMetrics | null> {
  try {
    const { data, error } = await supabase
      .from("hr_staff_daily_stats")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw error;
    return data as DailyMetrics;
  } catch (error) {
    console.error("Error getting daily metrics:", error);
    return null;
  }
}

/**
 * Get metrics for a date range
 */
export async function getMetricsRange(
  staffUserId: string,
  startDate: string,
  endDate: string
): Promise<DailyMetrics[]> {
  try {
    const { data, error } = await supabase
      .from("hr_staff_daily_stats")
      .select("*")
      .eq("staff_user_id", staffUserId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw error;
    return (data || []) as DailyMetrics[];
  } catch (error) {
    console.error("Error getting metrics range:", error);
    return [];
  }
}

/**
 * Get aggregated metrics for a period
 */
export async function getAggregatedMetrics(
  staffUserId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalCalls: number;
  totalSuccessful: number;
  avgConversionRate: number;
  totalDuration: number;
  avgDuration: number;
  totalLeadsContacted: number;
  totalJoined: number;
  avgQualityScore: number;
  avgResponseTime: number;
}> {
  try {
    const metrics = await getMetricsRange(staffUserId, startDate, endDate);

    if (metrics.length === 0) {
      return {
        totalCalls: 0,
        totalSuccessful: 0,
        avgConversionRate: 0,
        totalDuration: 0,
        avgDuration: 0,
        totalLeadsContacted: 0,
        totalJoined: 0,
        avgQualityScore: 0,
        avgResponseTime: 0,
      };
    }

    const totalCalls = metrics.reduce((sum, m) => sum + m.total_calls, 0);
    const totalSuccessful = metrics.reduce(
      (sum, m) => sum + m.successful_calls,
      0
    );
    const avgConversionRate =
      metrics.reduce((sum, m) => sum + m.conversion_rate, 0) / metrics.length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.total_duration, 0);
    const avgDuration =
      metrics.reduce((sum, m) => sum + m.avg_duration, 0) / metrics.length;
    const totalLeadsContacted = metrics.reduce(
      (sum, m) => sum + m.leads_contacted,
      0
    );
    const totalJoined = metrics.reduce((sum, m) => sum + m.joined_count, 0);
    const avgQualityScore =
      metrics.reduce((sum, m) => sum + m.quality_score, 0) / metrics.length;
    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.avg_response_time_hours, 0) /
      metrics.length;

    return {
      totalCalls,
      totalSuccessful,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100,
      totalDuration,
      avgDuration: Math.round(avgDuration * 100) / 100,
      totalLeadsContacted,
      totalJoined,
      avgQualityScore: Math.round(avgQualityScore * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    };
  } catch (error) {
    console.error("Error getting aggregated metrics:", error);
    return {
      totalCalls: 0,
      totalSuccessful: 0,
      avgConversionRate: 0,
      totalDuration: 0,
      avgDuration: 0,
      totalLeadsContacted: 0,
      totalJoined: 0,
      avgQualityScore: 0,
      avgResponseTime: 0,
    };
  }
}

/**
 * Get team-wide metrics for managers
 */
export async function getTeamMetrics(
  date: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("hr_staff_daily_stats")
      .select(
        `
        *,
        users!hr_staff_daily_stats_staff_user_id_fkey (
          id,
          name,
          phone_number
        )
      `
      )
      .eq("date", date)
      .order("total_calls", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting team metrics:", error);
    return [];
  }
}

