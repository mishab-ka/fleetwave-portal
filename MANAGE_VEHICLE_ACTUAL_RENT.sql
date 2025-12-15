-- ============================================================================
-- VEHICLE ACTUAL RENT MANAGEMENT SCRIPT
-- ============================================================================
-- This script contains helpful queries for managing vehicle actual rent
-- Run these queries in your Supabase SQL Editor
-- ============================================================================

-- 1. VIEW ALL VEHICLES WITH THEIR RENT SETTINGS
-- ============================================================================
SELECT 
  vehicle_number,
  actual_rent,
  online,
  total_trips,
  CASE 
    WHEN actual_rent > 0 THEN '✓ Fixed Rent'
    ELSE '⊙ Calculated'
  END as rent_type
FROM vehicles
WHERE online = true
ORDER BY actual_rent DESC NULLS LAST;

-- 2. SET ACTUAL RENT FOR A SINGLE VEHICLE
-- ============================================================================
-- Replace 'DL01AB1234' with your vehicle number
-- Replace 4200 with your desired weekly rent amount

UPDATE vehicles 
SET actual_rent = 4200 
WHERE vehicle_number = 'DL01AB1234';

-- Verify the update
SELECT vehicle_number, actual_rent FROM vehicles WHERE vehicle_number = 'DL01AB1234';

-- 3. SET ACTUAL RENT FOR MULTIPLE VEHICLES
-- ============================================================================
UPDATE vehicles 
SET actual_rent = 4500 
WHERE vehicle_number IN ('DL01AB1234', 'DL01CD5678', 'DL01XY9876');

-- 4. REMOVE FIXED RENT (REVERT TO CALCULATED)
-- ============================================================================
-- For a single vehicle
UPDATE vehicles 
SET actual_rent = 0 
WHERE vehicle_number = 'DL01AB1234';

-- For all vehicles
UPDATE vehicles 
SET actual_rent = 0 
WHERE online = true;

-- 5. SET DIFFERENT RENTS BASED ON PERFORMANCE
-- ============================================================================
-- High performers (> 110 avg trips) get ₹5000/week
UPDATE vehicles v
SET actual_rent = 5000
WHERE vehicle_number IN (
  SELECT vehicle_number 
  FROM fleet_reports 
  WHERE status = 'approved'
  GROUP BY vehicle_number 
  HAVING AVG(total_trips) > 110
);

-- Medium performers (80-110 trips) get ₹4500/week
UPDATE vehicles v
SET actual_rent = 4500
WHERE vehicle_number IN (
  SELECT vehicle_number 
  FROM fleet_reports 
  WHERE status = 'approved'
  GROUP BY vehicle_number 
  HAVING AVG(total_trips) BETWEEN 80 AND 110
);

-- 6. VIEW VEHICLES BY RENT TYPE
-- ============================================================================
-- Get vehicles using fixed rent
SELECT 
  vehicle_number, 
  actual_rent as weekly_fixed_rent,
  total_trips as lifetime_trips
FROM vehicles 
WHERE actual_rent > 0 AND online = true
ORDER BY actual_rent DESC;

-- Get vehicles using calculated rent
SELECT 
  vehicle_number,
  total_trips as lifetime_trips
FROM vehicles 
WHERE (actual_rent = 0 OR actual_rent IS NULL) AND online = true;

-- 7. STATISTICS & ANALYTICS
-- ============================================================================
-- Count vehicles by rent type
SELECT 
  CASE 
    WHEN actual_rent > 0 THEN 'Fixed Rent'
    ELSE 'Calculated Rent'
  END as rent_type,
  COUNT(*) as vehicle_count,
  AVG(NULLIF(actual_rent, 0)) as avg_fixed_rent
FROM vehicles
WHERE online = true
GROUP BY CASE WHEN actual_rent > 0 THEN 'Fixed Rent' ELSE 'Calculated Rent' END;

-- 8. COMPARE ACTUAL VS CALCULATED RENT
-- ============================================================================
-- This shows vehicles where fixed rent differs significantly from calculated
WITH recent_performance AS (
  SELECT 
    vehicle_number,
    AVG(total_trips) as avg_trips,
    COUNT(*) as report_count
  FROM fleet_reports
  WHERE 
    status = 'approved' 
    AND submission_date >= NOW() - INTERVAL '30 days'
  GROUP BY vehicle_number
)
SELECT 
  v.vehicle_number,
  v.actual_rent as fixed_weekly_rent,
  rp.avg_trips,
  -- Approximate calculated rent (using hardcoded slabs - adjust as needed)
  CASE 
    WHEN rp.avg_trips >= 12 THEN 535
    WHEN rp.avg_trips >= 11 THEN 585
    WHEN rp.avg_trips >= 10 THEN 635
    WHEN rp.avg_trips >= 8 THEN 715
    WHEN rp.avg_trips >= 5 THEN 745
    ELSE 795
  END * 7 as approx_calculated_rent,
  v.actual_rent - (
    CASE 
      WHEN rp.avg_trips >= 12 THEN 535
      WHEN rp.avg_trips >= 11 THEN 585
      WHEN rp.avg_trips >= 10 THEN 635
      WHEN rp.avg_trips >= 8 THEN 715
      WHEN rp.avg_trips >= 5 THEN 745
      ELSE 795
    END * 7
  ) as rent_difference
FROM vehicles v
LEFT JOIN recent_performance rp ON v.vehicle_number = rp.vehicle_number
WHERE v.actual_rent > 0 AND v.online = true
ORDER BY rent_difference DESC;

-- 9. BULK UPDATE EXAMPLES
-- ============================================================================
-- Set all vehicles starting with 'DL01' to ₹4200
UPDATE vehicles 
SET actual_rent = 4200 
WHERE vehicle_number LIKE 'DL01%' AND online = true;

-- Set all online vehicles to ₹4500
UPDATE vehicles 
SET actual_rent = 4500 
WHERE online = true;

-- 10. RENT HISTORY TRACKING (Optional - Creates audit log)
-- ============================================================================
-- Create a table to track rent changes
CREATE TABLE IF NOT EXISTS vehicle_rent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number TEXT NOT NULL,
  old_rent DECIMAL(10, 2),
  new_rent DECIMAL(10, 2),
  changed_at TIMESTAMP DEFAULT NOW(),
  changed_by UUID,
  reason TEXT
);

-- Function to log rent changes (optional)
CREATE OR REPLACE FUNCTION log_rent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.actual_rent IS DISTINCT FROM NEW.actual_rent) THEN
    INSERT INTO vehicle_rent_history (vehicle_number, old_rent, new_rent)
    VALUES (NEW.vehicle_number, OLD.actual_rent, NEW.actual_rent);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - uncomment to enable automatic logging)
-- DROP TRIGGER IF EXISTS vehicle_rent_change_trigger ON vehicles;
-- CREATE TRIGGER vehicle_rent_change_trigger
-- AFTER UPDATE ON vehicles
-- FOR EACH ROW
-- EXECUTE FUNCTION log_rent_change();

-- View rent change history
-- SELECT * FROM vehicle_rent_history ORDER BY changed_at DESC LIMIT 20;

-- 11. EXPORT RENT CONFIGURATION
-- ============================================================================
-- Export as CSV-friendly format
SELECT 
  vehicle_number,
  COALESCE(actual_rent, 0) as fixed_weekly_rent,
  online,
  total_trips,
  CASE 
    WHEN actual_rent > 0 THEN 'FIXED'
    ELSE 'CALCULATED'
  END as rent_method
FROM vehicles
WHERE online = true
ORDER BY vehicle_number;

-- 12. QUICK PRESETS
-- ============================================================================
-- Preset 1: Standard fixed rent for all
-- UPDATE vehicles SET actual_rent = 4200 WHERE online = true;

-- Preset 2: High-value fixed rent
-- UPDATE vehicles SET actual_rent = 5000 WHERE online = true;

-- Preset 3: Clear all fixed rents
-- UPDATE vehicles SET actual_rent = 0 WHERE online = true;

-- 13. VALIDATION QUERIES
-- ============================================================================
-- Check for invalid values
SELECT vehicle_number, actual_rent 
FROM vehicles 
WHERE actual_rent < 0;

-- Check for very high rents (potential errors)
SELECT vehicle_number, actual_rent 
FROM vehicles 
WHERE actual_rent > 10000;

-- ============================================================================
-- QUICK REFERENCE
-- ============================================================================
-- Set rent:    UPDATE vehicles SET actual_rent = 4200 WHERE vehicle_number = 'XXX';
-- Clear rent:  UPDATE vehicles SET actual_rent = 0 WHERE vehicle_number = 'XXX';
-- View all:    SELECT vehicle_number, actual_rent FROM vehicles WHERE online = true;
-- ============================================================================




