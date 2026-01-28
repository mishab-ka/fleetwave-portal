import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "lodash";

export interface Driver {
  id: string;
  name: string;
  driver_id: string | null;
  vehicle_number: string | null;
  phone_number: string | null;
  online: boolean;
  shift: string | null;
  adjustment_count?: number;
}

export const useDriverSearch = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchDrivers = useCallback(
    debounce(async (query: string) => {
      if (!query || query.trim().length < 2) {
        setDrivers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchTerm = query.trim();

        // Search by name, driver_id, vehicle_number, or phone_number
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, driver_id, vehicle_number, phone_number, online, shift")
          .or(
            `name.ilike.%${searchTerm}%,driver_id.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`
          )
          .eq("online", true)
          .order("name")
          .limit(20);

        if (usersError) throw usersError;

        // Get adjustment counts for each driver
        const driverIds = (usersData || []).map((d) => d.id);
        
        if (driverIds.length > 0) {
          const { data: adjustmentCounts, error: countError } = await supabase
            .from("common_adjustments")
            .select("user_id")
            .in("user_id", driverIds);

          if (countError) {
            console.error("Error fetching adjustment counts:", countError);
          }

          // Count adjustments per driver
          const countMap = new Map<string, number>();
          (adjustmentCounts || []).forEach((adj) => {
            countMap.set(adj.user_id, (countMap.get(adj.user_id) || 0) + 1);
          });

          const driversWithCounts = (usersData || []).map((driver) => ({
            ...driver,
            adjustment_count: countMap.get(driver.id) || 0,
          }));

          setDrivers(driversWithCounts);
        } else {
          setDrivers([]);
        }
      } catch (err: any) {
        console.error("Error searching drivers:", err);
        setError(err.message);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const fetchAllOnlineDrivers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, driver_id, vehicle_number, phone_number, online, shift")
        .eq("online", true)
        .order("name");

      if (error) throw error;

      setDrivers(data || []);
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
      setError(err.message);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const getDriverById = async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, driver_id, vehicle_number, phone_number, online, shift")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      return data;
    } catch (err: any) {
      console.error("Error fetching driver:", err);
      return null;
    }
  };

  const clearDrivers = () => {
    setDrivers([]);
    setError(null);
  };

  return {
    drivers,
    loading,
    error,
    searchDrivers,
    fetchAllOnlineDrivers,
    getDriverById,
    clearDrivers,
  };
};
