-- Create a function to handle the automatic reset
CREATE OR REPLACE FUNCTION public.handle_weekly_trip_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    vehicle_record RECORD;
    current_time TIMESTAMP WITH TIME ZONE;
BEGIN
    current_time := NOW();
    
    -- Loop through all active vehicles
    FOR vehicle_record IN 
        SELECT vehicle_number, total_trips 
        FROM vehicles 
        WHERE online = true
    LOOP
        -- Save current trips to history
        INSERT INTO vehicle_trip_history (
            vehicle_number,
            total_trips,
            recorded_at,
            type
        ) VALUES (
            vehicle_record.vehicle_number,
            COALESCE(vehicle_record.total_trips, 0),
            current_time,
            'weekly'
        );
        
        -- Reset trips to 0
        UPDATE vehicles
        SET total_trips = 0
        WHERE vehicle_number = vehicle_record.vehicle_number;
    END LOOP;
END;
$$;

-- Create a cron job to run every Sunday at midnight
SELECT cron.schedule(
    'weekly-trip-reset',  -- job name
    '0 0 * * 0',         -- cron schedule (every Sunday at midnight)
    $$SELECT handle_weekly_trip_reset()$$
); 