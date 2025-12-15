# WhatsApp Numbers Foreign Key Fix

## Issue

The `hr_whatsapp_numbers` table is missing the `assigned_staff_user_id` column and its foreign key relationship to `auth.users`, causing the error:

```
Could not find a relationship between 'hr_whatsapp_numbers' and 'assigned_staff_user_id' in the schema cache
```

## Root Cause

The database table structure is incomplete. The `hr_whatsapp_numbers` table needs:

- `assigned_staff_user_id` column (UUID)
- Foreign key relationship to `auth.users(id)`
- Proper RLS policies for access control

## Solution

### Option 1: Quick Fix (Recommended)

Run the `QUICK_WHATSAPP_FIX.sql` file in your Supabase SQL editor:

```sql
-- File: supabase/QUICK_WHATSAPP_FIX.sql
-- This adds all missing columns and foreign key relationships
```

### Option 2: Manual Steps

If you prefer to run commands manually:

1. **Add missing columns:**

```sql
ALTER TABLE hr_whatsapp_numbers
ADD COLUMN IF NOT EXISTS assigned_staff_user_id UUID;

ALTER TABLE hr_whatsapp_numbers
ADD COLUMN IF NOT EXISTS hr_manager_user_id UUID;

ALTER TABLE hr_whatsapp_numbers
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';
```

2. **Add foreign key constraints:**

```sql
ALTER TABLE hr_whatsapp_numbers
ADD CONSTRAINT hr_whatsapp_numbers_assigned_staff_user_id_fkey
FOREIGN KEY (assigned_staff_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE hr_whatsapp_numbers
ADD CONSTRAINT hr_whatsapp_numbers_hr_manager_user_id_fkey
FOREIGN KEY (hr_manager_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

3. **Add indexes for performance:**

```sql
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_manager_id ON hr_whatsapp_numbers(hr_manager_user_id);
```

## What This Fixes

### Database Structure

- ✅ Adds `assigned_staff_user_id` column for staff assignment
- ✅ Adds `hr_manager_user_id` column for manager ownership
- ✅ Adds `status` column for conversation tracking
- ✅ Creates proper foreign key relationships
- ✅ Adds performance indexes

### Access Control

- ✅ HR Managers can manage their WhatsApp numbers
- ✅ HR Staff can view and update their assigned numbers
- ✅ Admins have full access to all numbers
- ✅ Proper RLS policies for data security

### Application Functionality

- ✅ WhatsApp number upload will work without errors
- ✅ Numbers will be automatically distributed to staff
- ✅ HR staff can view and manage their assigned numbers
- ✅ Staff names will display correctly in the HR Manager tab
- ✅ Status updates will be tracked properly

## Code Changes Made

### React Component Fix

The `HRWhatsAppManagement.tsx` component has been updated to:

- **Fetch staff information separately** instead of using foreign key relationships
- **Handle missing staff data gracefully** with fallback display
- **Show staff names and emails** in the assigned staff column
- **Search by staff name** in addition to phone numbers

### Database Query Strategy

Instead of using Supabase's automatic foreign key joins:

```typescript
// OLD (causing error)
.select(`
  *,
  assigned_staff:assigned_staff_user_id(id, name, email)
`)

// NEW (working solution)
const numbersData = await supabase.from("hr_whatsapp_numbers").select("*");
const numbersWithStaff = await Promise.all(
  numbersData.map(async (number) => {
    if (number.assigned_staff_user_id) {
      const staffData = await supabase
        .from("users")
        .select("id, name, email")
        .eq("id", number.assigned_staff_user_id)
        .single();
      return { ...number, assigned_staff: staffData.data };
    }
    return number;
  })
);
```

## After Running the SQL

1. **Test the upload functionality** - try uploading a file with phone numbers
2. **Verify staff assignment** - check that numbers are distributed to staff
3. **Check staff display** - ensure staff names show in the HR Manager tab
4. **Test status updates** - verify that HR staff can update conversation status

## Expected Results

After applying the fix:

- ✅ No more foreign key relationship errors
- ✅ WhatsApp number upload works perfectly
- ✅ Staff names display correctly in the table
- ✅ Search by staff name works
- ✅ Status tracking functions properly
- ✅ All RLS policies are enforced

## Troubleshooting

If you still encounter issues:

1. **Check table structure:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'hr_whatsapp_numbers';
```

2. **Verify foreign key constraints:**

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'hr_whatsapp_numbers';
```

3. **Test the relationship:**

```sql
SELECT wn.phone_number, u.name as staff_name
FROM hr_whatsapp_numbers wn
LEFT JOIN auth.users u ON wn.assigned_staff_user_id = u.id;
```

The upload functionality should work perfectly after applying this fix!
