# UberAuditManager Financial Summary - Updated Breakdown

## Summary
Updated the Financial Summary section in UberAuditManager.tsx to show a clear breakdown with proper calculations, reversed color logic for Difference, and automatic penalty detection for incomplete trips.

## New Financial Summary Structure

### Formula Breakdown

```
Weekly Rent = 700 × (number of approved reports)
+ Deposit Cutting = sum of all deposit_cutting_amount
- Total Adjustments = sum of all adjustment amounts
─────────────────────────────────────────────────
= Final Pay

Cash at Bank = sum of all rent_paid_amount

Difference = Final Pay - Cash at Bank
  • If negative (red) → Company owes driver (refund needed)
  • If positive (green) → Driver owes company (collect payment)
  • If zero (gray) → Balanced
```

## Visual Layout

```
┌─────────────────────────────────────────┐
│      Financial Summary                   │
├─────────────────────────────────────────┤
│ Weekly Rent (700 × approved)    ₹4,900 │
│ Deposit Cutting:                ₹500    │
│ Total Adjustments:              ₹300    │
├─────────────────────────────────────────┤
│ Final Pay:                      ₹5,100  │
│ Cash at Bank:                   ₹5,000  │
├─────────────────────────────────────────┤
│ Difference:                    +₹100    │ ← GREEN (driver owes)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚠️ Incomplete Trips Detected           │
│                                          │
│ 2 day(s) with less than 10 trips        │
│ Dec 15: 8 trips                          │
│ Dec 17: 6 trips                          │
│                                          │
│ [Add Penalty ₹200]                      │
└─────────────────────────────────────────┘
```

## Field Details

### 1. Weekly Rent
**Formula:** `700 × number of approved reports`

**Logic:**
```typescript
const approvedReports = reportSummary.reports.filter(
  (report) => report.status?.toLowerCase() === "approved"
);
const weeklyRent = approvedReports.length * 700;
```

**Notes:**
- Only counts reports with status = 'approved'
- Fixed rate: ₹700 per approved report
- Does NOT include pending, rejected, or leave reports

### 2. Deposit Cutting
**Formula:** `Sum of all deposit_cutting_amount > 0`

**Logic:**
```typescript
const depositCutting = reportSummary.reports.reduce((acc, report) => {
  const amount = Number(report.deposit_cutting_amount) || 0;
  return acc + (amount > 0 ? amount : 0);
}, 0);
```

**Notes:**
- Sums all positive deposit cutting amounts
- Includes all reports (approved, pending, rejected)

### 3. Total Adjustments
**Formula:** `Sum of absolute values of all adjustment amounts`

**Logic:**
```typescript
const totalAdjustments = reportServiceDayAdjustments.reduce((sum, adj) => {
  return sum + Math.abs(adj.amount || 0);
}, 0);
```

**Display:** Purple text color (`text-purple-600`)

**Notes:**
- Uses `Math.abs()` to always show positive
- Includes adjustments with status = 'approved' or 'applied'
- Shown as a discount/reduction in Final Pay

### 4. Final Pay
**Formula:** `Weekly Rent + Deposit Cutting - Total Adjustments`

**Logic:**
```typescript
const finalPay = weeklyRent + depositCutting - totalAdjustments;
```

**Display:** Blue text color (`text-blue-600`), bold, border-top

**Notes:**
- This is what the driver should pay the company
- Positive value = driver owes company
- Adjustments reduce the amount driver needs to pay

### 5. Cash at Bank
**Formula:** `Sum of all rent_paid_amount > 0`

**Logic:**
```typescript
const cashAtBank = reportSummary.reports.reduce((acc, report) => {
  const amount = Number(report.rent_paid_amount) || 0;
  return acc + (amount > 0 ? amount : 0);
}, 0);
```

**Display:** Green text color (`text-green-600`), bold

**Notes:**
- Total amount driver has actually paid
- Sum of all rent_paid_amount fields from reports

