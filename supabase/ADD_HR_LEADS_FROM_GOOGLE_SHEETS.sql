-- =====================================================
-- ADD HR LEADS FROM GOOGLE SHEETS API ENDPOINT
-- =====================================================
-- This function accepts hiring data from Google Sheets
-- (via n8n) and automatically assigns leads to active
-- HR staff members randomly
-- =====================================================

-- Function to add HR leads from Google Sheets
-- Accepts a single lead or array of leads
CREATE OR REPLACE FUNCTION add_hr_leads_from_sheets(
  p_leads JSONB
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(50),
  source VARCHAR(100),
  assigned_staff_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead JSONB;
  v_active_staff UUID[];
  v_staff_count INTEGER;
  v_random_index INTEGER;
  v_assigned_staff_id UUID;
  v_inserted_lead RECORD;
BEGIN
  -- Get all active HR staff user IDs
  -- Active staff are users with role 'hr_staff' 
  SELECT ARRAY_AGG(u.id)
  INTO v_active_staff
  FROM public.users u
  WHERE u.role = 'hr_staff';
  
  -- If no active staff found, raise an error
  IF v_active_staff IS NULL OR array_length(v_active_staff, 1) = 0 THEN
    RAISE EXCEPTION 'No active HR staff members found. Please ensure there are staff members with role "hr_staff"';
  END IF;
  
  v_staff_count := array_length(v_active_staff, 1);
  
  -- Handle both single object and array of objects
  IF jsonb_typeof(p_leads) = 'object' THEN
    -- Single lead object - convert to array
    p_leads := jsonb_build_array(p_leads);
  END IF;
  
  -- Loop through each lead
  FOR v_lead IN SELECT * FROM jsonb_array_elements(p_leads)
  LOOP
    -- Check if phone number already exists (duplicate check)
    IF NOT EXISTS (
      SELECT 1 
      FROM public.hr_leads hl
      WHERE hl.phone = (v_lead->>'phone')::VARCHAR(20)
    ) THEN
      -- Phone number doesn't exist, proceed with insertion
      -- Randomly select a staff member
      v_random_index := floor(random() * v_staff_count)::INTEGER + 1;
      v_assigned_staff_id := v_active_staff[v_random_index];
      
      -- Insert the lead into hr_leads table
      INSERT INTO public.hr_leads (
        name,
        phone,
        email,
        status,
        source,
        assigned_staff_user_id,
        created_at,
        updated_at
      )
      VALUES (
        (v_lead->>'name')::VARCHAR(255),
        (v_lead->>'phone')::VARCHAR(20),
        NULLIF(v_lead->>'email', '')::VARCHAR(100),
        COALESCE((v_lead->>'status')::VARCHAR(50), 'new'),
        NULLIF(v_lead->>'source', '')::VARCHAR(100),
        v_assigned_staff_id,
        NOW(),
        NOW()
      )
      RETURNING 
        hr_leads.id,
        hr_leads.name,
        hr_leads.phone,
        hr_leads.email,
        hr_leads.status,
        hr_leads.source,
        hr_leads.assigned_staff_user_id,
        hr_leads.created_at
      INTO v_inserted_lead;
      
      -- Return the inserted lead
      RETURN QUERY SELECT 
        v_inserted_lead.id,
        v_inserted_lead.name,
        v_inserted_lead.phone,
        v_inserted_lead.email,
        v_inserted_lead.status,
        v_inserted_lead.source,
        v_inserted_lead.assigned_staff_user_id,
        v_inserted_lead.created_at;
    END IF;
    -- If phone exists, skip silently (duplicate filtered out)
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission to authenticated and anonymous users (for n8n)
GRANT EXECUTE ON FUNCTION add_hr_leads_from_sheets(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_hr_leads_from_sheets(JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION add_hr_leads_from_sheets IS 
'Adds HR leads from Google Sheets (via n8n) and randomly assigns them to active HR staff members.
Automatically filters out duplicate phone numbers - only inserts leads with phone numbers that don''t already exist.
Accepts a single lead object or array of lead objects in JSONB format.
Required fields: name, phone
Optional fields: email, status (default: "new"), source
Returns only the newly inserted leads with their assigned staff IDs (duplicates are skipped).';

-- =====================================================
-- ALTERNATIVE: Function that only assigns to staff with active attendance
-- =====================================================
-- Use this version if you want to only assign to staff who are currently clocked in
CREATE OR REPLACE FUNCTION add_hr_leads_from_sheets_active_only(
  p_leads JSONB
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(50),
  source VARCHAR(100),
  assigned_staff_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead JSONB;
  v_active_staff UUID[];
  v_staff_count INTEGER;
  v_random_index INTEGER;
  v_assigned_staff_id UUID;
  v_inserted_lead RECORD;
BEGIN
  -- Get all active HR staff user IDs who are currently clocked in
  -- (have an active attendance record with is_active = true)
  SELECT ARRAY_AGG(DISTINCT hsa.staff_user_id)
  INTO v_active_staff
  FROM hr_staff_attendance hsa
  INNER JOIN public.users pu ON pu.id = hsa.staff_user_id
  WHERE pu.role = 'hr_staff'
    AND hsa.is_active = true
    AND hsa.clock_out_time IS NULL;
  
  -- If no active staff found, fall back to all hr_staff users
  IF v_active_staff IS NULL OR array_length(v_active_staff, 1) = 0 THEN
    SELECT ARRAY_AGG(u.id)
    INTO v_active_staff
    FROM public.users u
    WHERE u.role = 'hr_staff';
  END IF;
  
  -- If still no active staff found, raise an error
  IF v_active_staff IS NULL OR array_length(v_active_staff, 1) = 0 THEN
    RAISE EXCEPTION 'No active HR staff members found. Please ensure there are staff members with role "hr_staff"';
  END IF;
  
  v_staff_count := array_length(v_active_staff, 1);
  
  -- Handle both single object and array of objects
  IF jsonb_typeof(p_leads) = 'object' THEN
    p_leads := jsonb_build_array(p_leads);
  END IF;
  
  -- Loop through each lead
  FOR v_lead IN SELECT * FROM jsonb_array_elements(p_leads)
  LOOP
    -- Check if phone number already exists (duplicate check)
    IF NOT EXISTS (
      SELECT 1 
      FROM public.hr_leads hl
      WHERE hl.phone = (v_lead->>'phone')::VARCHAR(20)
    ) THEN
      -- Phone number doesn't exist, proceed with insertion
      -- Randomly select a staff member
      v_random_index := floor(random() * v_staff_count)::INTEGER + 1;
      v_assigned_staff_id := v_active_staff[v_random_index];
      
      -- Insert the lead into hr_leads table
      INSERT INTO public.hr_leads (
        name,
        phone,
        email,
        status,
        source,
        assigned_staff_user_id,
        created_at,
        updated_at
      )
      VALUES (
        (v_lead->>'name')::VARCHAR(255),
        (v_lead->>'phone')::VARCHAR(20),
        NULLIF(v_lead->>'email', '')::VARCHAR(100),
        COALESCE((v_lead->>'status')::VARCHAR(50), 'new'),
        NULLIF(v_lead->>'source', '')::VARCHAR(100),
        v_assigned_staff_id,
        NOW(),
        NOW()
      )
      RETURNING 
        hr_leads.id,
        hr_leads.name,
        hr_leads.phone,
        hr_leads.email,
        hr_leads.status,
        hr_leads.source,
        hr_leads.assigned_staff_user_id,
        hr_leads.created_at
      INTO v_inserted_lead;
      
      -- Return the inserted lead
      RETURN QUERY SELECT 
        v_inserted_lead.id,
        v_inserted_lead.name,
        v_inserted_lead.phone,
        v_inserted_lead.email,
        v_inserted_lead.status,
        v_inserted_lead.source,
        v_inserted_lead.assigned_staff_user_id,
        v_inserted_lead.created_at;
    END IF;
    -- If phone exists, skip silently (duplicate filtered out)
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_hr_leads_from_sheets_active_only(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_hr_leads_from_sheets_active_only(JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION add_hr_leads_from_sheets_active_only IS 
'Adds HR leads from Google Sheets and assigns them to HR staff who are currently clocked in.
Falls back to all hr_staff users if no one is clocked in.
Automatically filters out duplicate phone numbers - only inserts leads with phone numbers that don''t already exist.
Accepts a single lead object or array of lead objects in JSONB format.
Returns only the newly inserted leads (duplicates are skipped).';

-- =====================================================
-- TEST QUERIES (for verification)
-- =====================================================
-- Test with a single lead:
-- SELECT * FROM add_hr_leads_from_sheets('{"name": "John Doe", "phone": "+971501234567", "email": "john@example.com", "source": "google_sheets"}');

-- Test with multiple leads:
-- SELECT * FROM add_hr_leads_from_sheets('[
--   {"name": "Jane Smith", "phone": "+971501234568", "email": "jane@example.com", "source": "google_sheets"},
--   {"name": "Bob Johnson", "phone": "+971501234569", "source": "google_sheets"}
-- ]');

-- Check active staff:
-- SELECT id, name, role 
-- FROM public.users
-- WHERE role = 'hr_staff';

-- =====================================================
-- CREATE INDEX FOR DUPLICATE CHECK PERFORMANCE
-- =====================================================
-- This index improves performance when checking for duplicate phone numbers
CREATE INDEX IF NOT EXISTS idx_hr_leads_phone ON public.hr_leads(phone);

-- Add comment
COMMENT ON INDEX idx_hr_leads_phone IS 'Index on phone column for fast duplicate checking in add_hr_leads_from_sheets function';

