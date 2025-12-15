-- Add vehicle assignment limit functionality
-- Function to check if a vehicle can be assigned to a driver (max 2 online drivers per vehicle)

CREATE OR REPLACE FUNCTION check_vehicle_assignment_limit(
  p_vehicle_number TEXT,
  p_driver_id UUID DEFAULT NULL
)
RETURNS TABLE(
  can_assign BOOLEAN,
  current_count INTEGER,
  max_allowed INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_drivers_count INTEGER;
  max_drivers INTEGER := 2;
BEGIN
  -- Count current online drivers assigned to this vehicle
  SELECT COUNT(*)::INTEGER
  INTO current_drivers_count
  FROM users u
  WHERE u.vehicle_number = p_vehicle_number
    AND u.online = true
    AND u.role = 'user'
    AND (p_driver_id IS NULL OR u.id != p_driver_id); -- Exclude current driver if updating

  -- Check if we can assign one more driver
  IF current_drivers_count >= max_drivers THEN
    RETURN QUERY SELECT 
      FALSE as can_assign,
      current_drivers_count as current_count,
      max_drivers as max_allowed,
      'Vehicle ' || p_vehicle_number || ' already has ' || current_drivers_count || ' online drivers assigned. Maximum allowed is ' || max_drivers || '.' as message;
  ELSE
    RETURN QUERY SELECT 
      TRUE as can_assign,
      current_drivers_count as current_count,
      max_drivers as max_allowed,
      'Vehicle ' || p_vehicle_number || ' can be assigned. Currently has ' || current_drivers_count || ' online drivers.' as message;
  END IF;
END;
$$;

-- Function to get vehicle assignment status for all vehicles
CREATE OR REPLACE FUNCTION get_vehicle_assignment_status()
RETURNS TABLE(
  vehicle_number TEXT,
  online_drivers_count INTEGER,
  max_allowed INTEGER,
  available_slots INTEGER,
  is_full BOOLEAN,
  assigned_drivers TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.vehicle_number,
    COALESCE(driver_counts.count, 0) as online_drivers_count,
    2 as max_allowed,
    GREATEST(2 - COALESCE(driver_counts.count, 0), 0) as available_slots,
    COALESCE(driver_counts.count, 0) >= 2 as is_full,
    COALESCE(driver_counts.driver_names, '') as assigned_drivers
  FROM vehicles v
  LEFT JOIN (
    SELECT 
      u.vehicle_number,
      COUNT(*)::INTEGER as count,
      STRING_AGG(u.name, ', ' ORDER BY u.name) as driver_names
    FROM users u
    WHERE u.online = true 
      AND u.role = 'user' 
      AND u.vehicle_number IS NOT NULL
    GROUP BY u.vehicle_number
  ) driver_counts ON v.vehicle_number = driver_counts.vehicle_number
  WHERE v.online = true
  ORDER BY v.vehicle_number;
END;
$$;

-- Create index for better performance on vehicle assignments
CREATE INDEX IF NOT EXISTS idx_users_vehicle_online 
ON users(vehicle_number, online) 
WHERE online = true AND role = 'user'; 