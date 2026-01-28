-- Add leave_return_date column to users table
-- This column stores the expected return date for drivers on leave
-- Admins can use this to know when to call drivers to come back

ALTER TABLE users
ADD COLUMN IF NOT EXISTS leave_return_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN users.leave_return_date IS 'Expected return date for drivers on leave. Used to track when drivers should return from leave.';

-- Create index for efficient queries on leave return dates
CREATE INDEX IF NOT EXISTS idx_users_leave_return_date 
ON users(leave_return_date) 
WHERE leave_return_date IS NOT NULL;

-- Query to get drivers on leave with return dates approaching
-- SELECT 
--   id, name, phone_number, driver_status, 
--   offline_from_date, leave_return_date
-- FROM users
-- WHERE driver_status = 'leave'
--   AND leave_return_date IS NOT NULL
--   AND leave_return_date <= CURRENT_DATE + INTERVAL '3 days'
-- ORDER BY leave_return_date ASC;

-- Query to get all drivers on leave with return dates
-- SELECT 
--   id, name, phone_number, driver_status,
--   offline_from_date, leave_return_date,
--   CASE 
--     WHEN leave_return_date < CURRENT_DATE THEN 'Overdue'
--     WHEN leave_return_date = CURRENT_DATE THEN 'Returning Today'
--     WHEN leave_return_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Returning Soon'
--     ELSE 'Future Return'
--   END as return_status
-- FROM users
-- WHERE driver_status = 'leave'
--   AND leave_return_date IS NOT NULL
-- ORDER BY leave_return_date ASC;




