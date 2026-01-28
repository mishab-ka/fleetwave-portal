# Weekly Audit System - Complete Documentation

## Overview
Automatic weekly audit system that checks if drivers completed the required total trips (Working Days × 10). When shortfall is detected, the system adds TWO transactions: a **Refund** (to driver) and a **Penalty** (from driver).

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Weekly Audit Flow                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Calculate Required Trips                                  │
│     Working Days × 10 = Required Trips                        │
│     Example: 6 days × 10 = 60 trips                          │
│     ↓                                                         │
│  2. Check Total Trips Completed                               │
│     If Total Trips < Required Trips → Show Audit Button       │
│     Example: 58 trips < 60 trips → Shortfall detected        │
│     ↓                                                         │
│  3. Admin Clicks "Process Weekly Audit"                      │
│     ↓                                                         │
│  4. Add TWO R/F Transactions:                                │
│     A. Refund: +₹600 (type: "refund")                       │
│     B. Penalty: -₹X (type: "penalty", X = working days × 100)│
│     ↓                                                         │
│  5. Distribute to vehicle_transactions:                       │
│     A. Refund → "expense" (vehicles pay back to driver)      │
│     B. Penalty → "income" (vehicles receive from driver)     │
│     ↓                                                         │
│  6. Net Effect:                                               │
│     - R/F Balance updated                                     │
│     - VehiclePerformance shows both transactions              │
│     - Net amount to driver calculated                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Required Trips Calculation

**Formula:**
```
Required Trips = Working Days × 10
```

**Working Days** = Count of approved reports only

**Example:**
```
Week Reports:
- Monday: approved ✓
- Tuesday: approved ✓
- Wednesday: approved ✓
- Thursday: approved ✓
- Friday: approved ✓
- Saturday: approved ✓
- Sunday: offline ✗

Working Days = 6
Required Trips = 6 × 10 = 60 trips
```

### 2. Trips Shortfall Detection

**Condition:**
```javascript
if (totalTrips < requiredTrips) {
  // Show Weekly Audit button
}
```

**Example:**
```
Required: 60 trips
Completed: 58 trips
Shortfall: 2 trips
→ Show audit button
```

### 3. Transaction Types

#### A. Refund Transaction
- **Amount:** ₹600 (fixed)
- **Type:** "refund"
- **Effect:** Driver receives money (positive balance)
- **Vehicle Impact:** Expense (vehicles pay back)
- **Description:** "Weekly Audit - Refund (week date, trips completed, working days)"

#### B. Penalty Transaction
- **Amount:** Working Days × ₹100
- **Type:** "penalty"
- **Effect:** Driver owes money (negative balance)
- **Vehicle Impact:** Income (vehicles receive)
- **Description:** "Weekly Audit - Missing Trips Completed (week date, working days, trips)"

### 4. Net Effect Calculation

```
Net to Driver = Refund - Penalty
Net to Driver = ₹600 - (Working Days × ₹100)
```

**Examples:**

| Working Days | Refund | Penalty | Net to Driver |
|--------------|--------|---------|---------------|
| 6 days | +₹600 | -₹600 | **₹0** (balanced) |
| 5 days | +₹600 | -₹500 | **+₹100** (driver gets) |
| 7 days | +₹600 | -₹700 | **-₹100** (driver owes) |
| 4 days | +₹600 | -₹400 | **+₹200** (driver gets) |

## Visual Display

