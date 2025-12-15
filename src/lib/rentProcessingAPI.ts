import { supabase } from "@/integrations/supabase/client";

export interface RentSubmissionData {
  user_id: string;
  rent_date: string; // YYYY-MM-DD format
  amount_collected: number;
  standard_rent?: number; // Defaults to 600
  notes?: string;
}

export interface RentProcessingResult {
  success: boolean;
  message: string;
  extra_collection_added: boolean;
  extra_amount: number;
  transaction_id?: string;
}

/**
 * Submit a rent payment and automatically process extra collection if applicable
 * Only processes extra collection from September 15th, 2024 onwards
 */
export const submitRentPayment = async (
  data: RentSubmissionData
): Promise<RentProcessingResult> => {
  try {
    const { data: result, error } = await supabase.rpc(
      "process_rent_with_extra_collection",
      {
        p_user_id: data.user_id,
        p_rent_date: data.rent_date,
        p_amount_collected: data.amount_collected,
        p_standard_rent: data.standard_rent || 600,
        p_created_by: null, // You can pass the current user ID here if needed
      }
    );

    if (error) {
      console.error("Error processing rent payment:", error);
      return {
        success: false,
        message: `Error processing rent payment: ${error.message}`,
        extra_collection_added: false,
        extra_amount: 0,
      };
    }

    return result as RentProcessingResult;
  } catch (error) {
    console.error("Error calling rent processing function:", error);
    return {
      success: false,
      message: `Error calling rent processing function: ${error}`,
      extra_collection_added: false,
      extra_amount: 0,
    };
  }
};

/**
 * Submit rent to the rent_submissions table for admin approval
 */
export const submitRentForApproval = async (data: RentSubmissionData) => {
  try {
    const { data: result, error } = await supabase
      .from("rent_submissions")
      .insert({
        user_id: data.user_id,
        rent_date: data.rent_date,
        amount_collected: data.amount_collected,
        standard_rent: data.standard_rent || 600,
        notes: data.notes,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error submitting rent for approval:", error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error("Error submitting rent for approval:", error);
    throw error;
  }
};

/**
 * Approve a rent submission (this will trigger the extra collection processing)
 */
export const approveRentSubmission = async (
  submissionId: string,
  approvedBy: string
) => {
  try {
    const { data: result, error } = await supabase
      .from("rent_submissions")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq("id", submissionId)
      .select()
      .single();

    if (error) {
      console.error("Error approving rent submission:", error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error("Error approving rent submission:", error);
    throw error;
  }
};

/**
 * Get rent submissions for a specific user
 */
export const getUserRentSubmissions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("rent_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("rent_date", { ascending: false });

    if (error) {
      console.error("Error fetching rent submissions:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching rent submissions:", error);
    throw error;
  }
};

/**
 * Get all pending rent submissions (for admin)
 */
export const getPendingRentSubmissions = async () => {
  try {
    const { data, error } = await supabase
      .from("rent_submissions")
      .select(
        `
        *,
        user:users(
          id,
          name,
          email_id,
          vehicle_number
        )
      `
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending rent submissions:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching pending rent submissions:", error);
    throw error;
  }
};










