# WhatsApp SQL Fix Options

## Issue

The `hr_whatsapp_numbers` table is missing required columns, causing foreign key relationship errors.

## SQL Fix Options

### Option 1: SIMPLE_WHATSAPP_FIX.sql (Recommended)

**Use this file if you want a quick fix without foreign key constraints:**

```sql
-- File: supabase/SIMPLE_WHATSAPP_FIX.sql
-- ✅ Adds all missing columns
-- ✅ Adds performance indexes
-- ✅ Sets up RLS policies
-- ❌ No foreign key constraints (safer)
```

**Benefits:**

- ✅ Quick and safe
- ✅ No syntax errors
- ✅ All functionality works
- ✅ Easy to run

### Option 2: QUICK_WHATSAPP_FIX.sql (Advanced)

**Use this file if you want complete foreign key relationships:**

```sql
-- File: supabase/QUICK_WHATSAPP_FIX.sql
-- ✅ Adds all missing columns
-- ✅ Adds foreign key constraints
-- ✅ Adds performance indexes
-- ✅ Sets up RLS policies
```

**Benefits:**

- ✅ Complete database integrity
- ✅ Proper foreign key relationships
- ✅ Better data consistency
- ⚠️ More complex (uses DO blocks)

## How to Apply

### For Most Users (Recommended):

1. Go to Supabase SQL Editor
2. Run `SIMPLE_WHATSAPP_FIX.sql`
3. Test the upload functionality

### For Advanced Users:

1. Go to Supabase SQL Editor
2. Run `QUICK_WHATSAPP_FIX.sql`
3. Test the upload functionality

## What Each File Does

### SIMPLE_WHATSAPP_FIX.sql

```sql
-- Adds missing columns
ALTER TABLE hr_whatsapp_numbers ADD COLUMN IF NOT EXISTS assigned_staff_user_id UUID;
ALTER TABLE hr_whatsapp_numbers ADD COLUMN IF NOT EXISTS hr_manager_user_id UUID;
ALTER TABLE hr_whatsapp_numbers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';

-- Adds indexes
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);

-- Sets up RLS policies
CREATE POLICY "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR SELECT USING (hr_manager_user_id = auth.uid());
```

### QUICK_WHATSAPP_FIX.sql

```sql
-- Adds missing columns (same as above)
-- Plus foreign key constraints:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'hr_whatsapp_numbers_assigned_staff_user_id_fkey') THEN
        ALTER TABLE hr_whatsapp_numbers
        ADD CONSTRAINT hr_whatsapp_numbers_assigned_staff_user_id_fkey
        FOREIGN KEY (assigned_staff_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;
```

## Expected Results

After running either file:

- ✅ WhatsApp number upload works without errors
- ✅ Numbers are automatically distributed to staff
- ✅ Staff names display correctly in HR Manager tab
- ✅ Search by staff name works
- ✅ Status tracking functions properly
- ✅ All RLS policies are enforced

## Troubleshooting

### If you get syntax errors:

- Use `SIMPLE_WHATSAPP_FIX.sql` instead
- This avoids complex foreign key constraint syntax

### If you want to add foreign keys later:

```sql
-- Add foreign keys manually after running SIMPLE_WHATSAPP_FIX.sql
ALTER TABLE hr_whatsapp_numbers
ADD CONSTRAINT hr_whatsapp_numbers_assigned_staff_user_id_fkey
FOREIGN KEY (assigned_staff_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE hr_whatsapp_numbers
ADD CONSTRAINT hr_whatsapp_numbers_hr_manager_user_id_fkey
FOREIGN KEY (hr_manager_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

## Recommendation

**Start with `SIMPLE_WHATSAPP_FIX.sql`** - it's safer and will fix the immediate issue. You can always add foreign key constraints later if needed.

The upload functionality will work perfectly with either approach! 🎉
