import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface StaffActivityLog {
  id: string;
  staff_user_id: string;
  staff_name: string;
  staff_role: string;
  action_type: string;
  action_category: string;
  description: string;
  metadata: Record<string, any>;
  old_value: string | null;
  new_value: string | null;
  page_name: string | null;
  page_url: string | null;
  created_at: string;
}

/**
 * Subscribe to real-time staff activity log updates
 */
export const subscribeToStaffActivity = (
  callback: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel("staff-activity-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "staff_activity_logs",
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Fetch staff activity logs with filters
 */
export const fetchStaffActivityLogs = async (filters: {
  staffUserId?: string;
  actionType?: string;
  actionCategory?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) => {
  let query = supabase
    .from("staff_activity_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.staffUserId) {
    query = query.eq("staff_user_id", filters.staffUserId);
  }

  if (filters.actionType) {
    query = query.eq("action_type", filters.actionType);
  }

  if (filters.actionCategory) {
    query = query.eq("action_category", filters.actionCategory);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom.toISOString());
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo.toISOString());
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data as StaffActivityLog[];
};

/**
 * Get activity statistics
 */
export const getActivityStatistics = async (dateFrom?: Date, dateTo?: Date) => {
  let query = supabase.from("staff_activity_logs").select("*");

  if (dateFrom) {
    query = query.gte("created_at", dateFrom.toISOString());
  }

  if (dateTo) {
    query = query.lte("created_at", dateTo.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  const logs = data as StaffActivityLog[];

  // Calculate statistics
  const totalActivities = logs.length;

  // Count by staff
  const staffCounts: Record<string, number> = {};
  logs.forEach((log) => {
    staffCounts[log.staff_name] = (staffCounts[log.staff_name] || 0) + 1;
  });

  // Count by action type
  const actionTypeCounts: Record<string, number> = {};
  logs.forEach((log) => {
    actionTypeCounts[log.action_type] = (actionTypeCounts[log.action_type] || 0) + 1;
  });

  // Count by category
  const categoryCounts: Record<string, number> = {};
  logs.forEach((log) => {
    categoryCounts[log.action_category] = (categoryCounts[log.action_category] || 0) + 1;
  });

  // Most active staff
  const mostActiveStaff = Object.entries(staffCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalActivities,
    staffCounts,
    actionTypeCounts,
    categoryCounts,
    mostActiveStaff,
  };
};
