import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommonAdjustment {
  id: string;
  user_id: string;
  driver_name: string;
  vehicle_number: string | null;
  adjustment_date: string;
  category: "service_day" | "bonus" | "penalty" | "refund" | "expense" | "custom";
  amount: number;
  description: string;
  status: "pending" | "approved" | "rejected" | "applied";
  created_by: string;
  approved_by: string | null;
  applied_to_report: string | null;
  created_at: string;
  approved_at: string | null;
  applied_at: string | null;
  creator_name?: string;
}

export interface AdjustmentFilters {
  status?: string[];
  category?: string[];
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  searchQuery?: string;
}

export const useAdjustments = () => {
  const [adjustments, setAdjustments] = useState<CommonAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdjustments = useCallback(async (filters?: AdjustmentFilters) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("common_adjustments")
        .select(`
          *,
          creator:users!common_adjustments_created_by_fkey(name)
        `)
        .order("adjustment_date", { ascending: false });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      if (filters?.category && filters.category.length > 0) {
        query = query.in("category", filters.category);
      }

      if (filters?.dateFrom) {
        query = query.gte("adjustment_date", filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte("adjustment_date", filters.dateTo);
      }

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters?.searchQuery) {
        query = query.or(
          `driver_name.ilike.%${filters.searchQuery}%,vehicle_number.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setAdjustments(
        (data || []).map((adj) => ({
          ...adj,
          creator_name: adj.creator?.name || "Unknown",
        }))
      );
    } catch (err: any) {
      console.error("Error fetching adjustments:", err);
      setError(err.message);
      toast.error("Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  }, []);

  const createAdjustment = async (adjustment: {
    user_id: string;
    driver_name: string;
    vehicle_number: string | null;
    adjustment_date: string;
    category: string;
    amount: number;
    description: string;
    created_by: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("common_adjustments")
        .insert({
          ...adjustment,
          status: "approved", // Auto-approve as per requirements
          approved_by: adjustment.created_by,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Adjustment created successfully");
      return data;
    } catch (err: any) {
      console.error("Error creating adjustment:", err);
      setError(err.message);
      toast.error(err.message || "Failed to create adjustment");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAdjustment = async (
    id: string,
    updates: Partial<CommonAdjustment>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("common_adjustments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Adjustment updated successfully");
      return data;
    } catch (err: any) {
      console.error("Error updating adjustment:", err);
      setError(err.message);
      toast.error("Failed to update adjustment");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAdjustment = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("common_adjustments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Adjustment deleted successfully");
    } catch (err: any) {
      console.error("Error deleting adjustment:", err);
      setError(err.message);
      toast.error("Failed to delete adjustment");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAdjustmentsForDate = async (userId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from("common_adjustments")
        .select("*")
        .eq("user_id", userId)
        .eq("adjustment_date", date)
        .eq("status", "approved");

      if (error) throw error;

      return data || [];
    } catch (err: any) {
      console.error("Error fetching adjustments for date:", err);
      return [];
    }
  };

  const applyAdjustmentToReport = async (
    adjustmentId: string,
    reportId: string
  ) => {
    try {
      const { data, error } = await supabase.rpc("apply_adjustment_to_report", {
        p_adjustment_id: adjustmentId,
        p_report_id: reportId,
      });

      if (error) throw error;

      return data;
    } catch (err: any) {
      console.error("Error applying adjustment to report:", err);
      throw err;
    }
  };

  const getAdjustmentStats = useCallback(async (userId?: string) => {
    try {
      let query = supabase.from("common_adjustments").select("status, amount");

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        pending: 0,
        approved: 0,
        applied: 0,
        rejected: 0,
        totalAmount: 0,
      };

      (data || []).forEach((adj) => {
        if (adj.status === "pending") stats.pending++;
        if (adj.status === "approved") stats.approved++;
        if (adj.status === "applied") stats.applied++;
        if (adj.status === "rejected") stats.rejected++;
        if (adj.status === "applied") stats.totalAmount += adj.amount || 0;
      });

      return stats;
    } catch (err: any) {
      console.error("Error fetching adjustment stats:", err);
      return null;
    }
  }, []);

  return {
    adjustments,
    loading,
    error,
    fetchAdjustments,
    createAdjustment,
    updateAdjustment,
    deleteAdjustment,
    getAdjustmentsForDate,
    applyAdjustmentToReport,
    getAdjustmentStats,
  };
};
