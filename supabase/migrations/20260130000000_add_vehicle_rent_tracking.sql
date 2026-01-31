-- Add rent tracking columns to vehicles table for automatic Rent Slab calculation
-- This enables tracking rental days from vehicle activation date

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS rent_start_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_rent_slab INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rent_slab_last_updated TIMESTAMPTZ;

-- Create index for performance on rent_start_from queries
CREATE INDEX IF NOT EXISTS idx_vehicles_rent_start_from 
  ON public.vehicles(rent_start_from) 
  WHERE rent_start_from IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN vehicles.rent_start_from IS 'Date when vehicle rent tracking started (when activated with rent start date)';
COMMENT ON COLUMN vehicles.current_rent_slab IS 'Current rental days count in the current week (0-7, resets every Monday)';
COMMENT ON COLUMN vehicles.rent_slab_last_updated IS 'Last time the rent slab was recalculated';

-- Function to calculate rent slab for a vehicle based on activation date
-- Counts days ONLY within the current week (resets every Monday)
-- Maximum 7 days per week, resets to 0 at start of each week
CREATE OR REPLACE FUNCTION calculate_vehicle_rent_slab(
  p_vehicle_number TEXT,
  p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  v_rent_start_from TIMESTAMPTZ;
  v_online BOOLEAN;
  v_offline_from_date TIMESTAMPTZ;
  v_calculation_date DATE;
  v_current_week_start DATE;
  v_current_week_end DATE;
  v_days_in_current_week INTEGER;
BEGIN
  -- Fetch vehicle data
  SELECT rent_start_from, online, offline_from_date
  INTO v_rent_start_from, v_online, v_offline_from_date
  FROM vehicles
  WHERE vehicle_number = p_vehicle_number;

  -- If no rent_start_from, return 0
  IF v_rent_start_from IS NULL THEN
    RETURN 0;
  END IF;

  -- Determine the calculation end date
  -- If vehicle is offline, use offline_from_date, else use p_as_of_date
  IF v_online = false AND v_offline_from_date IS NOT NULL THEN
    v_calculation_date := v_offline_from_date::DATE;
  ELSE
    v_calculation_date := p_as_of_date;
  END IF;

  -- Cannot calculate if calculation date is before rent start date
  IF v_calculation_date < v_rent_start_from::DATE THEN
    RETURN 0;
  END IF;

  -- Get current week boundaries (Monday to Sunday)
  -- DATE_TRUNC('week', date) in PostgreSQL returns Monday of the ISO week
  v_current_week_start := DATE_TRUNC('week', v_calculation_date);
  v_current_week_end := v_current_week_start + INTERVAL '6 days';

  -- Calculate days in current week only
  -- Start: max(week_start, rent_start_from)
  -- End: min(week_end, calculation_date)
  v_days_in_current_week := (
    LEAST(v_current_week_end, v_calculation_date) - 
    GREATEST(v_current_week_start, v_rent_start_from::DATE) + 1
  );

  -- Return 0 if no overlap with current week, otherwise return the count
  IF v_days_in_current_week < 0 THEN
    RETURN 0;
  END IF;

  RETURN v_days_in_current_week;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function to auto-update rent_slab on vehicle status changes
CREATE OR REPLACE FUNCTION update_vehicle_rent_slab()
RETURNS TRIGGER AS $$
BEGIN
  -- When vehicle is being activated (online = true) and rent_start_from is set
  IF NEW.online = true AND OLD.online = false AND NEW.rent_start_from IS NOT NULL THEN
    -- Resume: recalculate from rent_start_from
    NEW.current_rent_slab := calculate_vehicle_rent_slab(NEW.vehicle_number, CURRENT_DATE);
    NEW.rent_slab_last_updated := NOW();
  
  -- When vehicle is being deactivated (online = false)
  ELSIF NEW.online = false AND OLD.online = true AND NEW.rent_start_from IS NOT NULL THEN
    -- Freeze: calculate up to today (will be stored as offline_from_date)
    NEW.current_rent_slab := calculate_vehicle_rent_slab(NEW.vehicle_number, CURRENT_DATE);
    NEW.rent_slab_last_updated := NOW();
  
  -- When rent_start_from is being set for the first time on an active vehicle
  ELSIF NEW.rent_start_from IS NOT NULL AND OLD.rent_start_from IS NULL AND NEW.online = true THEN
    NEW.current_rent_slab := calculate_vehicle_rent_slab(NEW.vehicle_number, CURRENT_DATE);
    NEW.rent_slab_last_updated := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vehicles table
CREATE TRIGGER trigger_update_vehicle_rent_slab
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_rent_slab();

-- Function to update all active vehicles' rent_slab (for daily cron job)
CREATE OR REPLACE FUNCTION update_all_active_vehicle_rent_slabs()
RETURNS void AS $$
BEGIN
  UPDATE vehicles
  SET 
    current_rent_slab = calculate_vehicle_rent_slab(vehicle_number, CURRENT_DATE),
    rent_slab_last_updated = NOW()
  WHERE 
    online = true 
    AND rent_start_from IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_vehicle_rent_slab(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_active_vehicle_rent_slabs() TO authenticated;
