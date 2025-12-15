import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

type ManagerContextType = {
  isManager: boolean;
  isAdmin: boolean;
  userRole: string | null;
  loading: boolean;
};

const ManagerContext = createContext<ManagerContextType | undefined>(undefined);

export const ManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, loading: authLoading } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkManagerStatus = async () => {
      if (!user) {
        setIsManager(false);
        setIsAdmin(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        const role = data?.role || null;
        setUserRole(role);

        // Manager role check
        setIsManager(role === "manager" || role === "admin");
        setIsAdmin(role === "admin");
      } catch (error) {
        console.error("Error checking manager status:", error);
        setIsManager(false);
        setIsAdmin(false);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkManagerStatus();
    }
  }, [user, authLoading]);

  const value = {
    isManager,
    isAdmin,
    userRole,
    loading,
  };

  return (
    <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>
  );
};

export const useManager = () => {
  const context = useContext(ManagerContext);
  if (context === undefined) {
    throw new Error("useManager must be used within a ManagerProvider");
  }
  return context;
};