### 6. Difference (UPDATED!)
**Formula:** `Final Pay - Cash at Bank`

**Logic:**
```typescript
const difference = finalPay - cashAtBank;

// REVERSED COLOR LOGIC:
if (difference < 0) {
  color = "text-red-600";      // Company owes driver (refund)
  display = "-₹{amount}";
} else if (difference > 0) {
  color = "text-green-600";    // Driver owes company (collect)
  display = "+₹{amount}";
} else {
  color = "text-gray-600";     // Balanced
  display = "₹0";
}
```

**Display:** 
- Large bold text (`text-lg`)
- Border-top separator
- Dynamic color based on value

**Color Meanings (REVERSED):**
| Color | Meaning | Example |
|-------|---------|---------|
| 🟢 Green (`text-green-600`) | Driver owes money to company | `+₹500` |
| 🔴 Red (`text-red-600`) | Company owes money to driver (refund) | `-₹300` |
| ⚫ Gray (`text-gray-600`) | Perfectly balanced | `₹0` |

### 7. Penalty Button (NEW!)

**Trigger Condition:**
Shows when driver has one or more approved reports with `total_trips < 10`

**Logic:**
```typescript
const incompleteDays = reportSummary.reports.filter((report) => {
  const trips = Number(report.total_trips) || 0;
  const status = report.status?.toLowerCase();
  return trips < 10 && status === "approved";
});

if (incompleteDays.length > 0) {
  const penaltyAmount = incompleteDays.length * 100; // ₹100 per day
  // Show penalty button
}
```

**Penalty Calculation:**
```
Penalty Amount = Number of Incomplete Days × ₹100
```

**Button Action:**
1. Gets current logged-in user
2. Fetches vehicle_number from reports
3. Creates adjustment record:
   - `category`: "penalty"
   - `amount`: Number of incomplete days × 100
   - `description`: "Penalty for X day(s) with less than 10 trips (₹100/day)"
   - `status`: "approved" (auto-approved)
4. Refreshes report summary
5. Shows success toast

**Visual Indicator:**
- Red background (`bg-red-50`)
- Red border (`border-red-200`)
- Warning icon (⚠️ AlertCircle)
- Lists incomplete days (up to 3, then shows "more")
- Shows trip count per day
- Shows total penalty amount on button

**Example Display:**
```
⚠️ Incomplete Trips Detected

2 day(s) with less than 10 trips

Dec 15    8 trips
Dec 17    6 trips

[Add Penalty ₹200]
```

## Example Calculations

### Example 1: Driver Owes Money (Green)
```
Weekly Rent:        7 approved × ₹700 = ₹4,900
Deposit Cutting:                       + ₹500
Total Adjustments:                     - ₹300
─────────────────────────────────────────────
Final Pay:                             = ₹5,100

Cash at Bank:                            ₹5,000
─────────────────────────────────────────────
Difference:         ₹5,100 - ₹5,000 = +₹100 🟢
```
**Result:** Driver needs to pay ₹100 more (shown in GREEN)

### Example 2: Company Owes Driver (Red)
```
Weekly Rent:        5 approved × ₹700 = ₹3,500
Deposit Cutting:                       + ₹200
Total Adjustments:                     - ₹500
─────────────────────────────────────────────
Final Pay:                             = ₹3,200

Cash at Bank:                            ₹3,500
─────────────────────────────────────────────
Difference:         ₹3,200 - ₹3,500 = -₹300 🔴
```
**Result:** Company needs to refund ₹300 to driver (shown in RED)

### Example 3: Penalty for Incomplete Trips
```
Weekly Rent:        6 approved × ₹700 = ₹4,200
Deposit Cutting:                       + ₹0
Total Adjustments:                     - ₹0
─────────────────────────────────────────────
Final Pay:                             = ₹4,200

Cash at Bank:                            ₹4,200
─────────────────────────────────────────────
Difference:         ₹4,200 - ₹4,200 = ₹0 ⚫

⚠️ Incomplete Trips Detected
3 day(s) with less than 10 trips
Penalty: ₹300 (3 days × ₹100)
```
**Action:** Admin clicks "Add Penalty ₹300" button
**Result:** 
- Adjustment created with `category: "penalty"`, `amount: 300`
- Total Adjustments becomes ₹300
- Final Pay becomes ₹3,900
- Difference becomes +₹300 (driver now owes) 🟢

