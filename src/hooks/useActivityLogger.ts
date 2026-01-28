import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";

interface LogActivityParams {
  actionType: string;
  actionCategory: string;
  description: string;
  metadata?: Record<string, any>;
  oldValue?: string;
  newValue?: string;
  pageName?: string;
  pageUrl?: string;
}

export const useActivityLogger = () => {
  const { user } = useAuth();
  const { userRole } = useAdmin();

  const logActivity = async (params: LogActivityParams) => {
    // Only log for staff roles, not regular drivers
    const staffRoles = ['admin', 'manager', 'accountant', 'hr_manager', 'hr_staff', 'hr'];
    if (!user || !userRole || !staffRoles.includes(userRole)) {
      return;
    }

    try {
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      await supabase.from("staff_activity_logs").insert({
        staff_user_id: user.id,
        staff_name: userData?.name || user.email || "Unknown",
        staff_role: userRole,
        action_type: params.actionType,
        action_category: params.actionCategory,
        description: params.description,
        metadata: params.metadata || {},
        old_value: params.oldValue,
        new_value: params.newValue,
        page_name: params.pageName,
        page_url: params.pageUrl || window.location.pathname,
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
      // Silently fail - don't disrupt user experience
    }
  };

  return { logActivity };
};
