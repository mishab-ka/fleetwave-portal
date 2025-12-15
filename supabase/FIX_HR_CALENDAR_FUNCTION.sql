-- Fix HR Calendar Function Type Mismatch
-- This fixes the error: "Returned type text does not match expected type character varying"

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_hr_calendar_data(DATE, DATE);

-- Create the correct function that matches the TypeScript interface
CREATE OR REPLACE FUNCTION get_hr_calendar_data(start_date DATE, end_date DATE)
RETURNS TABLE (
  date TEXT,
  lead_name TEXT,
  status_name TEXT,
  status_color TEXT,
  staff_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(l.joining_date, 'YYYY-MM-DD') as date,
    l.name::TEXT as lead_name,
    COALESCE(l.status, 'new')::TEXT as status_name,
    '#6366f1'::TEXT as status_color,
    COALESCE(u.name, 'Unassigned')::TEXT as staff_name
  FROM hr_leads l
  LEFT JOIN users u ON l.assigned_staff_user_id = u.id
  WHERE l.joining_date IS NOT NULL
    AND l.joining_date::DATE >= start_date
    AND l.joining_date::DATE <= end_date
  ORDER BY l.joining_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_hr_calendar_data(DATE, DATE) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_hr_calendar_data(DATE, DATE) IS 
'Returns HR calendar events (joining dates) for a given date range';