### Weekly Audit Warning Box

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Weekly Audit - Trips Shortfall                      │
├─────────────────────────────────────────────────────────┤
│ Working Days:           6 days                          │
│ Required Trips:         60 trips                        │
│ Completed Trips:        58 trips                        │
│ ─────────────────────────────────────────────────       │
│ Shortfall:             2 trips (RED)                    │
│                                                          │
│ 2 day(s) with <10 trips:                                │
│ Dec 15: 8 trips                                          │
│ Dec 17: 9 trips                                          │
│                                                          │
│ Transactions to be added:                                │
│ • Refund to Driver:     +₹600 (GREEN)                  │
│ • Penalty from Driver:  -₹600 (RED)                    │
│ ─────────────────────────────────────────────────       │
│ Net to Driver:          ₹0                              │
│                                                          │
│        [Process Weekly Audit]                            │
│         Refund: +₹600                                   │
│         Penalty: -₹600                                  │
└─────────────────────────────────────────────────────────┘
```

## Database Tables & Flow

### 1. driver_penalty_transactions (R/F Balance)

#### A. Refund Record
```typescript
{
  user_id: "driver-uuid",
  amount: 600,
  type: "refund",
  description: "Weekly Audit - Refund (13 Jan - 19 Jan 2025, 58 trips completed, 6 working days)",
  created_by: "admin-uuid"
}
```

**Effect on R/F:**
- Balance increases by ₹600
- Shows as positive transaction (green)

#### B. Penalty Record
```typescript
{
  user_id: "driver-uuid",
  amount: 600, // 6 working days × ₹100
  type: "penalty",
  description: "Weekly Audit - Missing Trips Completed (13 Jan - 19 Jan 2025, 6 working days, 58/60 trips)",
  created_by: "admin-uuid"
}
```

**Effect on R/F:**
- Balance decreases by ₹600
- Shows as negative transaction (red)

### 2. vehicle_transactions (Distribution)

#### Distribution Logic

**Count days per vehicle:**
```typescript
vehicleDaysMap = {
  "KA-01-AB-1234": 4 days,
  "KA-01-CD-5678": 2 days
}

totalDays = 6

// Proportional distribution
Vehicle A share: 4/6 = 66.67%
Vehicle B share: 2/6 = 33.33%
```

#### A. Refund Transactions (Expense for Vehicles)

**Vehicle A:**
```typescript
{
  vehicle_number: "KA-01-AB-1234",
  transaction_type: "expense",
  amount: 400, // (4/6) × ₹600
  description: "Driver Refund: Rajesh - Weekly Audit Refund (4 days) [REFUND_TX_ID:uuid]",
  transaction_date: "2025-01-13",
  created_by: "admin-uuid"
}
```

**Vehicle B:**
```typescript
{
  vehicle_number: "KA-01-CD-5678",
  transaction_type: "expense",
  amount: 200, // (2/6) × ₹600
  description: "Driver Refund: Rajesh - Weekly Audit Refund (2 days) [REFUND_TX_ID:uuid]",
  transaction_date: "2025-01-13",
  created_by: "admin-uuid"
}
```

#### B. Penalty Transactions (Income for Vehicles)

**Vehicle A:**
```typescript
{
  vehicle_number: "KA-01-AB-1234",
  transaction_type: "income",
  amount: 400, // (4/6) × ₹600
  description: "Driver Penalty: Rajesh - Missing Trips Penalty (4 days) [PENALTY_TX_ID:uuid]",
  transaction_date: "2025-01-13",
  created_by: "admin-uuid"
}
```

**Vehicle B:**
```typescript
{
  vehicle_number: "KA-01-CD-5678",
  transaction_type: "income",
  amount: 200, // (2/6) × ₹600
  description: "Driver Penalty: Rajesh - Missing Trips Penalty (2 days) [PENALTY_TX_ID:uuid]",
  transaction_date: "2025-01-13",
  created_by: "admin-uuid"
}
```

### 3. VehiclePerformance Display

**Vehicle A (KA-01-AB-1234):**
```
Income:
  Rent: ₹2,800 (4 days × ₹700)
  Penalty Income: +₹400 ← From driver penalty
  Total Income: ₹3,200

Expenses:
  Refund Expense: -₹400 ← Paid to driver
  Other Expenses: ₹500
  Total Expenses: ₹900

Net: ₹2,300
```

**Vehicle B (KA-01-CD-5678):**
```
Income:
  Rent: ₹1,400 (2 days × ₹700)
  Penalty Income: +₹200 ← From driver penalty
  Total Income: ₹1,600

Expenses:
  Refund Expense: -₹200 ← Paid to driver
  Other Expenses: ₹200
  Total Expenses: ₹400

