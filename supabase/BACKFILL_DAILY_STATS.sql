-- Backfill Daily Stats for Existing Call Data
-- This script aggregates all historical call data into the daily stats table

-- Backfill daily stats for all staff and all dates with call data
DO $$
DECLARE
  staff_record RECORD;
  date_record RECORD;
BEGIN
  -- Loop through all staff members who have made calls
  FOR staff_record IN 
    SELECT DISTINCT staff_user_id
    FROM hr_call_tracking
  LOOP
    -- Loop through all unique dates for this staff member
    FOR date_record IN
      SELECT DISTINCT called_date
      FROM hr_call_tracking
      WHERE staff_user_id = staff_record.staff_user_id
      ORDER BY called_date DESC
    LOOP
      -- Aggregate stats for this staff member and date
      PERFORM aggregate_daily_stats(
        staff_record.staff_user_id,
        date_record.called_date
      );
      
      RAISE NOTICE 'Processed stats for staff % on date %', 
        staff_record.staff_user_id, 
        date_record.called_date;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete!';
END $$;

-- Verify the backfill
SELECT 
  COUNT(*) as total_daily_records,
  COUNT(DISTINCT staff_user_id) as unique_staff,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  SUM(total_calls) as total_calls_aggregated
FROM hr_staff_daily_stats;

