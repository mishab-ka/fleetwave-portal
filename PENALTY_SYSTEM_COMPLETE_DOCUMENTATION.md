# Penalty System - Complete Documentation

## Overview
Automatic penalty detection and distribution system for drivers who don't complete 10 trips per day. Penalties are calculated based on **total working days** and distributed to vehicles, appearing in VehiclePerformance as "Penalty Income".

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Penalty Flow                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Scan Weekly Reports                                       │
│     ↓                                                         │
│  2. Any Report < 10 trips?                                    │
│     ↓ YES                                                     │
│  3. Show Penalty Warning                                      │
│     - List incomplete days                                    │
│     - Calculate: Working Days × ₹100                          │
│     ↓                                                         │
│  4. Admin Clicks "Add Penalty ₹X"                            │
│     ↓                                                         │
│  5. Insert to driver_penalty_transactions (R/F)               │
│     ↓                                                         │
│  6. Distribute to vehicle_transactions (Penalty Income)       │
│     - Proportional to days per vehicle                        │
│     ↓                                                         │
│  7. Appears in:                                               │
│     - R/F Balance (driver owes)                               │
│     - VehiclePerformance > Penalty Income                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Working Days
**Definition:** Total number of approved reports in the week

**Not Based On:**
- ❌ Number of incomplete days
- ❌ Number of rejected reports
- ❌ Number of pending reports

**Based On:**
- ✅ Count of approved reports only

**Example:**
```
Week Reports:
- Monday: 12 trips, status: approved ✓
- Tuesday: 8 trips, status: approved ✓
- Wednesday: 15 trips, status: approved ✓
- Thursday: 6 trips, status: approved ✓
- Friday: No report
- Saturday: 10 trips, status: pending ✗
- Sunday: 9 trips, status: rejected ✗

Working Days = 4 (only approved reports)
Incomplete Days = 3 (Tuesday, Thursday, Sunday BUT Sunday is rejected so not counted)
Actual Incomplete = 2 (Tuesday, Thursday with approved status)

Penalty = 4 working days × ₹100 = ₹400
```

### Penalty Calculation Formula

```
IF any approved report has total_trips < 10:
  Working Days = COUNT(approved reports)
  Penalty Amount = Working Days × ₹100
ELSE:
  No penalty button shown
```

**Important:** Penalty is calculated on **total working days**, not just incomplete days!

## Visual Display

### Penalty Warning Box
```
┌─────────────────────────────────────────────┐
│ ⚠️ Incomplete Trips Detected               │
│                                              │
│ 2 day(s) with less than 10 trips            │
│ Penalty: ₹100 × 4 working days = ₹400      │
│                                              │
│ Dec 15: 8 trips                              │
│ Dec 17: 6 trips                              │
│                                              │
│        [Add Penalty ₹400]                   │
└─────────────────────────────────────────────┘
```

## Database Tables & Flow

### 1. driver_penalty_transactions (R/F Balance)

**Purpose:** Track driver's penalty/refund balance

**Insert:**
```typescript
{
  user_id: "driver-uuid",
  amount: 400, // Total penalty
  type: "penalty",
  description: "Penalty for 2 day(s) with less than 10 trips (₹100 × 4 working days)",
  created_by: "admin-uuid"
}
```

**Effect:** Updates R/F "Current Balance"
- Balance becomes: -₹400 (driver owes)
- Shows in transaction history

### 2. vehicle_transactions (Penalty Income)

**Purpose:** Distribute penalty to vehicles proportionally

**Distribution Logic:**
```typescript
// Count days per vehicle
vehicleDaysMap = {
  "KA-01-AB-1234": 3 days,
  "KA-01-CD-5678": 1 day
}

totalDays = 4

// Distribute proportionally
Vehicle 1: (3 / 4) × ₹400 = ₹300
Vehicle 2: (1 / 4) × ₹400 = ₹100
```

**Insert:**
```typescript
[
  {
    vehicle_number: "KA-01-AB-1234",
    transaction_type: "income",
    amount: 300,
    description: "Driver Penalty: Rajesh - Incomplete trips penalty (3 days) [PENALTY_TX_ID:uuid]",
    transaction_date: "2025-01-13", // Week start date (Monday)
    created_by: "admin-uuid"
  },
  {
    vehicle_number: "KA-01-CD-5678",
    transaction_type: "income",
    amount: 100,
    description: "Driver Penalty: Rajesh - Incomplete trips penalty (1 day) [PENALTY_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  }
]
```