## Code Changes

### File Modified
**`src/components/admin/uber/UberAuditManager.tsx`**

### Changes Made

#### 1. Reversed Difference Color Logic (Lines ~1609-1612)
**Before:**
```typescript
return difference > 0 ? "text-red-600" : difference < 0 ? "text-green-600" : "text-gray-600";
```

**After:**
```typescript
// REVERSED: Negative (company owes) = RED, Positive (driver owes) = GREEN
return difference < 0 ? "text-red-600" : difference > 0 ? "text-green-600" : "text-gray-600";
```

#### 2. Added Penalty Button (Lines ~1649-1741)
**New JSX Block:**
```tsx
{(() => {
  const incompleteDays = reportSummary.reports.filter((report) => {
    const trips = Number(report.total_trips) || 0;
    const status = report.status?.toLowerCase();
    return trips < 10 && status === "approved";
  });

  if (incompleteDays.length > 0) {
    const penaltyAmount = incompleteDays.length * 100;
    
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        {/* Penalty warning and button */}
      </div>
    );
  }
  return null;
})()}
```

#### 3. Updated ReportSummary Interface (Lines ~105-125)
**Added:**
```typescript
interface ReportSummary {
  // ... existing fields
  reports: Array<{
    // ... existing fields
    vehicle_number?: string; // ADDED
  }>;
}
```

#### 4. Updated fetchReportSummary Query (Lines ~665-679)
**Added to SELECT:**
```sql
vehicle_number
```

**Added to mapping:**
```typescript
vehicle_number: report.vehicle_number,
```

#### 5. Penalty Button onClick Handler
**Features:**
- Gets current user with `supabase.auth.getUser()`
- Extracts vehicle_number from report data
- Inserts penalty adjustment to `common_adjustments` table
- Auto-approves penalty (`status: "approved"`)
- Refreshes report summary
- Shows success/error toast

## Visual Design

### Color Scheme (Updated):
- **Purple** (`text-purple-600`) - Total Adjustments (discount indicator)
- **Blue** (`text-blue-600`) - Final Pay (key calculation)
- **Green** (`text-green-600`) - Cash at Bank AND Positive difference (driver owes)
- **Red** (`text-red-600`) - Negative difference (company owes refund)
- **Gray** (`text-gray-600`) - Zero difference (balanced)
- **Red Background** (`bg-red-50`) - Penalty warning box

### Typography:
- Regular font - individual line items
- `font-medium` - Weekly Rent, Deposit Cutting
- `font-semibold` - Total Adjustments, Final Pay, Difference labels
- `font-bold` - Cash at Bank value, Difference value
- `text-lg` - Difference value (larger for emphasis)
- `text-xs` - Penalty details

### Borders:
- `border-t pt-2` before Final Pay (visual separation)
- `border-t pt-2` before Difference (final calculation separator)
- `border border-red-200` around penalty box

## Use Cases

### Use Case 1: Weekly Audit Review
Admin opens weekly audit for driver:
1. See how many reports were approved
2. Check if any deposit was cut
3. Review total adjustments applied
4. Verify Final Pay calculation
5. Compare against Cash at Bank
6. **Action based on color:**
   - **Green (+₹X)** → Collect ₹X from driver
   - **Red (-₹X)** → Refund ₹X to driver
   - **Gray (₹0)** → All settled

### Use Case 2: Incomplete Trips Penalty
Admin notices penalty warning:
1. Review list of incomplete days
2. Check trip counts per day
3. Click "Add Penalty ₹X" button
4. System creates penalty adjustment automatically
5. Total Adjustments increases
6. Final Pay decreases (benefit to driver)
7. Penalty is reflected immediately

