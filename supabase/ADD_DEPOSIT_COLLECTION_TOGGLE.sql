-- Add deposit collection toggle column to users table
-- This allows admins to enable/disable deposit collection for individual drivers

-- Step 1: Add the column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS enable_deposit_collection BOOLEAN DEFAULT true;

-- Step 2: Set default value for existing users
UPDATE users 
SET enable_deposit_collection = true 
WHERE enable_deposit_collection IS NULL;

-- Step 3: Add comment to explain the column
COMMENT ON COLUMN users.enable_deposit_collection IS 
'Controls whether deposit collection is enabled for this driver. When false, no deposit cutting will be applied during report approval.';

-- Step 4: Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'enable_deposit_collection';

