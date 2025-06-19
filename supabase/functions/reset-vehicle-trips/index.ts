import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active vehicles
    const { data: vehicles, error: vehiclesError } = await supabaseClient
      .from("vehicles")
      .select("vehicle_number, total_trips")
      .eq("online", true);

    if (vehiclesError) throw vehiclesError;

    const now = new Date();
    const results = [];

    // Process each vehicle
    for (const vehicle of vehicles) {
      try {
        // Save current trips to history
        const { error: historyError } = await supabaseClient
          .from("vehicle_trip_history")
          .insert({
            vehicle_number: vehicle.vehicle_number,
            total_trips: vehicle.total_trips || 0,
            recorded_at: now.toISOString(),
            type: "weekly",
          });

        if (historyError) throw historyError;

        // Reset trips to 0
        const { error: resetError } = await supabaseClient
          .from("vehicles")
          .update({ total_trips: 0 })
          .eq("vehicle_number", vehicle.vehicle_number);

        if (resetError) throw resetError;

        results.push({
          vehicle_number: vehicle.vehicle_number,
          status: "success",
          previous_trips: vehicle.total_trips || 0,
        });
      } catch (error) {
        results.push({
          vehicle_number: vehicle.vehicle_number,
          status: "error",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
