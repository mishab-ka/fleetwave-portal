-- Fix Existing Joining Dates
-- This script copies joining dates from hr_call_tracking to hr_leads

-- Step 1: Check current state
SELECT 
  'Before Update' as status,
  COUNT(*) as total_leads,
  COUNT(joining_date) as leads_with_joining_date
FROM hr_leads;

-- Step 2: See which leads have joining dates in call tracking but not in leads table
SELECT 
  l.id as lead_id,
  l.name as lead_name,
  l.phone,
  l.joining_date as current_joining_date,
  ct.joining_date as call_tracking_joining_date,
  ct.created_at as call_date
FROM hr_leads l
INNER JOIN hr_call_tracking ct ON ct.lead_id = l.id
WHERE ct.joining_date IS NOT NULL
  AND (l.joining_date IS NULL OR l.joining_date != ct.joining_date)
ORDER BY ct.created_at DESC;

-- Step 3: Update hr_leads with joining dates from hr_call_tracking
-- This will copy the MOST RECENT joining date from call tracking
UPDATE hr_leads l
SET 
  joining_date = ct.joining_date,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (lead_id)
    lead_id,
    joining_date
  FROM hr_call_tracking
  WHERE joining_date IS NOT NULL
  ORDER BY lead_id, created_at DESC
) ct
WHERE l.id = ct.lead_id
  AND (l.joining_date IS NULL OR l.joining_date != ct.joining_date);

-- Step 4: Also update callback dates if missing
UPDATE hr_leads l
SET 
  callback_date = ct.callback_date,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (lead_id)
    lead_id,
    callback_date
  FROM hr_call_tracking
  WHERE callback_date IS NOT NULL
  ORDER BY lead_id, created_at DESC
) ct
WHERE l.id = ct.lead_id
  AND l.callback_date IS NULL
  AND ct.callback_date IS NOT NULL;

-- Step 5: Verify the update
SELECT 
  'After Update' as status,
  COUNT(*) as total_leads,
  COUNT(joining_date) as leads_with_joining_date,
  COUNT(callback_date) as leads_with_callback_date
FROM hr_leads;

-- Step 6: Show updated leads with joining dates
SELECT 
  l.id,
  l.name,
  l.phone,
  l.status,
  l.joining_date,
  l.callback_date,
  u.name as staff_name
FROM hr_leads l
LEFT JOIN users u ON u.id = l.assigned_staff_user_id
WHERE l.joining_date IS NOT NULL
ORDER BY l.joining_date ASC
LIMIT 20;

