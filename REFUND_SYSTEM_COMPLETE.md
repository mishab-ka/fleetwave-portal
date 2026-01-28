# Complete Refund System - Target Achievement & Shortfall

## Overview
Two separate refund systems based on driver performance:
1. **Target Achievement Refund** - When driver meets/exceeds required trips
2. **Weekly Audit** - When driver doesn't meet required trips (Refund + Penalty)

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Driver Performance Check                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Calculate:                                                   │
│  - Working Days = Count of approved reports                   │
│  - Required Trips = Working Days × 10                         │
│  - Completed Trips = Sum of all trip counts                   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  IF Completed >= Required                              │  │
│  │  ↓                                                      │  │
│  │  Show: "Target Achieved - Refund" Button (GREEN)       │  │
│  │  Action: Add Refund Only (Working Days × ₹100)         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  IF Completed < Required                               │  │
│  │  ↓                                                      │  │
│  │  Show: "Weekly Audit - Shortfall" Button (ORANGE)      │  │
│  │  Action: Add Refund + Penalty (both = Working Days×₹100)│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Scenario 1: Target Achievement (Green Button)

### Trigger Condition
```
IF totalTrips >= requiredTrips AND workingDays > 0:
  Show "Target Achieved - Refund Available" button
```

### Calculation
```
Refund Amount = Working Days × ₹100
No Penalty
```

### Examples

**Example 1: 4 Working Days, 42 Trips**
```
Working Days: 4
Required Trips: 4 × 10 = 40 trips
Completed Trips: 42 trips
Excess: +2 trips

Refund: 4 × ₹100 = ₹400
Net to Driver: +₹400 (driver receives)
```

**Example 2: 6 Working Days, 60 Trips (Exact)**
```
Working Days: 6
Required Trips: 6 × 10 = 60 trips
Completed Trips: 60 trips
Excess: 0 trips (exactly met)

Refund: 6 × ₹100 = ₹600
Net to Driver: +₹600 (driver receives)
```

**Example 3: 5 Working Days, 58 Trips**
```
Working Days: 5
Required Trips: 5 × 10 = 50 trips
Completed Trips: 58 trips
Excess: +8 trips

Refund: 5 × ₹100 = ₹500
Net to Driver: +₹500 (driver receives)
```

### Visual Display (Green Box)

```
┌───────────────────────────────────────────────┐
│ ✓ Target Achieved - Refund Available         │
├───────────────────────────────────────────────┤
│ Working Days:           4 days                │
│ Required Trips:         40 trips              │
│ Completed Trips:        42 trips (GREEN)      │
│ Excess:                +2 trips (GREEN)       │
│                                                │
│ Refund to be added:                            │
│ • Refund Amount:        +₹400 (GREEN)        │
│   (₹100 × 4 working days)                     │
│                                                │
│         [🎁 Add Refund]                        │
│            ₹400                                │
└───────────────────────────────────────────────┘
```

### Transaction Created

**R/F Transaction:**
```typescript
{
  user_id: "driver-uuid",
  amount: 400,
  type: "refund",
  description: "Target Achieved - Refund (13-19 Jan 2025, 42 trips completed, 4 working days, 2 excess trips)",
  created_by: "admin-uuid"
}
```

**Vehicle Transactions (Expense):**
```typescript
// If driver used 2 vehicles:
// Vehicle A: 3 days
// Vehicle B: 1 day

[
  {
    vehicle_number: "KA-01-AB-1234",
    transaction_type: "expense",
    amount: 300, // (3/4) × ₹400
    description: "Driver Refund: Rajesh - Target Achieved (3 days) [REFUND_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  },
  {
    vehicle_number: "KA-01-CD-5678",
    transaction_type: "expense",
    amount: 100, // (1/4) × ₹400
    description: "Driver Refund: Rajesh - Target Achieved (1 day) [REFUND_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  }
]
```

**Effect:**
- Driver R/F Balance: +₹400 (green, refund balance)
- Vehicle A: -₹300 expense (pays out to driver)
- Vehicle B: -₹100 expense (pays out to driver)

## Scenario 2: Weekly Audit - Shortfall (Orange Button)

### Trigger Condition
```
IF totalTrips < requiredTrips AND workingDays > 0:
  Show "Weekly Audit - Trips Shortfall" button
```

### Calculation
```
Refund Amount = Working Days × ₹100
Penalty Amount = Working Days × ₹100
Net to Driver = Refund - Penalty = ₹0
```

### Examples

**Example 1: 6 Working Days, 58 Trips**
```
Working Days: 6
Required Trips: 6 × 10 = 60 trips
Completed Trips: 58 trips
Shortfall: -2 trips

Refund: 6 × ₹100 = ₹600
Penalty: 6 × ₹100 = ₹600
Net to Driver: ₹0 (balanced)
```