**Effect:** Appears in VehiclePerformance page as "Penalty Income"

### 3. VehiclePerformance Display

**Query:**
```sql
SELECT 
  vehicle_number,
  SUM(CASE WHEN transaction_type = 'income' AND description LIKE '%Driver Penalty%' THEN amount ELSE 0 END) as penalty_income
FROM vehicle_transactions
WHERE transaction_date BETWEEN start_date AND end_date
GROUP BY vehicle_number
```

**Display:**
```
Vehicle Performance Report
┌──────────────────┬─────────┬───────────┬──────────────┐
│ Vehicle          │ Rent    │ Expenses  │ Penalty Income│
├──────────────────┼─────────┼───────────┼──────────────┤
│ KA-01-AB-1234   │ ₹2,100  │ ₹500      │ ₹300         │
│ KA-01-CD-5678   │ ₹700    │ ₹200      │ ₹100         │
└──────────────────┴─────────┴───────────┴──────────────┘
```

## Complete Code Flow

### Button Click Handler

```typescript
onClick={async () => {
  // 1. Calculate penalty
  const approvedReports = reportSummary.reports.filter(
    report => report.status?.toLowerCase() === "approved"
  );
  const workingDays = approvedReports.length;
  const penaltyAmount = workingDays * 100;

  // 2. Insert penalty transaction (R/F)
  const { data: insertedTx } = await supabase
    .from("driver_penalty_transactions")
    .insert({
      user_id: selectedAudit.user_id,
      amount: penaltyAmount,
      type: "penalty",
      description: `Penalty for ${incompleteDays.length} day(s) with less than 10 trips (₹100 × ${workingDays} working days)`,
      created_by: user.id,
    })
    .select("id")
    .single();

  const penaltyTxId = insertedTx.id;

  // 3. Get approved reports with vehicles
  const { data: reports } = await supabase
    .from("fleet_reports")
    .select("vehicle_number, rent_date")
    .eq("user_id", selectedAudit.user_id)
    .eq("status", "approved")
    .gte("rent_date", weekStartStr)
    .lte("rent_date", weekEndStr);

  // 4. Count days per vehicle
  const vehicleDaysMap = new Map();
  reports.forEach(report => {
    if (report.vehicle_number) {
      const count = vehicleDaysMap.get(report.vehicle_number) || 0;
      vehicleDaysMap.set(report.vehicle_number, count + 1);
    }
  });

  const totalDays = Array.from(vehicleDaysMap.values())
    .reduce((sum, days) => sum + days, 0);

  // 5. Distribute to vehicles
  const transactionsToInsert = Array.from(vehicleDaysMap.entries())
    .map(([vehicleNumber, days]) => {
      const proportionalAmount = (days / totalDays) * penaltyAmount;
      const roundedAmount = Math.round(proportionalAmount * 100) / 100;

      return {
        vehicle_number: vehicleNumber,
        transaction_type: "income",
        amount: roundedAmount,
        description: `Driver Penalty: ${driverName} - Incomplete trips penalty (${days} day${days > 1 ? "s" : ""}) [PENALTY_TX_ID:${penaltyTxId}]`,
        transaction_date: weekStartStr,
        created_by: user.id,
      };
    });

  await supabase
    .from("vehicle_transactions")
    .insert(transactionsToInsert);

  // 6. Refresh UI
  await fetchPenaltyTransactions(selectedAudit.user_id);
  
  toast({
    title: "Penalty Added",
    description: `₹${penaltyAmount} penalty added to R/F and distributed to vehicles`,
  });
}
```

## Example Scenarios

### Scenario 1: Single Vehicle, 4 Working Days

**Input:**
```
Driver: Rajesh
Week: Jan 13-19, 2025
Reports:
  - Mon: Vehicle A, 12 trips, approved
  - Tue: Vehicle A, 8 trips, approved ← incomplete
  - Wed: Vehicle A, 15 trips, approved
  - Thu: Vehicle A, 6 trips, approved ← incomplete
  - Fri-Sun: No reports

Working Days: 4 (all approved)
Incomplete Days: 2 (Tuesday, Thursday)
```

