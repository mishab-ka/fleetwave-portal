import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * HR Realtime Service
 * Manages Supabase Realtime subscriptions for live updates on:
 * - Staff attendance (clock-in/out events)
 * - Activity logs (staff actions)
 * - Performance alerts (new alerts)
 * - Targets (target updates)
 */

export interface AttendanceUpdate {
  staff_user_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  is_active: boolean;
  last_activity_at: string | null;
}

export interface ActivityUpdate {
  staff_user_id: string;
  activity_type: string;
  description: any;
  created_at: string;
}

export interface AlertUpdate {
  id: string;
  staff_user_id: string;
  alert_type: string;
  message: string;
  severity: string;
  is_resolved: boolean;
  created_at: string;
}

export interface TargetUpdate {
  id: string;
  staff_user_id: string;
  target_type: string;
  target_value: number;
  period: string;
  is_active: boolean;
}

/**
 * Subscribe to attendance updates for all staff or a specific staff member
 */
export const subscribeToAttendance = (
  callback: (payload: any) => void,
  staffUserId?: string
): RealtimeChannel => {
  const channel = supabase
    .channel("attendance-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hr_staff_attendance",
        filter: staffUserId ? `staff_user_id=eq.${staffUserId}` : undefined,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to activity log updates for all staff or a specific staff member
 */
export const subscribeToActivity = (
  callback: (payload: any) => void,
  staffUserId?: string
): RealtimeChannel => {
  const channel = supabase
    .channel("activity-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hr_staff_activity_log",
        filter: staffUserId ? `staff_user_id=eq.${staffUserId}` : undefined,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to performance alerts for all staff or a specific staff member
 */
export const subscribeToAlerts = (
  callback: (payload: any) => void,
  staffUserId?: string
): RealtimeChannel => {
  const channel = supabase
    .channel("alerts-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hr_performance_alerts",
        filter: staffUserId ? `staff_user_id=eq.${staffUserId}` : undefined,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to target updates for all staff or a specific staff member
 */
export const subscribeToTargets = (
  callback: (payload: any) => void,
  staffUserId?: string
): RealtimeChannel => {
  const channel = supabase
    .channel("targets-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hr_staff_targets",
        filter: staffUserId ? `staff_user_id=eq.${staffUserId}` : undefined,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to daily metrics updates
 */
export const subscribeToDailyMetrics = (
  callback: (payload: any) => void,
  staffUserId?: string
): RealtimeChannel => {
  const channel = supabase
    .channel("metrics-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hr_staff_daily_stats",
        filter: staffUserId ? `staff_user_id=eq.${staffUserId}` : undefined,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from a channel
 */
export const unsubscribe = async (channel: RealtimeChannel): Promise<void> => {
  await supabase.removeChannel(channel);
};

/**
 * Unsubscribe from all channels
 */
export const unsubscribeAll = async (): Promise<void> => {
  await supabase.removeAllChannels();
};

/**
 * Hook for managing multiple realtime subscriptions
 * Usage example:
 * 
 * const { subscribeAll, unsubscribeAll } = useRealtimeSubscriptions();
 * 
 * useEffect(() => {
 *   const channels = subscribeAll({
 *     onAttendanceUpdate: (payload) => console.log('Attendance:', payload),
 *     onActivityUpdate: (payload) => console.log('Activity:', payload),
 *     onAlertUpdate: (payload) => console.log('Alert:', payload),
 *   });
 *   
 *   return () => unsubscribeAll(channels);
 * }, []);
 */
export interface RealtimeCallbacks {
  onAttendanceUpdate?: (payload: any) => void;
  onActivityUpdate?: (payload: any) => void;
  onAlertUpdate?: (payload: any) => void;
  onTargetUpdate?: (payload: any) => void;
  onMetricsUpdate?: (payload: any) => void;
}

export const subscribeAll = (
  callbacks: RealtimeCallbacks,
  staffUserId?: string
): RealtimeChannel[] => {
  const channels: RealtimeChannel[] = [];

  if (callbacks.onAttendanceUpdate) {
    channels.push(
      subscribeToAttendance(callbacks.onAttendanceUpdate, staffUserId)
    );
  }

  if (callbacks.onActivityUpdate) {
    channels.push(subscribeToActivity(callbacks.onActivityUpdate, staffUserId));
  }

  if (callbacks.onAlertUpdate) {
    channels.push(subscribeToAlerts(callbacks.onAlertUpdate, staffUserId));
  }

  if (callbacks.onTargetUpdate) {
    channels.push(subscribeToTargets(callbacks.onTargetUpdate, staffUserId));
  }

  if (callbacks.onMetricsUpdate) {
    channels.push(
      subscribeToDailyMetrics(callbacks.onMetricsUpdate, staffUserId)
    );
  }

  return channels;
};

export const unsubscribeAllChannels = async (
  channels: RealtimeChannel[]
): Promise<void> => {
  for (const channel of channels) {
    await unsubscribe(channel);
  }
};

/**
 * React Hook for Realtime Subscriptions
 * This can be imported and used in components
 */
export const useRealtimeSubscriptions = () => {
  return {
    subscribeToAttendance,
    subscribeToActivity,
    subscribeToAlerts,
    subscribeToTargets,
    subscribeToDailyMetrics,
    subscribeAll,
    unsubscribe,
    unsubscribeAll: unsubscribeAllChannels,
  };
};

