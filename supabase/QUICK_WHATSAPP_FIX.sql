-- Quick fix for hr_whatsapp_numbers table
-- Add missing columns and foreign key relationships

-- Add missing columns if they don't exist
ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS assigned_staff_user_id UUID;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS hr_manager_user_id UUID;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS callback_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add foreign key constraints with proper error handling
DO $$ 
BEGIN
    -- Add foreign key for assigned_staff_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'hr_whatsapp_numbers_assigned_staff_user_id_fkey'
    ) THEN
        ALTER TABLE hr_whatsapp_numbers 
        ADD CONSTRAINT hr_whatsapp_numbers_assigned_staff_user_id_fkey 
        FOREIGN KEY (assigned_staff_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for hr_manager_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'hr_whatsapp_numbers_hr_manager_user_id_fkey'
    ) THEN
        ALTER TABLE hr_whatsapp_numbers 
        ADD CONSTRAINT hr_whatsapp_numbers_hr_manager_user_id_fkey 
        FOREIGN KEY (hr_manager_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_manager_id ON hr_whatsapp_numbers(hr_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_status ON hr_whatsapp_numbers(status);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_phone ON hr_whatsapp_numbers(phone_number);

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can insert WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can update their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can delete their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can view their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can update their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers;

-- RLS Policies
-- HR Managers can view and manage their WhatsApp numbers
CREATE POLICY "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR SELECT USING (hr_manager_user_id = auth.uid());

CREATE POLICY "HR Managers can insert WhatsApp numbers" ON hr_whatsapp_numbers
  FOR INSERT WITH CHECK (hr_manager_user_id = auth.uid());

CREATE POLICY "HR Managers can update their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR UPDATE USING (hr_manager_user_id = auth.uid());

CREATE POLICY "HR Managers can delete their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR DELETE USING (hr_manager_user_id = auth.uid());

-- HR Staff can view their assigned WhatsApp numbers
CREATE POLICY "HR Staff can view their assigned WhatsApp numbers" ON hr_whatsapp_numbers
  FOR SELECT USING (assigned_staff_user_id = auth.uid());

-- HR Staff can update their assigned WhatsApp numbers
CREATE POLICY "HR Staff can update their assigned WhatsApp numbers" ON hr_whatsapp_numbers
  FOR UPDATE USING (assigned_staff_user_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );
