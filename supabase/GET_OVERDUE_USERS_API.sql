-- =====================================================
-- GET OVERDUE USERS API ENDPOINT
-- =====================================================
-- This function returns overdue users with their details
-- for n8n automation (WhatsApp notifications, etc.)
-- =====================================================

-- Function to get overdue users
CREATE OR REPLACE FUNCTION get_overdue_users(
  p_days_overdue INTEGER DEFAULT 1
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  email_id TEXT,
  driver_id TEXT,
  overdue_date DATE,
  overdue_amount DECIMAL(10,2),
  report_id UUID,
  rent_date DATE,
  days_overdue INTEGER,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH overdue_reports AS (
    -- Get reports with positive rent_paid_amount (driver owes money)
    -- and status is not 'approved' or 'leave'
    SELECT 
      fr.id as report_id,
      fr.user_id,
      fr.rent_date,
      fr.rent_paid_amount,
      fr.status,
      fr.created_at,
      -- Calculate days overdue (difference between today and rent_date)
      (v_today - fr.rent_date)::INTEGER as days_overdue_calc
    FROM fleet_reports fr
    WHERE 
      -- Driver owes money (positive rent_paid_amount)
      fr.rent_paid_amount > 0
      -- Status is not approved or leave
      AND fr.status NOT IN ('approved', 'leave')
      -- Report is at least p_days_overdue days old
      AND (v_today - fr.rent_date) >= p_days_overdue
  ),
  -- Get the most recent overdue report per user
  latest_overdue AS (
    SELECT DISTINCT ON (orep.user_id)
      orep.user_id,
      orep.report_id,
      orep.rent_date as overdue_date,
      orep.rent_paid_amount as overdue_amount,
      orep.days_overdue_calc,
      orep.status
    FROM overdue_reports orep
    ORDER BY orep.user_id, orep.rent_date DESC
  ),
  -- Aggregate total overdue amount per user
  user_totals AS (
    SELECT 
      fr.user_id,
      SUM(fr.rent_paid_amount) as total_overdue
    FROM fleet_reports fr
    WHERE 
      fr.rent_paid_amount > 0
      AND fr.status NOT IN ('approved', 'leave')
      AND (v_today - fr.rent_date) >= p_days_overdue
    GROUP BY fr.user_id
  )
  SELECT 
    u.id::UUID as user_id,
    COALESCE(u.name, '')::TEXT as name,
    COALESCE(u.phone_number, '')::TEXT as phone_number,
    COALESCE(u.email_id, '')::TEXT as email_id,
    COALESCE(u.driver_id, '')::TEXT as driver_id,
    lo.overdue_date,
    COALESCE(ut.total_overdue, 0)::DECIMAL(10,2) as overdue_amount,
    lo.report_id::UUID,
    lo.overdue_date as rent_date,
    lo.days_overdue_calc::INTEGER as days_overdue,
    COALESCE(lo.status, '')::TEXT as status
  FROM latest_overdue lo
  INNER JOIN users u ON u.id = lo.user_id
  LEFT JOIN user_totals ut ON ut.user_id = lo.user_id
  WHERE u.role = 'driver' -- Only get drivers
  ORDER BY lo.overdue_date ASC, COALESCE(ut.total_overdue, 0) DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_overdue_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_users(INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_overdue_users IS 
'Returns overdue users with phone, name, overdue date, and amount. 
Use for n8n automation. 
p_days_overdue: Minimum days overdue (default 1)';

-- =====================================================
-- ALTERNATIVE: Get overdue users with penalty balance
-- =====================================================
-- This version also includes penalty/refund balance
CREATE OR REPLACE FUNCTION get_overdue_users_with_balance(
  p_days_overdue INTEGER DEFAULT 1
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  email_id TEXT,
  driver_id TEXT,
  overdue_date DATE,
  overdue_amount DECIMAL(10,2),
  penalty_balance DECIMAL(10,2),
  total_due DECIMAL(10,2),
  report_id UUID,
  rent_date DATE,
  days_overdue INTEGER,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH overdue_reports AS (
    SELECT 
      fr.id as report_id,
      fr.user_id,
      fr.rent_date,
      fr.rent_paid_amount,
      fr.status,
      (v_today - fr.rent_date)::INTEGER as days_overdue_calc
    FROM fleet_reports fr
    WHERE 
      fr.rent_paid_amount > 0
      AND fr.status NOT IN ('approved', 'leave')
      AND (v_today - fr.rent_date) >= p_days_overdue
  ),
  latest_overdue AS (
    SELECT DISTINCT ON (orep.user_id)
      orep.user_id,
      orep.report_id,
      orep.rent_date as overdue_date,
      orep.rent_paid_amount as overdue_amount,
      orep.days_overdue_calc,
      orep.status
    FROM overdue_reports orep
    ORDER BY orep.user_id, orep.rent_date DESC
  ),
  user_totals AS (
    SELECT 
      fr.user_id,
      SUM(fr.rent_paid_amount) as total_overdue
    FROM fleet_reports fr
    WHERE 
      fr.rent_paid_amount > 0
      AND fr.status NOT IN ('approved', 'leave')
      AND (v_today - fr.rent_date) >= p_days_overdue
    GROUP BY fr.user_id
  ),
  penalty_balances AS (
    SELECT 
      dpt.user_id,
      SUM(
        CASE 
          WHEN dpt.type IN ('penalty', 'due', 'extra_collection') THEN dpt.amount
          WHEN dpt.type IN ('penalty_paid', 'refund', 'bonus') THEN -dpt.amount
          ELSE 0
        END
      ) as penalty_balance
    FROM driver_penalty_transactions dpt
    GROUP BY dpt.user_id
  )
  SELECT 
    u.id::UUID as user_id,
    COALESCE(u.name, '')::TEXT as name,
    COALESCE(u.phone_number, '')::TEXT as phone_number,
    COALESCE(u.email_id, '')::TEXT as email_id,
    COALESCE(u.driver_id, '')::TEXT as driver_id,
    lo.overdue_date,
    COALESCE(ut.total_overdue, 0)::DECIMAL(10,2) as overdue_amount,
    COALESCE(pb.penalty_balance, 0)::DECIMAL(10,2) as penalty_balance,
    (COALESCE(ut.total_overdue, 0) + COALESCE(pb.penalty_balance, 0))::DECIMAL(10,2) as total_due,
    lo.report_id::UUID,
    lo.overdue_date as rent_date,
    lo.days_overdue_calc::INTEGER as days_overdue,
    COALESCE(lo.status, '')::TEXT as status
  FROM latest_overdue lo
  INNER JOIN users u ON u.id = lo.user_id
  LEFT JOIN user_totals ut ON ut.user_id = lo.user_id
  LEFT JOIN penalty_balances pb ON pb.user_id = lo.user_id
  WHERE u.role = 'driver'
  ORDER BY lo.overdue_date ASC, (COALESCE(ut.total_overdue, 0) + COALESCE(pb.penalty_balance, 0)) DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_overdue_users_with_balance(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_users_with_balance(INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_overdue_users_with_balance IS 
'Returns overdue users including penalty/refund balance. 
Use for n8n automation with complete financial picture. 
p_days_overdue: Minimum days overdue (default 1)';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fleet_reports_overdue 
ON fleet_reports(user_id, rent_date, status, rent_paid_amount) 
WHERE rent_paid_amount > 0 AND status NOT IN ('approved', 'leave');

CREATE INDEX IF NOT EXISTS idx_users_role_driver 
ON users(role) 
WHERE role = 'driver';

-- =====================================================
-- TEST QUERIES (for verification)
-- =====================================================
-- Test basic function:
-- SELECT * FROM get_overdue_users(1);

-- Test with balance:
-- SELECT * FROM get_overdue_users_with_balance(1);

-- Test with 3 days overdue:
-- SELECT * FROM get_overdue_users(3);

