import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FleetRentSlab {
  min_trips: number;
  max_trips: number | null;
  amount: number;
}

export interface CompanyEarningsSlab {
  min_trips: number;
  max_trips: number | null;
  amount: number;
}

export interface CompanyInfo {
  company_name: string;
  contact_email: string;
  contact_phone: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  new_report_notifications: boolean;
}

export interface SystemConfig {
  dark_mode: boolean;
  debug_mode: boolean;
  maintenance_mode: boolean;
  api_key: string;
}

export interface AdminSetting {
  id: string;
  setting_type: string;
  setting_key: string;
  setting_value: any;
  description: string;
  created_at: string;
  updated_at: string;
}

export const useAdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [fleetRentSlabs, setFleetRentSlabs] = useState<FleetRentSlab[]>([]);
  const [companyEarningsSlabs, setCompanyEarningsSlabs] = useState<
    CompanyEarningsSlab[]
  >([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    company_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({
      email_notifications: false,
      sms_notifications: false,
      new_report_notifications: false,
    });
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    dark_mode: false,
    debug_mode: false,
    maintenance_mode: false,
    api_key: "",
  });

  // Load all settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("admin_settings").select("*");

      if (error) throw error;

      data?.forEach((setting: AdminSetting) => {
        switch (setting.setting_type) {
          case "fleet_expense":
            if (setting.setting_key === "rent_slabs") {
              setFleetRentSlabs(setting.setting_value);
            }
            break;
          case "company_earnings":
            if (setting.setting_key === "earnings_slabs") {
              setCompanyEarningsSlabs(setting.setting_value);
            }
            break;
          case "general":
            if (setting.setting_key === "company_info") {
              setCompanyInfo(setting.setting_value);
            }
            break;
          case "notifications":
            if (setting.setting_key === "preferences") {
              setNotificationPreferences(setting.setting_value);
            }
            break;
          case "system":
            if (setting.setting_key === "config") {
              setSystemConfig(setting.setting_value);
            }
            break;
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Update fleet rent slabs
  const updateFleetRentSlabs = async (slabs: FleetRentSlab[]) => {
    try {
      const { error } = await supabase.from("admin_settings").upsert(
        {
          setting_type: "fleet_expense",
          setting_key: "rent_slabs",
          setting_value: slabs,
          description: "Fleet rent expense calculation based on trip count",
        },
        {
          onConflict: "setting_type,setting_key",
        }
      );

      if (error) throw error;

      setFleetRentSlabs(slabs);
      toast.success("Fleet rent slabs updated successfully");
    } catch (error) {
      console.error("Error updating fleet rent slabs:", error);
      toast.error("Failed to update fleet rent slabs");
    }
  };

  // Update company earnings slabs
  const updateCompanyEarningsSlabs = async (slabs: CompanyEarningsSlab[]) => {
    try {
      const { error } = await supabase.from("admin_settings").upsert(
        {
          setting_type: "company_earnings",
          setting_key: "earnings_slabs",
          setting_value: slabs,
          description: "Company earnings calculation based on trip count",
        },
        {
          onConflict: "setting_type,setting_key",
        }
      );

      if (error) throw error;

      setCompanyEarningsSlabs(slabs);
      toast.success("Company earnings slabs updated successfully");
    } catch (error) {
      console.error("Error updating company earnings slabs:", error);
      toast.error("Failed to update company earnings slabs");
    }
  };

  // Update company info
  const updateCompanyInfo = async (info: CompanyInfo) => {
    try {
      const { error } = await supabase.from("admin_settings").upsert(
        {
          setting_type: "general",
          setting_key: "company_info",
          setting_value: info,
          description: "General company information",
        },
        {
          onConflict: "setting_type,setting_key",
        }
      );

      if (error) throw error;

      setCompanyInfo(info);
      toast.success("Company information updated successfully");
    } catch (error) {
      console.error("Error updating company info:", error);
      toast.error("Failed to update company information");
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async (
    preferences: NotificationPreferences
  ) => {
    try {
      const { error } = await supabase.from("admin_settings").upsert(
        {
          setting_type: "notifications",
          setting_key: "preferences",
          setting_value: preferences,
          description: "Notification preferences",
        },
        {
          onConflict: "setting_type,setting_key",
        }
      );

      if (error) throw error;

      setNotificationPreferences(preferences);
      toast.success("Notification preferences updated successfully");
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      toast.error("Failed to update notification preferences");
    }
  };

  // Update system config
  const updateSystemConfig = async (config: SystemConfig) => {
    try {
      const { error } = await supabase.from("admin_settings").upsert(
        {
          setting_type: "system",
          setting_key: "config",
          setting_value: config,
          description: "System configuration settings",
        },
        {
          onConflict: "setting_type,setting_key",
        }
      );

      if (error) throw error;

      setSystemConfig(config);
      toast.success("System configuration updated successfully");
    } catch (error) {
      console.error("Error updating system config:", error);
      toast.error("Failed to update system configuration");
    }
  };

  // Calculate fleet rent based on trip count
  const calculateFleetRent = (tripCount: number): number => {
    const slab = fleetRentSlabs.find(
      (slab) =>
        tripCount >= slab.min_trips &&
        (slab.max_trips === null || tripCount <= slab.max_trips)
    );
    return slab?.amount || 0;
  };

  // Calculate company earnings based on trip count
  const calculateCompanyEarnings = (tripCount: number): number => {
    const slab = companyEarningsSlabs.find(
      (slab) =>
        tripCount >= slab.min_trips &&
        (slab.max_trips === null || tripCount <= slab.max_trips)
    );
    return slab?.amount || 0;
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    loading,
    fleetRentSlabs,
    companyEarningsSlabs,
    companyInfo,
    notificationPreferences,
    systemConfig,
    updateFleetRentSlabs,
    updateCompanyEarningsSlabs,
    updateCompanyInfo,
    updateNotificationPreferences,
    updateSystemConfig,
    calculateFleetRent,
    calculateCompanyEarnings,
    loadSettings,
  };
};