**Calculation:**
```
Penalty = 4 working days × ₹100 = ₹400
```

**Distribution:**
```
Vehicle A: 4/4 days = 100% × ₹400 = ₹400
```

**Result:**
- R/F Balance: -₹400 (Rajesh owes)
- Vehicle A Penalty Income: +₹400
- Total: Balanced (penalty from driver = income to vehicle)

### Scenario 2: Two Vehicles, 5 Working Days

**Input:**
```
Driver: Priya
Week: Jan 13-19, 2025
Reports:
  - Mon: Vehicle A, 11 trips, approved
  - Tue: Vehicle A, 7 trips, approved ← incomplete
  - Wed: Vehicle A, 13 trips, approved
  - Thu: Vehicle B, 9 trips, approved ← incomplete
  - Fri: Vehicle B, 14 trips, approved
  - Sat-Sun: No reports

Working Days: 5 (all approved)
Incomplete Days: 2 (Tuesday with A, Thursday with B)
```

**Calculation:**
```
Penalty = 5 working days × ₹100 = ₹500
```

**Distribution:**
```
Vehicle A: 3/5 days = 60% × ₹500 = ₹300
Vehicle B: 2/5 days = 40% × ₹500 = ₹200
```

**Result:**
- R/F Balance: -₹500 (Priya owes)
- Vehicle A Penalty Income: +₹300
- Vehicle B Penalty Income: +₹200
- Total: ₹500 (balanced)

### Scenario 3: Mixed Status Reports

**Input:**
```
Driver: Kumar
Week: Jan 13-19, 2025
Reports:
  - Mon: Vehicle A, 8 trips, approved ← incomplete
  - Tue: Vehicle A, 7 trips, approved ← incomplete
  - Wed: Vehicle A, 6 trips, pending (not counted)
  - Thu: Vehicle A, 12 trips, approved
  - Fri: Vehicle A, 5 trips, rejected (not counted)
  - Sat: Vehicle A, 11 trips, approved
  - Sun: No report

Working Days: 4 (only approved: Mon, Tue, Thu, Sat)
Incomplete Days (approved only): 2 (Monday, Tuesday)
```

**Calculation:**
```
Penalty = 4 working days × ₹100 = ₹400
(NOT 2 incomplete days × ₹100 = ₹200)
```

**Distribution:**
```
Vehicle A: 4/4 days = 100% × ₹400 = ₹400
```

**Result:**
- R/F Balance: -₹400 (Kumar owes)
- Vehicle A Penalty Income: +₹400

## Key Differences from Adjustments

| Aspect | Adjustments | Penalties |
|--------|-------------|-----------|
| **Table** | `common_adjustments` | `driver_penalty_transactions` → `vehicle_transactions` |
| **Purpose** | Discount/bonus on rent | Punishment for poor performance |
| **Effect on Rent** | Reduces Final Pay | No effect on Final Pay |
| **Effect on R/F** | No effect | Increases debt (negative balance) |
| **Effect on Vehicle** | No direct effect | Adds to Penalty Income |
| **Calculation** | Fixed or variable amount | Working days × ₹100 |
| **Distribution** | One-time to driver | Distributed to vehicles |

## R/F Balance Display

```typescript
if (currentDriverPenalties < 0) {
  color = "text-red-600";
  text = `-₹${Math.abs(currentDriverPenalties)}`;
  label = "Driver owes penalties";
} else if (currentDriverPenalties > 0) {
  color = "text-green-600";
  text = `₹${currentDriverPenalties}`;
  label = "Refund balance";
} else {
  color = "text-gray-600";
  text = "₹0";
  label = "No balance";
}
```

### After Adding ₹400 Penalty:
```
┌─────────────────────────────────────────┐
│      R/F Management                      │
├─────────────────────────────────────────┤
│ Current Balance: -₹400 🔴               │
│ Driver owes penalties                    │
│                                          │
│ Recent Transactions:                     │
│ ⚠️ Penalty - ₹400                       │
│ "Penalty for 2 day(s) with less than    │
│  10 trips (₹100 × 4 working days)"      │
│ Just now                                 │
└─────────────────────────────────────────┘
```