### Use Case 3: Dispute Resolution
Driver questions refund status:
1. Show clear breakdown of Weekly Rent (700 × N)
2. Show any Deposit Cutting
3. Show Total Adjustments (including penalties)
4. Show Final Pay calculation
5. Show Cash at Bank (what driver paid)
6. **Red difference clearly shows** company owes refund

## Testing

### Test Scenario 1: Driver Owes (Green Difference)
- 7 approved reports
- No deposit cutting
- No adjustments
- Driver pays ₹4,500 (should be ₹4,900)

**Expected:**
```
Weekly Rent: ₹4,900
Deposit Cutting: ₹0
Total Adjustments: ₹0
Final Pay: ₹4,900
Cash at Bank: ₹4,500
Difference: +₹400 🟢 (green - collect from driver)
```

### Test Scenario 2: Company Owes (Red Difference)
- 5 approved reports
- ₹500 deposit cutting
- ₹300 adjustment
- Driver overpays ₹4,000

**Expected:**
```
Weekly Rent: ₹3,500
Deposit Cutting: ₹500
Total Adjustments: ₹300
Final Pay: ₹3,700
Cash at Bank: ₹4,000
Difference: -₹300 🔴 (red - refund to driver)
```

### Test Scenario 3: Incomplete Trips Penalty
- 6 approved reports
- 3 reports have < 10 trips
- No deposit cutting
- Driver pays correct amount

**Expected:**
```
Weekly Rent: ₹4,200
Difference: ₹0 ⚫

⚠️ Incomplete Trips Detected
3 day(s) with less than 10 trips
[Add Penalty ₹300 button visible]
```

**After clicking Add Penalty:**
```
Total Adjustments: ₹300
Final Pay: ₹3,900
Cash at Bank: ₹4,200
Difference: -₹300 🔴 (refund ₹300 to driver)
```

## Benefits

1. **Reversed Logic** - Red for refunds (negative) is more intuitive
2. **Automatic Penalty Detection** - No manual tracking needed
3. **One-Click Penalty** - Instant penalty adjustment creation
4. **Transparency** - Shows exactly which days had incomplete trips
5. **Audit Trail** - All penalties recorded in common_adjustments table
6. **Fair Calculation** - Uses Total Working Days (approved reports) count
7. **Visual Clarity** - Color coding makes action clear at a glance

## Important Notes

- **Color Reversal**: Negative difference (company owes) = RED, Positive difference (driver owes) = GREEN
- **Penalty Rate**: Fixed at ₹100 per incomplete day
- **Trip Threshold**: 10 trips per day (hardcoded)
- **Auto-Approval**: Penalties are auto-approved when created
- **Working Days**: Uses `total_reports` count (approved reports only)
- **Vehicle Number**: Extracted from report data, not from audit record


## Field Details

### 1. Weekly Rent
**Formula:** `700 × number of approved reports`

**Logic:**
```typescript
const approvedReports = reportSummary.reports.filter(
  (report) => report.status?.toLowerCase() === "approved"
);
const weeklyRent = approvedReports.length * 700;
```

**Notes:**
- Only counts reports with status = 'approved'
- Fixed rate of ₹700 per approved report
- Does NOT include pending, rejected, or leave reports

### 2. Deposit Cutting
**Formula:** `Sum of all deposit_cutting_amount > 0`

**Logic:**
```typescript
const depositCutting = reportSummary.reports.reduce((acc, report) => {
  const amount = Number(report.deposit_cutting_amount) || 0;
  return acc + (amount > 0 ? amount : 0);
}, 0);
```

**Notes:**
- Sums all positive deposit cutting amounts
- Includes all reports (approved, pending, rejected)

### 3. Total Adjustments
**Formula:** `Sum of absolute values of all adjustment amounts`

**Logic:**
```typescript
const totalAdjustments = reportServiceDayAdjustments.reduce((sum, adj) => {
  return sum + Math.abs(adj.amount || 0);
}, 0);
```