Net: ₹1,200
```

## Complete Code Flow

### Button Trigger Logic

```typescript
// Calculate working days and total trips
const approvedReports = reportSummary.reports.filter(
  (report) => report.status?.toLowerCase() === "approved"
);
const workingDays = approvedReports.length;
const totalTrips = approvedReports.reduce(
  (sum, report) => sum + (Number(report.total_trips) || 0),
  0
);
const requiredTrips = workingDays * 10;
const tripsShortfall = requiredTrips - totalTrips;

// Show button if trips are less than required
if (totalTrips < requiredTrips && workingDays > 0) {
  const penaltyAmount = workingDays * 100;
  const refundAmount = 600; // Fixed refund amount
  
  // Show Weekly Audit button
}
```

### Button Click Handler

```typescript
onClick={async () => {
  // 1. Calculate week range
  const weekStartDate = new Date(weekEndDate);
  weekStartDate.setDate(weekEndDate.getDate() - 6);
  const weekRangeStr = `${format(weekStartDate, "dd MMM")} - ${format(weekEndDate, "dd MMM yyyy")}`;

  // 2. Add REFUND transaction to R/F
  const { data: refundTx } = await supabase
    .from("driver_penalty_transactions")
    .insert({
      user_id: selectedAudit.user_id,
      amount: refundAmount,
      type: "refund",
      description: `Weekly Audit - Refund (${weekRangeStr}, ${totalTrips} trips completed, ${workingDays} working days)`,
      created_by: user.id,
    })
    .select("id")
    .single();

  const refundTxId = refundTx.id;

  // 3. Add PENALTY transaction to R/F
  const { data: penaltyTx } = await supabase
    .from("driver_penalty_transactions")
    .insert({
      user_id: selectedAudit.user_id,
      amount: penaltyAmount,
      type: "penalty",
      description: `Weekly Audit - Missing Trips Completed (${weekRangeStr}, ${workingDays} working days, ${totalTrips}/${requiredTrips} trips)`,
      created_by: user.id,
    })
    .select("id")
    .single();

  const penaltyTxId = penaltyTx.id;

  // 4. Get approved reports with vehicles
  const { data: reports } = await supabase
    .from("fleet_reports")
    .select("vehicle_number, rent_date")
    .eq("user_id", selectedAudit.user_id)
    .eq("status", "approved")
    .gte("rent_date", weekStartStr)
    .lte("rent_date", weekEndStr);

  // 5. Count days per vehicle
  const vehicleDaysMap = new Map();
  reports.forEach(report => {
    if (report.vehicle_number) {
      const count = vehicleDaysMap.get(report.vehicle_number) || 0;
      vehicleDaysMap.set(report.vehicle_number, count + 1);
    }
  });

  const totalDays = Array.from(vehicleDaysMap.values())
    .reduce((sum, days) => sum + days, 0);

  // 6. Distribute to vehicle_transactions
  const transactionsToInsert = [];

  // Add refund transactions (expense for vehicles)
  Array.from(vehicleDaysMap.entries()).forEach(([vehicleNumber, days]) => {
    const proportionalRefund = (days / totalDays) * refundAmount;
    const roundedRefund = Math.round(proportionalRefund * 100) / 100;

    transactionsToInsert.push({
      vehicle_number: vehicleNumber,
      transaction_type: "expense",
      amount: roundedRefund,
      description: `Driver Refund: ${driverName} - Weekly Audit Refund (${days} day${days > 1 ? "s" : ""}) [REFUND_TX_ID:${refundTxId}]`,
      transaction_date: weekStartStr,
      created_by: user.id,
    });
  });

  // Add penalty transactions (income for vehicles)
  Array.from(vehicleDaysMap.entries()).forEach(([vehicleNumber, days]) => {
    const proportionalPenalty = (days / totalDays) * penaltyAmount;
    const roundedPenalty = Math.round(proportionalPenalty * 100) / 100;

    transactionsToInsert.push({
      vehicle_number: vehicleNumber,
      transaction_type: "income",
      amount: roundedPenalty,
      description: `Driver Penalty: ${driverName} - Missing Trips Penalty (${days} day${days > 1 ? "s" : ""}) [PENALTY_TX_ID:${penaltyTxId}]`,
      transaction_date: weekStartStr,
      created_by: user.id,
    });
  });

  await supabase
    .from("vehicle_transactions")
    .insert(transactionsToInsert);

  // 7. Success toast
  const netAmount = refundAmount - penaltyAmount;
  toast({
    title: "Weekly Audit Completed",
    description: `Refund: +₹${refundAmount}, Penalty: -₹${penaltyAmount} (Net: ${netAmount > 0 ? "+" : ""}₹${netAmount})`,
  });

  // 8. Refresh UI
  await fetchPenaltyTransactions(selectedAudit.user_id);
}
```

## Example Scenarios

### Scenario 1: 6 Working Days, 58 Trips (Balanced)

**Input:**
```
Working Days: 6
Required Trips: 60 (6 × 10)
Completed Trips: 58
Shortfall: 2 trips

Vehicles:
- Vehicle A: 4 days
- Vehicle B: 2 days
```

**Calculations:**
```
Refund: ₹600 (fixed)
Penalty: 6 × ₹100 = ₹600
Net to Driver: ₹600 - ₹600 = ₹0
```

**R/F Transactions:**
```
1. Refund: +₹600 (type: refund)
2. Penalty: -₹600 (type: penalty)
Net R/F Balance: ₹0
```

**Vehicle Transactions:**
```
Vehicle A (4/6 share):
- Refund Expense: -₹400
- Penalty Income: +₹400
- Net: ₹0

Vehicle B (2/6 share):
- Refund Expense: -₹200
- Penalty Income: +₹200
- Net: ₹0
```

**Final Result:**
- Driver R/F Balance: ₹0 (balanced)
- Vehicle A Net: ₹0 (balanced)
- Vehicle B Net: ₹0 (balanced)

### Scenario 2: 5 Working Days, 48 Trips (Driver Gets Money)

**Input:**
```
Working Days: 5
Required Trips: 50 (5 × 10)
Completed Trips: 48
Shortfall: 2 trips

Vehicles:
- Vehicle A: 3 days
- Vehicle B: 2 days
```

**Calculations:**
```
Refund: ₹600 (fixed)
Penalty: 5 × ₹100 = ₹500
Net to Driver: ₹600 - ₹500 = +₹100 (driver receives)
```

**R/F Transactions:**
```
1. Refund: +₹600
2. Penalty: -₹500
Net R/F Balance: +₹100 (driver has positive balance)
```

**Vehicle Transactions:**
```
Vehicle A (3/5 share):
- Refund Expense: -₹360
- Penalty Income: +₹300
- Net: -₹60 (vehicle pays out)

Vehicle B (2/5 share):
- Refund Expense: -₹240
- Penalty Income: +₹200
- Net: -₹40 (vehicle pays out)

Total Vehicles: -₹100 (matches driver's +₹100)
```

**Final Result:**
- Driver R/F Balance: +₹100 (green, refund balance)
- Vehicles pay out: -₹100 total

### Scenario 3: 7 Working Days, 68 Trips (Driver Owes)

**Input:**
```
Working Days: 7
Required Trips: 70 (7 × 10)
Completed Trips: 68
Shortfall: 2 trips

Vehicles:
- Vehicle A: 5 days
- Vehicle B: 2 days
```

**Calculations:**
```
Refund: ₹600 (fixed)
Penalty: 7 × ₹100 = ₹700
Net to Driver: ₹600 - ₹700 = -₹100 (driver owes)
```

**R/F Transactions:**
```
1. Refund: +₹600
2. Penalty: -₹700
Net R/F Balance: -₹100 (driver owes)
```

**Vehicle Transactions:**
```
Vehicle A (5/7 share):
- Refund Expense: -₹428.57
- Penalty Income: +₹500
- Net: +₹71.43 (vehicle profits)

Vehicle B (2/7 share):
- Refund Expense: -₹171.43
- Penalty Income: +₹200
- Net: +₹28.57 (vehicle profits)

Total Vehicles: +₹100 (matches driver's -₹100)
```

**Final Result:**
- Driver R/F Balance: -₹100 (red, driver owes)
- Vehicles profit: +₹100 total

## R/F Balance Display

### After Weekly Audit (Scenario 1: Balanced)

```
┌─────────────────────────────────────────┐
│      R/F Management                      │
├─────────────────────────────────────────┤
│ Current Balance: ₹0 ⚫                   │
│ No balance                               │
│                                          │
│ Recent Transactions:                     │
│ ⚠️ Penalty - ₹600                       │
│ "Weekly Audit - Missing Trips            │
│  Completed (13-19 Jan 2025,              │
│  6 working days, 58/60 trips)"           │
│ Just now                                 │
│                                          │
│ 💰 Refund + ₹600                        │
│ "Weekly Audit - Refund (13-19 Jan        │
│  2025, 58 trips completed,               │
│  6 working days)"                        │
│ Just now                                 │
└─────────────────────────────────────────┘
```

### After Weekly Audit (Scenario 2: Driver Gets ₹100)

```
┌─────────────────────────────────────────┐
│      R/F Management                      │
├─────────────────────────────────────────┤
│ Current Balance: ₹100 🟢                │
│ Refund balance                           │
│                                          │
│ Recent Transactions:                     │
│ ⚠️ Penalty - ₹500                       │
│ "Weekly Audit - Missing Trips..."        │
│                                          │
│ 💰 Refund + ₹600                        │
│ "Weekly Audit - Refund..."               │
└─────────────────────────────────────────┘
```

## Key Benefits

1. **Dual Tracking** - Both refund and penalty recorded separately
2. **Transparent Calculation** - Clear display of shortfall and amounts
3. **Proportional Distribution** - Fair split across vehicles based on usage
4. **Net Balance** - Shows final impact to driver immediately
5. **Vehicle Impact** - Appears in VehiclePerformance as both income and expense
6. **Audit Trail** - Transaction IDs link R/F to vehicle records
7. **Balanced Books** - Net driver balance = Net vehicle impact (opposite sign)

## Important Notes

- **Refund Amount:** Fixed at ₹600 (can be made configurable)
- **Penalty Amount:** Working Days × ₹100
- **Required Trips:** Working Days × 10
- **Working Days:** Count of approved reports only
- **Distribution:** Proportional to days each vehicle was used
- **Transaction Date:** Uses week start date (Monday) for consistency
- **Refund Type:** "expense" for vehicles (they pay out)
- **Penalty Type:** "income" for vehicles (they receive)

## Testing Scenarios

### Test 1: Balanced (Net ₹0)
```
Setup: 6 working days, 58 trips completed
Expected:
- Refund: +₹600
- Penalty: -₹600
- Net: ₹0
- R/F Balance: ₹0 (gray)
```

### Test 2: Driver Receives (Net +₹100)
```
Setup: 5 working days, 48 trips completed
Expected:
- Refund: +₹600
- Penalty: -₹500
- Net: +₹100
- R/F Balance: +₹100 (green)
```

### Test 3: Driver Owes (Net -₹100)
```
Setup: 7 working days, 68 trips completed
Expected:
- Refund: +₹600
- Penalty: -₹700
- Net: -₹100
- R/F Balance: -₹100 (red)
```

### Test 4: All Trips Complete (No Button)
```
Setup: 6 working days, 60+ trips completed
Expected:
- No audit button shown
- Normal financial summary displayed
```

### Test 5: Multi-Vehicle Distribution
```
Setup: 
- 6 working days, 58 trips
- Vehicle A: 4 days
- Vehicle B: 2 days

Expected:
- Vehicle A gets 66.67% of both transactions
- Vehicle B gets 33.33% of both transactions
- Total vehicle net = ₹0
```

## Summary

The Weekly Audit System:
1. ✅ Checks total trips vs required (working days × 10)
2. ✅ Shows audit button when shortfall detected
3. ✅ Adds TWO R/F transactions: Refund (+₹600) and Penalty (-₹X)
4. ✅ Distributes BOTH to vehicles proportionally
5. ✅ Refund = expense for vehicles, Penalty = income for vehicles
6. ✅ Net effect is balanced across driver and vehicles
7. ✅ Clear descriptions with week dates, trips, and working days
8. ✅ Appears in both R/F balance and VehiclePerformance page