**Example 2: 4 Working Days, 38 Trips**
```
Working Days: 4
Required Trips: 4 × 10 = 40 trips
Completed Trips: 38 trips
Shortfall: -2 trips

Refund: 4 × ₹100 = ₹400
Penalty: 4 × ₹100 = ₹400
Net to Driver: ₹0 (balanced)
```

### Visual Display (Orange Box)

```
┌───────────────────────────────────────────────┐
│ ⚠️ Weekly Audit - Trips Shortfall            │
├───────────────────────────────────────────────┤
│ Working Days:           6 days                │
│ Required Trips:         60 trips              │
│ Completed Trips:        58 trips              │
│ Shortfall:             -2 trips (RED)         │
│                                                │
│ 2 day(s) with <10 trips:                      │
│ Dec 15: 8 trips                                │
│ Dec 17: 9 trips                                │
│                                                │
│ Transactions to be added:                      │
│ • Refund to Driver:     +₹600 (GREEN)        │
│ • Penalty from Driver:  -₹600 (RED)          │
│ Net to Driver:          ₹0                    │
│                                                │
│   [⚠️ Process Weekly Audit]                   │
│    Refund: +₹600                              │
│    Penalty: -₹600                             │
└───────────────────────────────────────────────┘
```

### Transactions Created

**R/F Transactions:**
```typescript
[
  {
    user_id: "driver-uuid",
    amount: 600,
    type: "refund",
    description: "Weekly Audit - Refund (13-19 Jan 2025, 58 trips completed, 6 working days)",
    created_by: "admin-uuid"
  },
  {
    user_id: "driver-uuid",
    amount: 600,
    type: "penalty",
    description: "Weekly Audit - Missing Trips Completed (13-19 Jan 2025, 6 working days, 58/60 trips)",
    created_by: "admin-uuid"
  }
]
```

**Vehicle Transactions:**
```typescript
// If driver used 2 vehicles:
// Vehicle A: 4 days
// Vehicle B: 2 days

[
  // Refund transactions (expense for vehicles)
  {
    vehicle_number: "KA-01-AB-1234",
    transaction_type: "expense",
    amount: 400, // (4/6) × ₹600
    description: "Driver Refund: Rajesh - Weekly Audit Refund (4 days) [REFUND_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  },
  {
    vehicle_number: "KA-01-CD-5678",
    transaction_type: "expense",
    amount: 200, // (2/6) × ₹600
    description: "Driver Refund: Rajesh - Weekly Audit Refund (2 days) [REFUND_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  },
  // Penalty transactions (income for vehicles)
  {
    vehicle_number: "KA-01-AB-1234",
    transaction_type: "income",
    amount: 400, // (4/6) × ₹600
    description: "Driver Penalty: Rajesh - Missing Trips Penalty (4 days) [PENALTY_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  },
  {
    vehicle_number: "KA-01-CD-5678",
    transaction_type: "income",
    amount: 200, // (2/6) × ₹600
    description: "Driver Penalty: Rajesh - Missing Trips Penalty (2 days) [PENALTY_TX_ID:uuid]",
    transaction_date: "2025-01-13",
    created_by: "admin-uuid"
  }
]
```

**Effect:**
- Driver R/F Balance: ₹0 (balanced, +₹600 - ₹600)
- Vehicle A: ₹0 (balanced, -₹400 + ₹400)
- Vehicle B: ₹0 (balanced, -₹200 + ₹200)

## Comparison Table

| Aspect | Target Achievement | Weekly Audit |
|--------|-------------------|--------------|
| **Condition** | Trips >= Required | Trips < Required |
| **Button Color** | Green | Orange |
| **Refund Amount** | Working Days × ₹100 | Working Days × ₹100 |
| **Penalty Amount** | None | Working Days × ₹100 |
| **Net to Driver** | Positive (receives money) | ₹0 (balanced) |
| **R/F Transactions** | 1 (refund only) | 2 (refund + penalty) |
| **Vehicle Impact** | Negative (pays out) | ₹0 (balanced) |
| **Description** | "Target Achieved - Refund..." | "Weekly Audit - Refund..." & "Weekly Audit - Missing Trips..." |

## Button Behavior Logic

```typescript
// Calculate metrics
const workingDays = approvedReports.length;
const totalTrips = sum of all trips;
const requiredTrips = workingDays * 10;

// Determine which button to show
if (totalTrips >= requiredTrips && workingDays > 0) {
  // Case 1: Show GREEN "Target Achieved" button
  const refundAmount = workingDays * 100;
  // Add refund only, no penalty
  
} else if (totalTrips < requiredTrips && workingDays > 0) {
  // Case 2: Show ORANGE "Weekly Audit" button
  const refundAmount = workingDays * 100;
  const penaltyAmount = workingDays * 100;
  // Add both refund and penalty
  
} else {
  // No button (no working days)
}
```