**Display:** Purple text color (`text-purple-600`)

**Notes:**
- Uses `Math.abs()` to always show positive
- Includes adjustments with status = 'approved' or 'applied'
- Shown as a discount/reduction in Final Pay

### 4. Final Pay
**Formula:** `Weekly Rent + Deposit Cutting - Total Adjustments`

**Logic:**
```typescript
const finalPay = weeklyRent + depositCutting - totalAdjustments;
```

**Display:** Blue text color (`text-blue-600`), bold, border-top

**Notes:**
- This is what the driver should pay the company
- Positive value = driver owes company
- Adjustments reduce the amount driver needs to pay

### 5. Cash at Bank
**Formula:** `Sum of all rent_paid_amount > 0`

**Logic:**
```typescript
const cashAtBank = reportSummary.reports.reduce((acc, report) => {
  const amount = Number(report.rent_paid_amount) || 0;
  return acc + (amount > 0 ? amount : 0);
}, 0);
```

**Display:** Green text color (`text-green-600`), bold

**Notes:**
- Total amount driver has actually paid
- Sum of all rent_paid_amount fields from reports

### 6. Difference (NEW!)
**Formula:** `Final Pay - Cash at Bank`

**Logic:**
```typescript
const difference = finalPay - cashAtBank;

// Color coding:
if (difference > 0) {
  color = "text-red-600";      // Driver owes money
  display = "+₹{amount}";
} else if (difference < 0) {
  color = "text-green-600";    // Company owes driver
  display = "-₹{amount}";
} else {
  color = "text-gray-600";     // Balanced
  display = "₹0";
}
```

**Display:** 
- Large bold text (`text-lg`)
- Border-top separator
- Dynamic color based on value

**Color Meanings:**
| Color | Meaning | Example |
|-------|---------|---------|
| 🔴 Red (`text-red-600`) | Driver owes money to company | `+₹500` |
| 🟢 Green (`text-green-600`) | Company owes money to driver (refund) | `-₹300` |
| ⚫ Gray (`text-gray-600`) | Perfectly balanced | `₹0` |

## Example Calculations

### Example 1: Driver Owes Money
```
Weekly Rent:        7 approved × ₹700 = ₹4,900
Deposit Cutting:                       + ₹500
Total Adjustments:                     - ₹300
─────────────────────────────────────────────
Final Pay:                             = ₹5,100

Cash at Bank:                            ₹5,000
─────────────────────────────────────────────
Difference:         ₹5,100 - ₹5,000 = +₹100 🔴
```
**Result:** Driver needs to pay ₹100 more (shown in RED)

### Example 2: Company Owes Driver
```
Weekly Rent:        5 approved × ₹700 = ₹3,500
Deposit Cutting:                       + ₹200
Total Adjustments:                     - ₹500
─────────────────────────────────────────────
Final Pay:                             = ₹3,200

Cash at Bank:                            ₹3,500
─────────────────────────────────────────────
Difference:         ₹3,200 - ₹3,500 = -₹300 🟢
```
**Result:** Company needs to refund ₹300 to driver (shown in GREEN)

### Example 3: Perfectly Balanced
```
Weekly Rent:        6 approved × ₹700 = ₹4,200
Deposit Cutting:                       + ₹0
Total Adjustments:                     - ₹200
─────────────────────────────────────────────
Final Pay:                             = ₹4,000

Cash at Bank:                            ₹4,000
─────────────────────────────────────────────
Difference:         ₹4,000 - ₹4,000 = ₹0 ⚫
```
**Result:** No balance (shown in GRAY)

## Code Changes

### File Modified
**`src/components/admin/uber/UberAuditManager.tsx`**
**Lines:** 1498-1650

### What Changed

#### Before:
- Complex logic mixing approved/rejected/pending reports
- Weekly rent calculated with adjustment-based discount (400 vs 700)
- No clear difference indicator
- No color coding

