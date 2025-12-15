-- Query to set all drivers to online status in one run
-- This will:
-- 1. Set online = true for all users
-- 2. Set online_from_date to current date
-- 3. Clear offline_from_date
-- 4. Optionally clear driver_status (leave/resigning)

UPDATE users
SET 
  online = true,
  online_from_date = CURRENT_DATE,
  offline_from_date = NULL,
  driver_status = NULL  -- Optional: clear leave/resigning status
WHERE 
  online = false OR online IS NULL;

-- To verify the update, run this query:
-- SELECT id, name, email_id, online, online_from_date, offline_from_date, driver_status
-- FROM users
-- ORDER BY name;

-- If you want to keep driver_status (leave/resigning) and only set online:
-- UPDATE users
-- SET 
--   online = true,
--   online_from_date = CURRENT_DATE,
--   offline_from_date = NULL
-- WHERE 
--   online = false OR online IS NULL;
