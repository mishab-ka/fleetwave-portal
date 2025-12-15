# WhatsApp Numbers Table Fix

## Issue

The `hr_whatsapp_numbers` table is missing required columns for the WhatsApp upload functionality:

- `assigned_staff_user_id` - to assign numbers to HR staff
- `status` - to track the status of WhatsApp conversations
- `hr_manager_user_id` - to track which manager owns the numbers
- `last_contact_date` - to track when the number was last contacted
- `callback_date` - to schedule callbacks
- `notes` - for additional notes

## Solution

Two SQL files are provided:

### Option 1: ADD_WHATSAPP_COLUMNS.sql (Recommended)

- **Safe approach** - adds missing columns to existing table
- **Preserves existing data** - won't lose any current WhatsApp numbers
- **Adds indexes** for better performance
- **Sets up RLS policies** for proper access control
- **Creates hr_whatsapp_activities table** for conversation tracking

### Option 2: FIX_HR_WHATSAPP_NUMBERS.sql (Clean slate)

- **Complete rebuild** - drops and recreates the table
- **Clean structure** - ensures proper table design
- **⚠️ WARNING: This will delete all existing WhatsApp numbers**
- Use only if you don't have important data to preserve

## How to Apply

### For Production (with existing data):

```sql
-- Run this file in your Supabase SQL editor
-- File: supabase/ADD_WHATSAPP_COLUMNS.sql
```

### For Development (clean slate):

```sql
-- Run this file in your Supabase SQL editor
-- File: supabase/FIX_HR_WHATSAPP_NUMBERS.sql
```

## What This Fixes

### Database Structure

- ✅ Adds `assigned_staff_user_id` column for staff assignment
- ✅ Adds `status` column for conversation tracking
- ✅ Adds `hr_manager_user_id` column for manager ownership
- ✅ Adds `last_contact_date` and `callback_date` for scheduling
- ✅ Adds `notes` column for additional information

### Access Control

- ✅ HR Managers can manage their WhatsApp numbers
- ✅ HR Staff can view and update their assigned numbers
- ✅ Admins have full access to all numbers
- ✅ Proper RLS policies for data security

### Performance

- ✅ Indexes on frequently queried columns
- ✅ Optimized for staff assignment queries
- ✅ Fast status filtering

### Activity Tracking

- ✅ `hr_whatsapp_activities` table for conversation logs
- ✅ Tracks chat initiation, status changes, notes
- ✅ Links activities to specific WhatsApp numbers
- ✅ Proper access control for activity viewing

## After Running the SQL

1. **Test the upload functionality** - try uploading a file with phone numbers
2. **Verify staff assignment** - check that numbers are distributed to staff
3. **Test status updates** - ensure HR staff can update conversation status
4. **Check activity tracking** - verify that activities are logged properly

## Expected Results

After applying the fix:

- ✅ WhatsApp number upload will work without errors
- ✅ Numbers will be automatically distributed to staff
- ✅ HR staff can view and manage their assigned numbers
- ✅ Conversation activities will be tracked
- ✅ Status updates will be recorded
- ✅ All RLS policies will be enforced

## Troubleshooting

If you encounter issues:

1. **Check table structure** - verify all columns exist
2. **Verify RLS policies** - ensure proper access control
3. **Test with different user roles** - HR manager vs HR staff
4. **Check console for errors** - look for any remaining database issues

The upload functionality should work perfectly after applying this fix!