## R/F Balance Display

### After Target Achievement Refund (Green)
```
┌─────────────────────────────────────────┐
│      R/F Management                      │
├─────────────────────────────────────────┤
│ Current Balance: ₹400 🟢                │
│ Refund balance                           │
│                                          │
│ Recent Transactions:                     │
│ 💰 Refund + ₹400                        │
│ "Target Achieved - Refund                │
│  (13-19 Jan 2025, 42 trips completed,   │
│  4 working days, 2 excess trips)"        │
│ Just now                                 │
└─────────────────────────────────────────┘
```

### After Weekly Audit (Orange - Balanced)
```
┌─────────────────────────────────────────┐
│      R/F Management                      │
├─────────────────────────────────────────┤
│ Current Balance: ₹0 ⚫                   │
│ No balance                               │
│                                          │
│ Recent Transactions:                     │
│ ⚠️ Penalty - ₹600                       │
│ "Weekly Audit - Missing Trips..."        │
│ Just now                                 │
│                                          │
│ 💰 Refund + ₹600                        │
│ "Weekly Audit - Refund..."               │
│ Just now                                 │
└─────────────────────────────────────────┘
```

## VehiclePerformance Display

### After Target Achievement (Vehicle A)
```
Vehicle: KA-01-AB-1234
Date: 13-19 Jan 2025

Income:
  Rent: ₹2,100 (3 days × ₹700)
  Total Income: ₹2,100

Expenses:
  Refund Expense: -₹300 ← Target achievement refund
  Other Expenses: ₹500
  Total Expenses: ₹800

Net Profit: ₹1,300
```

### After Weekly Audit (Vehicle A)
```
Vehicle: KA-01-AB-1234
Date: 13-19 Jan 2025

Income:
  Rent: ₹2,800 (4 days × ₹700)
  Penalty Income: +₹400 ← From weekly audit
  Total Income: ₹3,200

Expenses:
  Refund Expense: -₹400 ← From weekly audit
  Other Expenses: ₹500
  Total Expenses: ₹900

Net Profit: ₹2,300
```

## Testing Scenarios

### Test 1: Target Achievement (4 days, 42 trips)
```
Setup: 4 working days, 42 trips completed
Expected:
- Show GREEN button
- Refund: +₹400
- No penalty
- Driver receives: +₹400
- Vehicles pay: -₹400 total
```

### Test 2: Exact Target (6 days, 60 trips)
```
Setup: 6 working days, 60 trips completed (exact)
Expected:
- Show GREEN button
- Refund: +₹600
- No penalty
- Driver receives: +₹600
```

### Test 3: Weekly Audit (6 days, 58 trips)
```
Setup: 6 working days, 58 trips completed
Expected:
- Show ORANGE button
- Refund: +₹600
- Penalty: -₹600
- Net to driver: ₹0
- Net to vehicles: ₹0
```

### Test 4: Weekly Audit (4 days, 38 trips)
```
Setup: 4 working days, 38 trips completed
Expected:
- Show ORANGE button
- Refund: +₹400
- Penalty: -₹400
- Net to driver: ₹0
```

### Test 5: No Button
```
Setup: 0 working days (no approved reports)
Expected:
- No button shown
- Normal financial summary only
```

## Key Benefits

1. **Incentive System** - Rewards drivers who meet/exceed targets
2. **Fair Calculation** - Both scenarios based on working days
3. **Clear Differentiation** - Green for achievement, Orange for audit
4. **Balanced Books** - Weekly audit always nets to ₹0
5. **Separate Tracking** - Two distinct transaction types in R/F
6. **Vehicle Proportional** - Fair distribution based on usage
7. **Transparent** - Shows excess trips or shortfall clearly

## Important Notes

- **Refund Rate:** ₹100 per working day (both scenarios)
- **Penalty Rate:** ₹100 per working day (audit only)
- **Required Trips:** Working Days × 10
- **Working Days:** Count of approved reports only
- **Target Achievement:** Driver receives money, vehicles pay out
- **Weekly Audit:** Balanced (₹0 net for both driver and vehicles)
- **Transaction Date:** Uses week start date (Monday) for consistency

## Summary

The system now has TWO separate buttons:

1. **🟢 Green "Target Achieved" Button**
   - Shows when: Trips >= Required
   - Action: Add refund only
   - Result: Driver receives money (positive R/F balance)
   - Amount: Working Days × ₹100

2. **🟠 Orange "Weekly Audit" Button**
   - Shows when: Trips < Required
   - Action: Add refund + penalty
   - Result: Balanced (₹0 net)
   - Amount: Both = Working Days × ₹100

Both systems:
- ✅ Calculate based on working days
- ✅ Distribute proportionally to vehicles
- ✅ Show in R/F balance
- ✅ Appear in VehiclePerformance
- ✅ Include clear descriptions with dates and trips