## VehiclePerformance Integration

### How Penalties Appear

The `vehicle_transactions` table is queried by VehiclePerformance to calculate penalty income:

```typescript
// In VehiclePerformance.tsx (or similar)
const penaltyIncome = transactions
  .filter(tx => 
    tx.transaction_type === "income" && 
    tx.description.includes("Driver Penalty")
  )
  .reduce((sum, tx) => sum + tx.amount, 0);
```

### Display:
```
Vehicle: KA-01-AB-1234
Date Range: Jan 13-19, 2025

Income:
  Rent: ₹2,100
  Penalty Income: ₹300 ← Shows here!
  Total Income: ₹2,400

Expenses:
  Other Expense: ₹500
  Total Expenses: ₹500

Profit: ₹1,900
```

## Testing Scenarios

### Test 1: Basic Penalty (4 Working Days)
```
Setup:
- 4 approved reports, all in Vehicle A
- 2 reports have < 10 trips

Expected:
- Warning shows: "2 day(s) with less than 10 trips"
- Calculation shows: "₹100 × 4 working days = ₹400"
- Button shows: "Add Penalty ₹400"

After Click:
- driver_penalty_transactions: 1 record, ₹400
- vehicle_transactions: 1 record, Vehicle A, ₹400
- R/F Balance: -₹400
```

### Test 2: Multi-Vehicle Distribution
```
Setup:
- 5 approved reports
- Vehicle A: 3 reports
- Vehicle B: 2 reports
- 1 report has < 10 trips

Expected:
- Warning shows: "1 day(s) with less than 10 trips"
- Calculation shows: "₹100 × 5 working days = ₹500"
- Button shows: "Add Penalty ₹500"

After Click:
- driver_penalty_transactions: 1 record, ₹500
- vehicle_transactions: 2 records
  - Vehicle A: ₹300 (3/5 × ₹500)
  - Vehicle B: ₹200 (2/5 × ₹500)
- R/F Balance: -₹500
```

### Test 3: No Incomplete Days
```
Setup:
- 6 approved reports
- All reports have >= 10 trips

Expected:
- No warning displayed
- No penalty button
- Normal financial summary shown
```

### Test 4: Mixed Status Reports
```
Setup:
- 3 approved reports (< 10 trips)
- 2 pending reports
- 1 rejected report

Expected:
- Only counts 3 approved reports
- Warning shows: "3 day(s) with less than 10 trips"
- Calculation shows: "₹100 × 3 working days = ₹300"
- Button shows: "Add Penalty ₹300"
```

## Benefits

1. **Fair Calculation** - Based on total working days, not just incomplete days
2. **Proportional Distribution** - Vehicles get penalty income based on usage
3. **Clear Tracking** - Appears in both R/F and VehiclePerformance
4. **Audit Trail** - Transaction ID links driver penalty to vehicle income
5. **Balanced Accounting** - Penalty from driver = Income to vehicles
6. **Automatic** - One-click process, no manual calculation needed

## Important Notes

- **Penalty Rate:** Fixed at ₹100 per working day
- **Working Days:** Count of approved reports only
- **Trip Threshold:** 10 trips per day (hardcoded)
- **Distribution:** Proportional to days each vehicle was used
- **Transaction Date:** Uses week start date (Monday) for consistency
- **Transaction Type:** "income" for vehicles (not expense)
- **Description Format:** Includes driver name, days, and penalty transaction ID

## Summary

The penalty system now:
1. ✅ Calculates penalty as: **Working Days × ₹100**
2. ✅ Adds to R/F balance (driver owes)
3. ✅ Distributes to vehicles as "Penalty Income"
4. ✅ Appears in VehiclePerformance page
5. ✅ Follows same pattern as PenaltyManagement.tsx

If driver works 4 days with some incomplete trips:
- Penalty = 4 × ₹100 = ₹400 (not based on incomplete days count)
- R/F shows: -₹400 (driver owes)
- Vehicles show: +₹400 total Penalty Income (distributed proportionally)
