# Submit Report Page - Complete Context & Calculations

## Overview

This document provides a complete context for the Daily Report Submission page (`SubmitReport.tsx`), including all calculations, business logic, data structures, API integrations, and validation rules. This context can be used for building mobile apps, generating documentation, or understanding the complete system architecture.

---

## Table of Contents

1. [Page Purpose & Functionality](#page-purpose--functionality)
2. [Data Models & Interfaces](#data-models--interfaces)
3. [State Management](#state-management)
4. [Core Calculations](#core-calculations)
5. [Business Logic](#business-logic)
6. [API Integration](#api-integration)
7. [Validation Rules](#validation-rules)
8. [File Upload System](#file-upload-system)
9. [UI Components & Flow](#ui-components--flow)
10. [Error Handling](#error-handling)

---

## Page Purpose & Functionality

The Submit Report page allows drivers to submit their daily trip reports with the following capabilities:

- **Daily Report Submission**: Submit trip data, earnings, toll, cash collection
- **Automatic Calculations**: Platform fee, rent amount, payment due/refund
- **Deposit Collection**: Automatic deposit cutting based on report count
- **Penalty Management**: Daily penalty amount deduction
- **Service Day Tracking**: Mark reports as service/maintenance days
- **Photo Upload**: Upload Uber screenshot and payment receipt
- **Duplicate Prevention**: Prevent multiple reports for the same date

---

## Data Models & Interfaces

### Form Data Structure

```typescript
interface FormData {
  vehicle_number: string;
  total_trips: string; // Number of trips completed
  total_earnings: string; // Total earnings in ₹
  toll: string; // Toll amount in ₹
  total_cashcollect: string; // Cash collected from passengers
  rent_paid: string; // Calculated rent amount (auto-calculated)
  platform_fee: string; // Platform fee (auto-calculated)
  rent_date: string; // Date for which report is submitted (YYYY-MM-DD)
  remarks: string; // Optional remarks/notes
}
```

### User Data Structure

```typescript
interface UserData {
  id: string;
  name: string;
  vehicle_number: string | null;
  shift: "morning" | "night" | "24hr";
  total_earning: number; // Cumulative total earnings
  total_trip: number; // Cumulative total trips
  online: boolean; // Driver online status
  pending_balance: number; // Current deposit balance
  daily_penalty_amount: number; // Daily penalty to be deducted
  enable_deposit_collection: boolean; // Whether deposit collection is enabled
}
```

### Vehicle Data Structure

```typescript
interface VehicleData {
  vehicle_number: string;
  total_trips: number; // Cumulative trips for the vehicle
}
```

### Report Submission Structure

```typescript
interface FleetReport {
  user_id: string;
  driver_name: string;
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  shift: "morning" | "night" | "24hr";
  rent_date: string; // YYYY-MM-DD format
  toll: number;
  total_cashcollect: number;
  platform_fee: number;
  rent_paid_amount: number; // Can be positive (driver pays) or negative (refund)
  deposit_cutting_amount: number; // Deposit amount cut from this report
  is_service_day: boolean; // Service/maintenance day flag
  status: "pending_verification"; // Initial status
  remarks: string | null;
  uber_screenshot: string | null; // Storage path to screenshot
  payment_screenshot: string | null; // Storage path to payment receipt
  submission_date: string; // ISO timestamp
}
```

---

## State Management

### React State Variables

```typescript
// User & Authentication
const [user, isAuthenticated, loading] = useAuth();
const [userData, setUserData] = useState<UserData | null>(null);
const [currentEarnings, setCurrentEarnings] = useState<number>();
const [currentTrips, setCurrentTrips] = useState<number>();

// Form State
const [formData, setFormData] = useState<FormData>({
  /* ... */
});
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [isServiceDay, setIsServiceDay] = useState(false);

// File Upload
const [uberScreenshot, setUberScreenshot] = useState<File | null>(null);
const [rentScreenshot, setRentScreenshot] = useState<File | null>(null);

// Calculations & Display
const [paymentMessage, setPaymentMessage] = useState("");
const [depositCutting, setDepositCutting] = useState(0);
const [approvedReportsCount, setApprovedReportsCount] = useState(0);
const [enableDepositCollection, setEnableDepositCollection] = useState(true);

// UI State
const [submitting, setSubmitting] = useState(false);
const [showConfirmation, setShowConfirmation] = useState(false);
const [countdown, setCountdown] = useState(5);
const [existingReportForDate, setExistingReportForDate] = useState<any>(null);

// Vehicle Data
const [vehicleTrips, setVehicleTrips] = useState<number>(0);
```

### Admin Settings Hook

```typescript
const {
  calculateCompanyEarnings, // Function: (trips) => rent amount
  calculateCompanyEarnings24hr, // Function: (trips) => rent amount for 24hr shift
  companyEarningsSlabs, // Array of rent slabs for regular shifts
  companyEarningsSlabs24hr, // Array of rent slabs for 24hr shifts
  loading: settingsLoading, // Loading state
} = useAdminSettings();
```

---

## Core Calculations

### 1. Company Earnings (Rent) Calculation

**Function**: `calculateCompanyEarningsForShift(trips: number, shift: string)`

**Purpose**: Calculate the rent amount based on number of trips and shift type.

#### Regular Shift Slabs (Morning/Night)

```typescript
// Uses admin settings if available, otherwise falls back to hardcoded values
if (trips >= 12) return 535;
if (trips >= 11) return 585;
if (trips >= 10) return 635;
if (trips >= 8) return 715;
if (trips >= 5) return 745;
else return 795; // Default for trips < 5
```

#### 24-Hour Shift Slabs

```typescript
if (trips >= 24) return 1070;
if (trips >= 22) return 1170;
if (trips >= 20) return 1270;
if (trips >= 16) return 1430;
if (trips >= 10) return 1490;
else return 1590; // Default for trips < 10
```

**Formula**:

```
rent = calculateCompanyEarningsForShift(total_trips, shift)
```

**Example**:

- Morning shift, 10 trips → ₹635
- Night shift, 12 trips → ₹535
- 24hr shift, 20 trips → ₹1270

---

### 2. Platform Fee Calculation

**Function**: `calculatePlatformFee(totalEarnings: number)`

**Purpose**: Calculate platform fee based on total earnings (slab-based calculation).

**Calculation Logic**:

```typescript
if (totalEarnings <= 0) return 0;

// Slab-based calculation
if (totalEarnings <= 500) return 70;
if (totalEarnings <= 1000) return 140;
if (totalEarnings <= 1500) return 210;
if (totalEarnings <= 2000) return 280;
if (totalEarnings <= 2500) return 350;
if (totalEarnings <= 3000) return 420;
if (totalEarnings <= 3500) return 490;
if (totalEarnings <= 4000) return 560;
if (totalEarnings <= 4500) return 630;
if (totalEarnings <= 5000) return 700;

// For amounts above ₹5000, use 14% of total earnings
return Math.round(totalEarnings * 0.14);
```

**Platform Fee Slabs**:
| Total Earnings Range | Platform Fee |
|----------------------|--------------|
| ₹0 - ₹500 | ₹70 |
| ₹501 - ₹1000 | ₹140 |
| ₹1001 - ₹1500 | ₹210 |
| ₹1501 - ₹2000 | ₹280 |
| ₹2001 - ₹2500 | ₹350 |
| ₹2501 - ₹3000 | ₹420 |
| ₹3001 - ₹3500 | ₹490 |
| ₹3501 - ₹4000 | ₹560 |
| ₹4001 - ₹4500 | ₹630 |
| ₹4501 - ₹5000 | ₹700 |
| Above ₹5000 | 14% of total earnings |

**Auto-calculation**: Platform fee is automatically recalculated whenever `total_earnings` changes.

**Example**:

- ₹800 earnings → ₹140 platform fee
- ₹2500 earnings → ₹350 platform fee
- ₹6000 earnings → ₹840 platform fee (14% of 6000)

---

### 3. Deposit Cutting Calculation

**Purpose**: Automatically collect deposit from drivers starting from their 3rd report until they reach ₹2500 or submit 12 reports.

**Activation Conditions**:

1. Deposit collection must be enabled (`enable_deposit_collection === true`)
2. Driver must have submitted at least 2 valid reports (excluding leave status)
3. Current deposit balance must be less than ₹2500
4. Driver must have submitted fewer than 12 reports

**Calculation Formula**:

```typescript
// Step 1: Check if deposit cutting should be active
if (enableDepositCollection && approvedReportsCount >= 2) {
  const currentDeposit = userData.pending_balance || 0;
  const targetDeposit = 2500;

  // Stop if already reached target
  if (currentDeposit >= targetDeposit) {
    depositCutting = 0;
    return;
  }

  // Stop if 12+ reports submitted
  if (approvedReportsCount >= 12) {
    depositCutting = 0;
    return;
  }

  // Step 2: Calculate remaining deposit needed
  const remainingDeposit = targetDeposit - currentDeposit;

  // Step 3: Calculate remaining forms (reports 3-12 = 10 reports total)
  const formsAfterActivation = approvedReportsCount - 2;
  const remainingForms = Math.max(10 - formsAfterActivation, 1);

  // Step 4: Calculate daily cutting amount
  const dailyCutting = remainingDeposit / remainingForms;
  depositCutting = Math.round(dailyCutting);
}
```

**Example Scenario**:

- Report Count: 4 (after activation)
- Current Deposit: ₹500
- Remaining Deposit: ₹2500 - ₹500 = ₹2000
- Remaining Forms: 10 - (4 - 2) = 8 reports
- Daily Cutting: ₹2000 / 8 = ₹250

**Report Collection Timeline**:

- Reports 1-2: No deposit cutting
- Reports 3-12: Deposit cutting active (total 10 reports)
- Report 13+: No deposit cutting (target reached or max reports reached)

---

### 4. Rent Paid Amount Calculation

**Purpose**: Calculate the final amount driver needs to pay or receive as refund.

**Main Formula**:

```typescript
// Step 1: Calculate base rent
const rent = calculateCompanyEarningsForShift(total_trips, shift);

// Step 2: Calculate total income
const tollAndEarnings = toll + total_earnings;

// Step 3: Calculate total deductions
const totalRentWithExtras =
  rent + dailyPenaltyAmount + platformFee + depositCutting;

// Step 4: Calculate final amount
const amount = tollAndEarnings - total_cashcollect - totalRentWithExtras;
```

**Formula Breakdown**:

```
Total Income = Total Earnings + Toll Amount
Total Deductions = Rent + Daily Penalty + Platform Fee + Deposit Cutting
Amount = Total Income - Cash Collected - Total Deductions
```

**Result Interpretation**:

- `amount > 0`: Driver receives refund (company pays driver)
- `amount < 0`: Driver must pay (driver pays company)
- `amount === 0`: No payment required

**Storage Convention**:

```typescript
rent_paid_amount = amount > 0 ? -amount : Math.abs(amount);
```

- Positive values stored as negative (refund)
- Negative values stored as positive (payment due)

**Example Calculations**:

**Example 1: Driver Pays**

```
Trips: 10
Total Earnings: ₹2000
Toll: ₹100
Cash Collected: ₹1500
Shift: Morning
Daily Penalty: ₹50
Platform Fee: ₹280
Deposit Cutting: ₹250

Rent = ₹635 (for 10 trips, morning shift)
Total Income = ₹100 + ₹2000 = ₹2100
Total Deductions = ₹635 + ₹50 + ₹280 + ₹250 = ₹1215
Amount = ₹2100 - ₹1500 - ₹1215 = -₹615

Result: Driver pays ₹615
rent_paid_amount = ₹615 (stored as positive)
```

**Example 2: Driver Receives Refund**

```
Trips: 12
Total Earnings: ₹2500
Toll: ₹150
Cash Collected: ₹2000
Shift: Morning
Daily Penalty: ₹0
Platform Fee: ₹350
Deposit Cutting: ₹0

Rent = ₹535 (for 12 trips, morning shift)
Total Income = ₹150 + ₹2500 = ₹2650
Total Deductions = ₹535 + ₹0 + ₹350 + ₹0 = ₹885
Amount = ₹2650 - ₹2000 - ₹885 = -₹235

Result: Driver pays ₹235
```

**Example 3: Refund Case**

```
Trips: 8
Total Earnings: ₹3000
Toll: ₹200
Cash Collected: ₹3000
Shift: Morning
Daily Penalty: ₹0
Platform Fee: ₹420
Deposit Cutting: ₹0

Rent = ₹715 (for 8 trips, morning shift)
Total Income = ₹200 + ₹3000 = ₹3200
Total Deductions = ₹715 + ₹0 + ₹420 + ₹0 = ₹1135
Amount = ₹3200 - ₹3000 - ₹1135 = -₹935

Result: Driver receives ₹935 refund
rent_paid_amount = -₹935 (stored as negative)
```

---

### 5. User Totals Update

**Purpose**: Update cumulative user totals after report submission.

**Formulas**:

```typescript
newTotalEarnings = currentEarnings + total_earnings;
newTotalTrips = currentTrips + total_trips;
```

**Example**:

- Current Earnings: ₹50,000
- Current Trips: 500
- Report Earnings: ₹2000
- Report Trips: 10
- **New Totals**: Earnings: ₹52,000, Trips: 510

---

### 6. Vehicle Trips Update

**Purpose**: Update cumulative vehicle trip count after report submission.

**Formula**:

```typescript
newVehicleTrips = currentVehicleTrips + total_trips;
```

**Example**:

- Current Vehicle Trips: 1000
- Report Trips: 10
- **New Vehicle Trips**: 1010

---

## Business Logic

### 1. Authentication & Authorization

**Requirements**:

- User must be authenticated (`isAuthenticated === true`)
- User must be online (`online === true`)
- If not authenticated or offline, redirect to profile page

**Implementation**:

```typescript
// Redirect if not authenticated
if (!loading && !isAuthenticated) {
  alert("You need to be logged in to access this page.");
  navigate("/");
}

// Check online status during data fetch
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", user.id)
  .eq("online", true)
  .single();

if (error) {
  navigate("/profile");
  toast.error("You Are Offline");
  return;
}
```

---

### 2. Duplicate Report Prevention

**Rule**: Drivers cannot submit multiple reports for the same date.

**Implementation**:

```typescript
// Check for existing report before submission
const { data: existingReport, error: checkError } = await supabase
  .from("fleet_reports")
  .select("id, status, submission_date")
  .eq("user_id", userData.id)
  .eq("rent_date", selectedDate)
  .single();

if (existingReport) {
  toast.error(`A report for ${selectedDate} has already been submitted.`);
  return;
}
```

**Validation**: Check performed both on date selection and before form submission.

---

### 3. Vehicle Assignment Validation

**Rule**: Driver must have a vehicle assigned to submit reports.

**Implementation**:

```typescript
const vehicleNumber = userData.vehicle_number?.trim().toUpperCase();
if (!vehicleNumber) {
  toast.error("No vehicle assigned. Please contact admin.");
  return;
}
```

---

### 4. Service Day Flag

**Purpose**: Mark reports as service/maintenance days for tracking purposes.

**Logic**:

- Toggle switch in UI
- Stored as `is_service_day: boolean` in report
- Does not affect calculations
- Used for filtering and reporting

---

### 5. Payment Screenshot Requirement

**Rule**: Payment screenshot is only required if driver needs to pay (amount < 0).

**Implementation**:

```typescript
// Only upload payment screenshot if driver needs to pay
if (rentScreenshot && paymentMessage.includes("Pay")) {
  // Upload payment screenshot
}

// UI conditionally shows payment screenshot field
{
  paymentMessage.includes("Pay") && <PaymentScreenshotUpload />;
}
```

---

### 6. File Upload Validation

**Requirements**:

- Uber screenshot: **Required** (always)
- Payment screenshot: **Required** only if payment is due
- File types: Images only (`accept="image/*"`)

**Storage Path Format**:

```
uploads/{user_id}/reports/{timestamp}_{screenshot_type}.{extension}
```

**Example**:

```
uploads/abc123/reports/1698765432123_uber_screenshot.jpg
uploads/abc123/reports/1698765432789_payment_screenshot.png
```

---

## API Integration

### 1. Fetch User Data

**Endpoint**: `supabase.from("users").select("*")`

**Query**:

```typescript
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", user.id)
  .eq("online", true)
  .single();
```

**Returns**: User data including vehicle assignment, shift, totals, penalty, deposit settings.

---

### 2. Fetch Approved Reports Count

**Endpoint**: `supabase.from("fleet_reports").select("*", { count: "exact" })`

**Query**:

```typescript
const { count: validReportsCount, error: countError } = await supabase
  .from("fleet_reports")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .in("status", ["pending_verification", "approved", "rejected"]);
```

**Purpose**: Count valid reports for deposit cutting calculation (excludes leave status).

---

### 3. Fetch Vehicle Data

**Endpoint**: `supabase.from("vehicles").select("total_trips")`

**Query**:

```typescript
const { data: vehiclesData, error: vehiclesError } = await supabase
  .from("vehicles")
  .select("total_trips")
  .eq("vehicle_number", data.vehicle_number)
  .single();
```

**Purpose**: Get current vehicle trip count for updating after submission.

---

### 4. Check Existing Report

**Endpoint**: `supabase.from("fleet_reports").select("*")`

**Query**:

```typescript
const { data: existingReport, error } = await supabase
  .from("fleet_reports")
  .select("id, status, submission_date, total_trips, total_earnings")
  .eq("user_id", userData.id)
  .eq("rent_date", date)
  .single();
```

**Purpose**: Check if report already exists for selected date.

---

### 5. Upload Screenshots

**Storage Bucket**: `uploads`

**Upload Uber Screenshot**:

```typescript
const fileName = `${
  user?.id
}/reports/${Date.now()}_uber_screenshot.${extension}`;
const { data: uberData, error: uberError } = await supabase.storage
  .from("uploads")
  .upload(fileName, uberScreenshot);
```

**Upload Payment Screenshot**:

```typescript
const fileName = `${
  user?.id
}/reports/${Date.now()}_payment_screenshot.${extension}`;
const { data: rentData, error: rentError } = await supabase.storage
  .from("uploads")
  .upload(fileName, rentScreenshot);
```

---

### 6. Insert Fleet Report

**Endpoint**: `supabase.from("fleet_reports").insert([...])`

**Insert Data**:

```typescript
{
  user_id: userData.id,
  driver_name: userData.name,
  vehicle_number: vehicleNumber,
  total_trips: formData.total_trips,
  total_earnings: formData.total_earnings,
  shift: userData.shift || "morning",
  rent_date: selectedDate,  // YYYY-MM-DD format
  toll: formData.toll,
  total_cashcollect: formData.total_cashcollect,
  platform_fee: formData.platform_fee,
  rent_paid_amount: calculateRentPaidAmount(),  // Positive = pay, Negative = refund
  deposit_cutting_amount: depositCutting,
  is_service_day: isServiceDay,
  status: "pending_verification",
  remarks: formData.remarks,
  uber_screenshot: uberScreenshotUrl,
  payment_screenshot: rentScreenshotUrl,
  submission_date: formattedSubmissionDate,  // ISO timestamp
}
```

---

### 7. Update User Totals

**Endpoint**: `supabase.from("users").update({...})`

**Update Data**:

```typescript
{
  total_earning: newTotalEarnings,
  total_trip: newTotalTrips,
}
```

**Query**:

```typescript
const { error: userUpdateError } = await supabase
  .from("users")
  .update({ total_earning: newTotalEarnings, total_trip: newTotalTrips })
  .eq("id", userData.id);
```

---

### 8. Update Vehicle Trips

**Endpoint**: `supabase.from("vehicles").update({...})`

**Update Data**:

```typescript
{
  total_trips: newVehicleTrips,
}
```

**Query**:

```typescript
const { data: updateData, error: vehicleUpdateError } = await supabase
  .from("vehicles")
  .update({ total_trips: newVehicleTrips })
  .eq("vehicle_number", vehicleNumber)
  .select();
```

**Fallback**: If direct update fails, use RPC function:

```typescript
const { data: altUpdateData, error: altUpdateError } = await supabase.rpc(
  "update_vehicle_trips",
  {
    p_vehicle_number: vehicleNumber,
    p_new_trips: newVehicleTrips,
  }
);
```

---

## Validation Rules

### Form Field Validation

**Required Fields**:

- `total_trips`: Required, must be a number
- `total_earnings`: Required, must be a number
- `total_cashcollect`: Required, must be a number
- `rent_date`: Required, must be selected from calendar
- `uber_screenshot`: Required, must be an image file

**Conditional Fields**:

- `payment_screenshot`: Required only if `rent_paid_amount > 0` (driver must pay)

**Optional Fields**:

- `toll`: Optional, defaults to 0
- `remarks`: Optional, text field

**Auto-calculated Fields** (read-only):

- `platform_fee`: Auto-calculated from total earnings
- `rent_paid`: Auto-calculated from all inputs

---

### Business Rule Validation

1. **User must be online**: Checked before allowing submission
2. **Vehicle must be assigned**: Checked before submission
3. **No duplicate reports**: Checked for selected date
4. **Valid date selection**: Must select date from calendar
5. **Positive numbers**: All numeric inputs must be >= 0

---

## File Upload System

### File Types

- **Accepted**: Images only (`image/*`)
- **Common formats**: `.jpg`, `.jpeg`, `.png`, `.webp`

### File Naming Convention

```
{user_id}/reports/{timestamp}_{screenshot_type}.{extension}
```

**Example**:

```
abc123/reports/1698765432123_uber_screenshot.jpg
abc123/reports/1698765432789_payment_screenshot.png
```

### Upload Process

1. User selects file from device
2. File stored in component state (`uberScreenshot` / `rentScreenshot`)
3. On form submission, file uploaded to Supabase Storage
4. Storage path returned and saved in report record
5. File accessible via public URL: `https://{supabase_url}/storage/v1/object/public/uploads/{file_path}`

---

## UI Components & Flow

### Page Structure

1. **Header Section**

   - Page title: "Submit Daily Report"
   - Driver name (read-only)
   - Vehicle number (read-only, shows warning if not assigned)

2. **Date Selection**

   - Weekly calendar component
   - Shows existing reports warning if date already submitted
   - Requires date selection before form submission

3. **Form Fields**

   - Total Trips (required)
   - Total Earnings (required)
   - Toll (optional)
   - Total Cash Collected (required)
   - Platform Fee (auto-calculated, read-only)
   - Service Day Toggle
   - Remarks (optional)

4. **Information Cards**

   - Penalty Information (if daily penalty > 0)
   - Payment Message (refund/pay amount)

5. **File Upload Section**

   - Uber Screenshot (required)
   - Payment Screenshot (conditionally required)

6. **UPI Payment Info**

   - UPI ID display
   - Copy to clipboard button

7. **Action Buttons**

   - Cancel (navigate to profile)
   - Submit Report (disabled if duplicate or submitting)

8. **Confirmation Screen**
   - Success message
   - Countdown timer (5 seconds)
   - Auto-redirect to profile
   - Manual redirect button

---

### User Flow

1. **Page Load**

   - Check authentication → Redirect if not authenticated
   - Fetch user data → Check online status
   - Fetch approved reports count → For deposit calculation
   - Fetch vehicle data → For trip updates

2. **Date Selection**

   - User selects date from calendar
   - Check for existing report → Show warning if exists
   - Enable form fields

3. **Form Input**

   - User enters trips, earnings, toll, cash collected
   - Platform fee auto-calculates
   - Rent amount auto-calculates
   - Payment message updates dynamically

4. **File Upload**

   - User uploads Uber screenshot (required)
   - User uploads payment screenshot (if payment due)

5. **Submission**
   - Validate all fields
   - Check for duplicate report
   - Upload screenshots
   - Insert report record
   - Update user totals
   - Update vehicle trips
   - Show success message
   - Redirect to profile

---

## Error Handling

### Error Types & Handling

1. **Authentication Errors**

   - Not authenticated → Redirect to login
   - User offline → Redirect to profile with error message

2. **Validation Errors**

   - Missing required fields → Show toast error
   - Invalid date → Show toast error
   - Duplicate report → Show toast error, disable submit
   - No vehicle assigned → Show toast error, disable submit

3. **Upload Errors**

   - File upload fails → Show toast error, prevent submission
   - Invalid file type → Browser validation, show error

4. **Database Errors**

   - Report insert fails → Show toast error, allow retry
   - User update fails → Log error, show toast
   - Vehicle update fails → Try RPC fallback, show error if both fail

5. **Network Errors**
   - API timeout → Show error message, allow retry
   - Connection lost → Show error message

---

## Date & Time Handling

### Date Format

**Rent Date**: `YYYY-MM-DD` format (e.g., "2024-01-15")

**Submission Date**: ISO timestamp format

**IST Conversion**:

```typescript
const getISTISOString = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 19).replace("T", " ");
};

const submissionDateIST = new Date().toLocaleString("en-US", {
  timeZone: "Asia/Kolkata",
});

const formattedSubmissionDate = new Date(submissionDateIST).toISOString();
```

---

## Complete Calculation Flow

### Step-by-Step Calculation Process

**Input Variables**:

- `total_trips`: Number of trips
- `total_earnings`: Total earnings in ₹
- `toll`: Toll amount in ₹
- `total_cashcollect`: Cash collected in ₹
- `shift`: Driver shift ("morning", "night", "24hr")
- `daily_penalty_amount`: Daily penalty from user data
- `approvedReportsCount`: Number of approved reports
- `pending_balance`: Current deposit balance
- `enable_deposit_collection`: Deposit collection enabled flag

**Calculation Steps**:

1. **Calculate Rent**:

   ```
   rent = calculateCompanyEarningsForShift(total_trips, shift)
   ```

2. **Calculate Platform Fee**:

   ```
   platform_fee = calculatePlatformFee(total_earnings)
   ```

3. **Calculate Deposit Cutting**:

   ```
   if (enableDepositCollection && approvedReportsCount >= 2 && pending_balance < 2500 && approvedReportsCount < 12):
     remainingDeposit = 2500 - pending_balance
     formsAfterActivation = approvedReportsCount - 2
     remainingForms = max(10 - formsAfterActivation, 1)
     depositCutting = round(remainingDeposit / remainingForms)
   else:
     depositCutting = 0
   ```

4. **Calculate Total Income**:

   ```
   totalIncome = total_earnings + toll
   ```

5. **Calculate Total Deductions**:

   ```
   totalDeductions = rent + daily_penalty_amount + platform_fee + depositCutting
   ```

6. **Calculate Final Amount**:

   ```
   amount = totalIncome - total_cashcollect - totalDeductions
   ```

7. **Determine Payment Message**:
   ```
   if (amount > 0):
     message = "Refund ₹" + abs(amount)
     rent_paid_amount = -amount  // Stored as negative for refunds
   else if (amount < 0):
     message = "Pay ₹" + abs(amount)
     rent_paid_amount = abs(amount)  // Stored as positive for payments
   else:
     message = "No payment required"
     rent_paid_amount = 0
   ```

---

## Real-time Updates

### Auto-calculation Triggers

1. **Platform Fee**: Recalculates when `total_earnings` changes
2. **Rent Amount**: Recalculates when `total_trips` or `shift` changes
3. **Deposit Cutting**: Recalculates when `approvedReportsCount` or `pending_balance` changes
4. **Payment Message**: Recalculates when any input field changes

---

## Summary Formulas

### Quick Reference

**Rent Calculation**:

```
rent = f(trips, shift)
```

**Platform Fee**:

```
platform_fee = f(total_earnings)  // Slab-based or 14% above ₹5000
```

**Deposit Cutting**:

```
depositCutting = (2500 - pending_balance) / remainingForms
```

**Final Amount**:

```
amount = (total_earnings + toll) - total_cashcollect - (rent + penalty + platform_fee + depositCutting)
```

**User Totals Update**:

```
newTotalEarnings = currentEarnings + total_earnings
newTotalTrips = currentTrips + total_trips
```

**Vehicle Totals Update**:

```
newVehicleTrips = currentVehicleTrips + total_trips
```

---

## Notes & Considerations

1. **Shift Default**: If shift is not "morning" or "night", defaults to "morning" for rent calculation
2. **Rent Storage**: Positive `rent_paid_amount` = driver pays, Negative = driver receives refund
3. **Deposit Timeline**: Deposit cutting starts from 3rd report and continues until 12th report or ₹2500 reached
4. **Service Day**: Does not affect calculations, only for tracking purposes
5. **File Upload**: Payment screenshot only required if driver needs to pay
6. **Date Validation**: Prevents duplicate reports for same date
7. **Vehicle Validation**: Requires vehicle assignment before submission
8. **Online Status**: User must be online to submit reports

---

## End of Context File

This context file provides complete documentation of all calculations, business logic, and API integrations for the Submit Report page. Use this as a reference for building mobile apps, generating documentation, or understanding the complete system architecture.


