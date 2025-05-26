import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HiringCycle } from "@/types/hr";
import DriverApplicationForm from "@/components/DriverApplicationForm";
import { toast } from "sonner";

export default function ApplyDriver() {
  const [hiringCycle, setHiringCycle] = useState<HiringCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveHiringCycle();
  }, []);

  const fetchActiveHiringCycle = async () => {
    try {
      const { data: cycle, error } = await supabase
        .from("hiring_cycles")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;

      if (!cycle) {
        toast.error("No active hiring cycle found");
        navigate("/");
        return;
      }

      // Check if positions are still available
      const { data: approvedCount } = await supabase
        .from("applicants")
        .select("id", { count: "exact" })
        .eq("hiring_cycle_id", cycle.id)
        .eq("status", "approved");

      if ((approvedCount?.length || 0) >= cycle.total_vacancies) {
        toast.error("All positions have been filled");
        navigate("/");
        return;
      }

      setHiringCycle(cycle);
    } catch (error) {
      console.error("Error fetching hiring cycle:", error);
      toast.error("Failed to load hiring cycle");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  if (!hiringCycle) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Driver Application Form
            </h1>
            <p className="text-gray-600">
              Fill out the form below to apply for a driver position
            </p>
          </div>

          <DriverApplicationForm
            hiringCycleId={hiringCycle.id}
            onSubmitSuccess={() => navigate("/")}
          />
        </div>
      </div>
    </div>
  );
}
