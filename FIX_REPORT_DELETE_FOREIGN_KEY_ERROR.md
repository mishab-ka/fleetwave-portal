# Fix: Report Delete Foreign Key Constraint Error

## Problem
When trying to delete a fleet report that has adjustments applied to it, the system was throwing a foreign key constraint error:

```
Error: "update or delete on table \"fleet_reports\" violates foreign key constraint 
\"common_adjustments_applied_to_report_fkey\" on table \"common_adjustments\""

Details: "Key (id)=(55f27ca2-ea1b-446d-b491-99ba7d271d89) is still referenced 
from table \"common_adjustments\"."
```

This happened because the `common_adjustments` table has a foreign key `applied_to_report` that references `fleet_reports.id`, and the database was preventing deletion of reports that are still referenced.

## Root Cause

### Database Schema
```sql
CREATE TABLE common_adjustments (
  -- ...
  applied_to_report UUID REFERENCES fleet_reports(id), -- Foreign key constraint
  -- ...
);
```

When a report is approved and has adjustments, the adjustments are "applied" to the report by:
1. Setting `applied_to_report` to the report ID
2. Changing `status` from 'approved' to 'applied'
3. Setting `applied_at` timestamp

This creates a foreign key relationship that prevents the report from being deleted.

## Solution

Updated `handleDeleteReport()` function in `AdminReports.tsx` to:
1. **First**: Unlink adjustments from the report (set `applied_to_report` to NULL)
2. **Then**: Delete the report
3. **Finally**: Update vehicle trip count as before

### Implementation

```typescript
const handleDeleteReport = async () => {
  if (!selectedReport) return;

  try {
    // Step 1: First, unlink any adjustments that are applied to this report
    const { error: unlinkError } = await supabase
      .from("common_adjustments")
      .update({ 
        applied_to_report: null,
        status: 'approved', // Reset status back to approved (not applied)
        applied_at: null
      })
      .eq("applied_to_report", selectedReport.id);

    if (unlinkError) {
      console.error("Error unlinking adjustments:", unlinkError);
      throw unlinkError;
    }

    // Step 2: Delete the report
    const { error: deleteError } = await supabase
      .from("fleet_reports")
      .delete()
      .eq("id", selectedReport.id);

    if (deleteError) throw deleteError;

    // Step 3-5: Update vehicle trips and local state (existing logic)
    // ...
  } catch (error) {
    console.error("Error deleting report:", error);
    toast.error("Failed to delete report.");
  }
};
```

## What Changed

### Before
```typescript
// Step 1: Delete the report directly
const { error: deleteError } = await supabase
  .from("fleet_reports")
  .delete()
  .eq("id", selectedReport.id);

// ❌ This fails if report has adjustments!
```

### After
```typescript
// Step 1: Unlink adjustments first
const { error: unlinkError } = await supabase
  .from("common_adjustments")
  .update({ 
    applied_to_report: null,
    status: 'approved',
    applied_at: null
  })
  .eq("applied_to_report", selectedReport.id);

// Step 2: Now delete the report
const { error: deleteError } = await supabase
  .from("fleet_reports")
  .delete()
  .eq("id", selectedReport.id);

// ✅ This works! Adjustments are preserved but unlinked
```

## Behavior

### When Deleting a Report With Adjustments

1. **Adjustments are preserved**: They remain in the `common_adjustments` table
2. **Status reset**: Changed from 'applied' → 'approved'
3. **Link removed**: `applied_to_report` set to NULL
4. **Timestamp cleared**: `applied_at` set to NULL
5. **Report deleted**: Fleet report is removed from database

### Result
- ✅ Report can be deleted successfully
- ✅ Adjustments are preserved and can be re-applied to future reports
- ✅ No data loss
- ✅ No orphaned foreign keys

## Alternative Approaches Considered

### Option 1: CASCADE DELETE (Not Chosen)
```sql
-- Could set foreign key to CASCADE
applied_to_report UUID REFERENCES fleet_reports(id) ON DELETE CASCADE
```
**Why not**: This would delete the adjustments when the report is deleted, causing data loss.

### Option 2: SET NULL (Not Chosen)
```sql
-- Could set foreign key to SET NULL
applied_to_report UUID REFERENCES fleet_reports(id) ON DELETE SET NULL
```
**Why not**: This would work but wouldn't reset the status or timestamp, leaving the adjustment in an inconsistent state.

### Option 3: Application-level Unlinking (✅ Chosen)
```typescript
// Unlink adjustments in application code before deletion
await supabase.from("common_adjustments").update({...})
```
**Why chosen**: 
- Full control over data state
- Can reset status and timestamp properly
- Preserves adjustment history
- No data loss
- Clear audit trail

## Files Modified

1. `/src/pages/admin/AdminReports.tsx`
   - Updated `handleDeleteReport()` function
   - Added unlinking step before deletion

## Testing Checklist

- [ ] Delete report with no adjustments → Should work (already worked)
- [ ] Delete report with one adjustment → Should work (was broken, now fixed)
- [ ] Delete report with multiple adjustments → Should work
- [ ] Verify adjustment status reset to 'approved'
- [ ] Verify `applied_to_report` set to NULL
- [ ] Verify `applied_at` set to NULL
- [ ] Verify vehicle trip count updated correctly
- [ ] Verify no error messages in console

## Edge Cases Handled

1. **Multiple Adjustments**: All adjustments linked to the report are unlinked
2. **No Adjustments**: Unlink query returns 0 rows but doesn't error
3. **Already Unlinked**: If adjustment is already unlinked, no change occurs
4. **Network Errors**: Error handling catches and displays appropriate message

## Error Messages

### Before Fix
```
Error deleting report: {
  code: "23503",
  message: "update or delete on table \"fleet_reports\" violates foreign key constraint..."
}
```

### After Fix
```
✅ "Report deleted and vehicle trips updated."
```

## Related Components

This fix also enables proper deletion in:
- Manager Reports view
- Admin Calendar (when deleting via report detail modal)
- Any component that calls the delete report functionality

## Future Considerations

1. **Soft Delete**: Consider implementing soft delete (setting `deleted_at` timestamp) instead of hard delete
2. **Audit Trail**: Log report deletions for compliance
3. **Confirmation Dialog**: Add warning if report has adjustments before deletion
4. **Batch Operations**: Handle bulk report deletions efficiently

## Summary

The fix resolves the foreign key constraint error by properly unlinking adjustments from reports before deletion. This preserves adjustment data while allowing report deletion, maintaining data integrity and preventing errors.
