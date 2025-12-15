-- =====================================================
-- GET ONLINE DRIVERS API ENDPOINT
-- =====================================================
-- This function returns all online drivers with their
-- phone numbers and shifts for WhatsApp automation
-- =====================================================

-- Function to get all online drivers
CREATE OR REPLACE FUNCTION get_online_drivers()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  email_id TEXT,
  driver_id TEXT,
  shift TEXT,
  online BOOLEAN,
  vehicle_number TEXT,
  joining_date DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id::UUID as user_id,
    COALESCE(u.name, '')::TEXT as name,
    COALESCE(u.phone_number, '')::TEXT as phone_number,
    COALESCE(u.email_id, '')::TEXT as email_id,
    COALESCE(u.driver_id, '')::TEXT as driver_id,
    COALESCE(u.shift, 'morning')::TEXT as shift,
    u.online::BOOLEAN,
    COALESCE(u.vehicle_number, '')::TEXT as vehicle_number,
    u.joining_date::DATE
  FROM users u
  WHERE 
    u.role = 'driver'
    AND u.online = true
  ORDER BY u.name ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_online_drivers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_online_drivers() TO anon;

-- Add comment
COMMENT ON FUNCTION get_online_drivers IS 
'Returns all online drivers with phone numbers and shifts for WhatsApp automation';

-- =====================================================
-- ALTERNATIVE: Get online drivers with recent activity
-- =====================================================
-- This version includes last report submission date
CREATE OR REPLACE FUNCTION get_online_drivers_with_activity()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  email_id TEXT,
  driver_id TEXT,
  shift TEXT,
  online BOOLEAN,
  vehicle_number TEXT,
  joining_date DATE,
  last_report_date DATE,
  days_since_last_report INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH driver_last_reports AS (
    SELECT 
      fr.user_id,
      MAX(fr.rent_date) as last_report_date
    FROM fleet_reports fr
    GROUP BY fr.user_id
  )
  SELECT 
    u.id::UUID as user_id,
    COALESCE(u.name, '')::TEXT as name,
    COALESCE(u.phone_number, '')::TEXT as phone_number,
    COALESCE(u.email_id, '')::TEXT as email_id,
    COALESCE(u.driver_id, '')::TEXT as driver_id,
    COALESCE(u.shift, 'morning')::TEXT as shift,
    u.online::BOOLEAN,
    COALESCE(u.vehicle_number, '')::TEXT as vehicle_number,
    u.joining_date::DATE,
    dlr.last_report_date::DATE,
    CASE 
      WHEN dlr.last_report_date IS NOT NULL 
      THEN (v_today - dlr.last_report_date)::INTEGER
      ELSE NULL
    END as days_since_last_report
  FROM users u
  LEFT JOIN driver_last_reports dlr ON dlr.user_id = u.id
  WHERE 
    u.role = 'driver'
    AND u.online = true
  ORDER BY u.name ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_online_drivers_with_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION get_online_drivers_with_activity() TO anon;

-- Add comment
COMMENT ON FUNCTION get_online_drivers_with_activity IS 
'Returns all online drivers with phone numbers, shifts, and last report activity';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_online_drivers 
ON users(role, online) 
WHERE role = 'driver' AND online = true;

-- =====================================================
-- TEST QUERIES (for verification)
-- =====================================================
-- Test basic function:
-- SELECT * FROM get_online_drivers();

-- Test with activity:
-- SELECT * FROM get_online_drivers_with_activity();

-- =====================================================
-- ALTERNATIVE: Get ALL drivers (for testing/debugging)
-- =====================================================
-- This function returns ALL drivers regardless of online status
-- Use this to see what data you have
CREATE OR REPLACE FUNCTION get_all_drivers()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  email_id TEXT,
  driver_id TEXT,
  shift TEXT,
  online BOOLEAN,
  vehicle_number TEXT,
  joining_date DATE,
  role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id::UUID as user_id,
    COALESCE(u.name, '')::TEXT as name,
    COALESCE(u.phone_number, '')::TEXT as phone_number,
    COALESCE(u.email_id, '')::TEXT as email_id,
    COALESCE(u.driver_id, '')::TEXT as driver_id,
    COALESCE(u.shift, 'morning')::TEXT as shift,
    COALESCE(u.online, false)::BOOLEAN as online,
    COALESCE(u.vehicle_number, '')::TEXT as vehicle_number,
    u.joining_date::DATE,
    COALESCE(u.role, '')::TEXT as role
  FROM users u
  WHERE u.role = 'driver'
  ORDER BY u.name ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_drivers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_drivers() TO anon;

-- Add comment
COMMENT ON FUNCTION get_all_drivers IS 
'Returns ALL drivers regardless of online status. Use for testing/debugging.';

-- =====================================================
-- DIAGNOSTIC QUERIES (run these if no results)
-- =====================================================
-- Check if you have any drivers:
-- SELECT COUNT(*) as total_drivers FROM users WHERE role = 'driver';

-- Check online status of all drivers:
-- SELECT name, phone_number, shift, online FROM users WHERE role = 'driver';

-- Check how many are online:
-- SELECT online, COUNT(*) FROM users WHERE role = 'driver' GROUP BY online;

-- Get ALL drivers (regardless of online status):
-- SELECT * FROM get_all_drivers();

-- Set a driver to online for testing (replace USER_ID):
-- UPDATE users SET online = true WHERE id = 'USER_ID' AND role = 'driver';

-- Set all drivers to online (for testing only):
-- UPDATE users SET online = true WHERE role = 'driver';

