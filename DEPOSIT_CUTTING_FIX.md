# Deposit Cutting Amount Fix

## Problem

The deposit cutting amount was being calculated dynamically in the admin panel, which caused issues when:

1. Admin edited reports - the deposit cutting amount would change
2. The rent calculation would be inconsistent between driver submission and admin editing
3. The deposit cutting logic was complex and error-prone when recalculating

## Solution

Save the deposit cutting amount directly in the `fleet_reports` table when the driver submits the form, making it immutable and consistent.

## Changes Made

### 1. Database Schema Update

- **File**: `supabase/ADD_DEPOSIT_CUTTING_TO_FLEET_REPORTS.sql`
- **Change**: Added `deposit_cutting_amount` column to `fleet_reports` table
- **Purpose**: Store the calculated deposit cutting amount at submission time

### 2. Driver Submission (SubmitReport.tsx)

- **File**: `src/pages/SubmitReport.tsx`
- **Change**: Added `deposit_cutting_amount: depositCutting` to the report insertion
- **Purpose**: Save the calculated deposit cutting amount when driver submits the form

### 3. Admin Panel Updates (AdminReports.tsx)

- **File**: `src/pages/admin/AdminReports.tsx`
- **Changes**:
  - Added `deposit_cutting_amount: number` to the `Report` interface
  - Updated `recomputeRentPaidAmount()` to use saved deposit cutting amount
  - Updated `getPaymentPreviewMessage()` to use saved deposit cutting amount
  - Simplified `updateReportStatus()` to use saved amount instead of calculating
  - Added deposit cutting amount field to the admin edit modal
  - Updated save function to include deposit cutting amount

## Benefits

1. **Consistency**: Deposit cutting amount is fixed at submission time and doesn't change
2. **Reliability**: No complex recalculation logic that could fail
3. **Transparency**: Admin can see and edit the deposit cutting amount if needed
4. **Performance**: No need to recalculate deposit cutting on every admin action
5. **Audit Trail**: The deposit cutting amount is preserved in the report history

## How It Works

1. **Driver Submission**:

   - Driver fills out the form
   - System calculates deposit cutting amount based on current conditions
   - Amount is saved in `fleet_reports.deposit_cutting_amount`
   - Rent calculation includes this fixed amount

2. **Admin Approval**:

   - Admin approves the report
   - System uses the saved `deposit_cutting_amount` to create balance transactions
   - No recalculation needed

3. **Admin Editing**:
   - Admin can view and modify the deposit cutting amount if needed
   - Rent calculation uses the saved amount consistently
   - Changes are preserved in the database

## Database Migration

Run the SQL script to add the new column:

```sql
-- Execute: supabase/ADD_DEPOSIT_CUTTING_TO_FLEET_REPORTS.sql
```

## Testing

1. Submit a report as a driver with deposit cutting enabled
2. Verify the deposit cutting amount is saved in the database
3. Approve the report and check that the correct amount is added to driver balance
4. Edit the report as admin and verify the amount remains consistent
5. Check that rent calculations are accurate in all scenarios
