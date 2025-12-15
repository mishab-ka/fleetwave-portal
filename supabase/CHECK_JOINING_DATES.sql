-- Check HR Leads with Joining Dates
-- Run this query to see all leads that have joining dates

-- 1. Check all leads with joining dates
SELECT 
  id,
  name,
  phone,
  status,
  source,
  joining_date,
  assigned_staff_user_id,
  created_at
FROM hr_leads
WHERE joining_date IS NOT NULL
ORDER BY joining_date ASC;

-- 2. Check today's joinings
SELECT 
  id,
  name,
  phone,
  status,
  joining_date,
  assigned_staff_user_id
FROM hr_leads
WHERE joining_date::DATE = CURRENT_DATE
ORDER BY joining_date ASC;

-- 3. Check tomorrow's joinings
SELECT 
  id,
  name,
  phone,
  status,
  joining_date,
  assigned_staff_user_id
FROM hr_leads
WHERE joining_date::DATE = CURRENT_DATE + INTERVAL '1 day'
ORDER BY joining_date ASC;

-- 4. Check this week's joinings
SELECT 
  id,
  name,
  phone,
  status,
  joining_date,
  assigned_staff_user_id
FROM hr_leads
WHERE joining_date::DATE >= DATE_TRUNC('week', CURRENT_DATE)
  AND joining_date::DATE <= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'
ORDER BY joining_date ASC;

-- 5. Check with staff names
SELECT 
  l.id,
  l.name as lead_name,
  l.phone,
  l.status,
  l.joining_date,
  u.name as staff_name,
  u.id as staff_id
FROM hr_leads l
LEFT JOIN users u ON u.id = l.assigned_staff_user_id
WHERE l.joining_date IS NOT NULL
ORDER BY l.joining_date ASC;

-- 6. Count joinings by date
SELECT 
  joining_date::DATE as date,
  COUNT(*) as count
FROM hr_leads
WHERE joining_date IS NOT NULL
GROUP BY joining_date::DATE
ORDER BY joining_date::DATE ASC;

-- 7. Check if the column exists and its type
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'hr_leads' 
  AND column_name IN ('joining_date', 'phone', 'phone_number', 'assigned_staff_user_id');
