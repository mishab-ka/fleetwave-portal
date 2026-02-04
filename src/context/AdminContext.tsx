import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export type UserRole = "admin" | "manager" | "hr" | "accountant" | null;

type AdminContextType = {
  isAdmin: boolean;
  isManager: boolean;
  isHR: boolean;
  isAccountant: boolean;
  userRole: UserRole;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  loading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsManager(false);
        setIsHR(false);
        setIsAccountant(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Get the user from the users table
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        const role = (data?.role ?? "").toString().toLowerCase();
        setUserRole(role as UserRole);

        // Check if user role is admin, super_admin, or the special email
        const isUserAdmin =
          role === "admin" ||
          role === "super_admin" ||
          user.email === "mishabrock8@gmail.com";
        setIsAdmin(isUserAdmin);
        setIsManager(role === "manager" || isUserAdmin);
        setIsHR(
          role === "hr" ||
            role === "hr_manager" ||
            role === "hr_staff" ||
            isUserAdmin
        );
        setIsAccountant(role === "accountant" || isUserAdmin);

        if (!isUserAdmin && user.email === "mishabrock8@gmail.com") {
          // Set the user to admin if email is mishabrock8@gmail.com
          const { error: updateError } = await supabase
            .from("users")
            .update({ role: "admin" })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error updating role:", updateError);
          } else {
            setIsAdmin(true);
            setIsManager(true);
            setIsHR(true);
            setIsAccountant(true);
            setUserRole("admin");
            toast.success("Admin role granted");
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error);

        // Special case for mishabrock8@gmail.com
        if (user.email === "mishabrock8@gmail.com") {
          setIsAdmin(true);
          setIsManager(true);
          setIsHR(true);
          setIsAccountant(true);
          setUserRole("admin");
          toast.success("Admin access granted");
        } else {
          toast.error("Failed to verify admin privileges");
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    if (!isAdmin && !isManager && !isHR && !isAccountant && !userRole)
      return false;

    const roles = Array.isArray(allowedRoles)
      ? allowedRoles.map((r) => String(r).toLowerCase())
      : [];
    const hasManager = roles.includes("manager");
    const hasHr = roles.some((r) =>
      ["hr", "hr_manager", "hr_staff"].includes(r)
    );
    const hasAccountant = roles.includes("accountant");

    if (isAdmin) return true;
    if (isManager && hasManager) return true;
    if (isHR && hasHr) return true;
    if (isAccountant && hasAccountant) return true;
    if (userRole && roles.includes(String(userRole).toLowerCase())) return true;

    return false;
  };

  const value = {
    isAdmin,
    isManager,
    isHR,
    isAccountant,
    userRole,
    hasAccess,
    loading,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