#### After:
- Simple, clear calculation: 700 × approved reports only
- Separate line for Total Adjustments
- New "Difference" row with color coding
- Clear formula: Weekly Rent + Deposit - Adjustments = Final Pay

## Visual Design

### Color Scheme:
- **Purple** (`text-purple-600`) - Total Adjustments (discount indicator)
- **Blue** (`text-blue-600`) - Final Pay (key calculation)
- **Green** (`text-green-600`) - Cash at Bank (money received)
- **Red** (`text-red-600`) - Positive difference (driver owes)
- **Green** (`text-green-600`) - Negative difference (company owes)
- **Gray** (`text-gray-600`) - Zero difference (balanced)

### Typography:
- Regular font - individual line items
- `font-medium` - Weekly Rent, Deposit Cutting
- `font-semibold` - Total Adjustments, Final Pay, Difference labels
- `font-bold` - Cash at Bank value, Difference value
- `text-lg` - Difference value (larger for emphasis)

### Borders:
- `border-t pt-2` before Total Adjustments (visual separation)
- `border-t pt-2` before Difference (final calculation separator)

## Use Cases

### Use Case 1: Weekly Audit Review
Admin opens weekly audit for driver:
1. See how many reports were approved
2. Check if any deposit was cut
3. Review total adjustments applied
4. Verify Final Pay calculation
5. Compare against Cash at Bank
6. **Action:** If difference is RED → collect from driver
7. **Action:** If difference is GREEN → refund to driver

### Use Case 2: Dispute Resolution
Driver questions their payment:
1. Show clear breakdown of Weekly Rent (700 × N)
2. Show any Deposit Cutting
3. Show Total Adjustments (discounts given)
4. Show Final Pay calculation
5. Show Cash at Bank (what driver paid)
6. **Difference clearly shows** who owes what

### Use Case 3: Accounting
Finance team reconciles weekly payments:
1. Export weekly audit data
2. Final Pay = what should be collected
3. Cash at Bank = what was collected
4. Difference = outstanding/refund amount
5. Red entries = collection needed
6. Green entries = refunds to process

## Testing

### Test Scenario 1: Standard Week
- 7 approved reports
- No deposit cutting
- No adjustments
- Driver pays full amount

**Expected:**
```
Weekly Rent: ₹4,900
Deposit Cutting: ₹0
Total Adjustments: ₹0
Final Pay: ₹4,900
Cash at Bank: ₹4,900
Difference: ₹0 (gray)
```

### Test Scenario 2: With Adjustment
- 5 approved reports
- ₹500 deposit cutting
- ₹300 adjustment
- Driver pays ₹4,500

**Expected:**
```
Weekly Rent: ₹3,500
Deposit Cutting: ₹500
Total Adjustments: ₹300
Final Pay: ₹3,700
Cash at Bank: ₹4,500
Difference: -₹800 (green) → Refund driver
```

### Test Scenario 3: Underpayment
- 6 approved reports
- No deposit cutting
- No adjustments
- Driver pays ₹4,000 (should be ₹4,200)

**Expected:**
```
Weekly Rent: ₹4,200
Deposit Cutting: ₹0
Total Adjustments: ₹0
Final Pay: ₹4,200
Cash at Bank: ₹4,000
Difference: +₹200 (red) → Collect from driver
```

## Benefits

1. **Clarity** - Simple, step-by-step calculation
2. **Transparency** - Driver can see exactly how amount is calculated
3. **Quick Decision** - Color coding shows action needed at a glance
4. **Accurate** - Only counts approved reports (not pending/rejected)
5. **Visual** - Red/Green immediately indicates who owes whom
6. **Audit Trail** - Clear record of adjustments and their impact

## Notes

- Weekly Rent is now fixed at ₹700 per approved report (no variable rates)
- Adjustments are subtracted from Final Pay (shown as discount)
- Only positive amounts are summed (negative values ignored)
- All currency displayed with ₹ symbol and proper formatting
- Difference uses `toLocaleString()` for comma separators
