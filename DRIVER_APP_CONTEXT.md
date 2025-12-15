# Driver App Context - FleetWave Portal

## Overview

This document provides comprehensive context for building a native mobile app for drivers in the FleetWave Portal system. It includes all data structures, API endpoints, business logic, and user flows that drivers interact with.

## Table of Contents

1. [Authentication & User Management](#authentication--user-management)
2. [Driver Data Models](#driver-data-models)
3. [Report Submission System](#report-submission-system)
4. [Payment & Financial System](#payment--financial-system)
5. [Accommodation Management](#accommodation-management)
6. [Leave Management](#leave-management)
7. [Document Management](#document-management)
8. [API Endpoints](#api-endpoints)
9. [Business Logic & Calculations](#business-logic--calculations)
10. [UI Components & Navigation](#ui-components--navigation)
11. [Real-time Features](#real-time-features)
12. [File Upload & Storage](#file-upload--storage)

---

## Authentication & User Management

### Authentication Context

```typescript
interface AuthContext {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}
```

### User Data Model

```typescript
interface Driver {
  id: string;
  email: string;
  name: string;
  phone_number: string;
  vehicle_number: string | null;
  shift: "morning" | "night" | "24hr";
  online: boolean;
  total_earning: number;
  total_trip: number;
  pending_balance: number;
  daily_penalty_amount: number;
  enable_deposit_collection: boolean;
  resigning_date?: string;
  resignation_reason?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
}
```

### Authentication Flow

1. **Login**: Email/password authentication via Supabase Auth
2. **Session Management**: Automatic session refresh and persistence
3. **Logout**: Clean session termination
4. **Offline Check**: Drivers must be marked as "online" to submit reports

---

## Driver Data Models

### Fleet Report Model

```typescript
interface FleetReport {
  id: string;
  user_id: string;
  driver_name: string;
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  toll: number;
  total_cashcollect: number;
  platform_fee: number;
  net_fare: number;
  rent_paid_amount: number;
  deposit_cutting_amount: number;
  rent_date: string;
  shift: string;
  uber_screenshot: string | null;
  payment_screenshot: string | null;
  status: "pending_verification" | "approved" | "rejected" | "leave";
  remarks: string | null;
  is_service_day: boolean;
  submission_date: string;
  created_at: string;
  updated_at: string;
}
```

### Vehicle Model

```typescript
interface Vehicle {
  id: string;
  vehicle_number: string;
  total_trips: number;
  online: boolean;
  created_at: string;
  updated_at: string;
}
```

### Payment History Model

```typescript
interface PaymentTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "deposit" | "refund" | "due" | "penalty";
  description: string;
  created_by: string;
  created_at: string;
}
```

### Document Model

```typescript
interface Document {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  status: "pending" | "approved" | "rejected";
}
```

---

## Report Submission System

### Report Submission Flow

1. **Date Selection**: Driver selects rent date using weekly calendar
2. **Form Validation**: Check for existing reports for the same date
3. **Data Entry**: Driver enters trip and earnings data
4. **File Upload**: Upload Uber screenshot (required) and payment screenshot (if payment needed)
5. **Calculation**: System calculates rent, penalties, and deposit cutting
6. **Submission**: Report saved to database with pending status

### Report Form Fields

```typescript
interface ReportFormData {
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  toll: number;
  total_cashcollect: number;
  platform_fee: number; // Auto-calculated
  net_fare: number;
  rent_date: string;
  remarks: string;
  is_service_day: boolean;
}
```

### Report Validation Rules

- **Unique Date**: Only one report per driver per date
- **Vehicle Assignment**: Driver must have assigned vehicle
- **Online Status**: Driver must be marked as online
- **Required Fields**: Total trips, earnings, cash collected
- **File Requirements**: Uber screenshot always required

### Service Day Feature

- **Toggle**: Driver can mark report as service day
- **Purpose**: Tracks vehicle maintenance/servicing days
- **Visual Indicator**: Shows ⚙️ icon in admin reports

---

## Payment & Financial System

### Rent Calculation Logic

```typescript
// Company earnings calculation based on trips and shift
const calculateCompanyEarnings = (trips: number, shift: string) => {
  // Morning/Night shift slabs
  if (trips >= 12) return 535;
  if (trips >= 11) return 585;
  if (trips >= 10) return 635;
  if (trips >= 8) return 715;
  if (trips >= 5) return 745;
  return 795;

  // 24hr shift slabs
  if (shift === "24hr") {
    if (trips >= 24) return 1070;
    if (trips >= 22) return 1170;
    if (trips >= 20) return 1270;
    if (trips >= 16) return 1430;
    if (trips >= 10) return 1490;
    return 1590;
  }
};
```

### Platform Fee Calculation

```typescript
const calculatePlatformFee = (netFare: number): number => {
  if (netFare <= 0) return 0;

  // Fixed slabs up to ₹5000
  if (netFare <= 500) return 70;
  if (netFare <= 1000) return 140;
  if (netFare <= 1500) return 210;
  if (netFare <= 2000) return 280;
  if (netFare <= 2500) return 350;
  if (netFare <= 3000) return 420;
  if (netFare <= 3500) return 490;
  if (netFare <= 4000) return 560;
  if (netFare <= 4500) return 630;
  if (netFare <= 5000) return 700;

  // 14% of net fare above ₹5000
  return Math.round(netFare * 0.14);
};
```

### Rent Paid Amount Calculation

```typescript
const calculateRentPaidAmount = (report: ReportFormData, driver: Driver) => {
  const earnings = report.total_earnings;
  const toll = report.toll;
  const cash = report.total_cashcollect;
  const platformFee = report.platform_fee;
  const trips = report.total_trips;
  const depositCutting = calculateDepositCutting(driver);
  const rent = calculateCompanyEarnings(trips, driver.shift);
  const dailyPenalty = driver.daily_penalty_amount || 0;

  const amount =
    earnings + toll - cash - rent - platformFee - depositCutting - dailyPenalty;

  // Return positive for refund, negative for payment
  return amount > 0 ? -amount : Math.abs(amount);
};
```

### Deposit Collection System

```typescript
const calculateDepositCutting = (
  driver: Driver,
  approvedReportsCount: number
) => {
  if (!driver.enable_deposit_collection || approvedReportsCount < 2) return 0;

  const currentDeposit = driver.pending_balance || 0;
  const targetDeposit = 2500;

  // Stop if target reached or 12+ reports submitted
  if (currentDeposit >= targetDeposit || approvedReportsCount >= 12) return 0;

  const remainingDeposit = targetDeposit - currentDeposit;
  const formsAfterActivation = approvedReportsCount - 2;
  const remainingForms = Math.max(10 - formsAfterActivation, 1);

  return Math.round(remainingDeposit / remainingForms);
};
```

### Payment Message Display

```typescript
const getPaymentMessage = (amount: number) => {
  if (amount > 0) return `Refund ₹${Math.abs(amount).toFixed(2)}`;
  if (amount < 0) return `Pay ₹${Math.abs(amount).toFixed(2)}`;
  return "No payment required";
};
```

---

## Accommodation Management

### Room & Bed System

```typescript
interface Room {
  id: string;
  room_number: number;
  room_name: string;
  total_beds: number;
  status: "active" | "maintenance" | "inactive";
}

interface Bed {
  id: string;
  room_id: string;
  bed_number: number;
  bed_name: string;
  status: "available" | "occupied" | "maintenance";
  daily_rent: number; // ₹100 per day
}

interface BedAssignment {
  id: string;
  bed_id: string;
  user_id: string;
  shift: "morning" | "night";
  assigned_date: string;
  end_date?: string;
  status: "active" | "ended" | "transferred";
}
```

### Accommodation Features

- **6 Rooms, 30 Beds**: Visual room layout
- **Shift-based Assignment**: Morning/night shift drivers
- **Daily Rent**: ₹100 per day per driver
- **Real-time Status**: Live occupancy tracking
- **Monthly Calculation**: Based on submitted reports

---

## Leave Management

### Leave Application Model

```typescript
interface LeaveApplication {
  id: string;
  user_id: string;
  leave_type: "sick" | "personal" | "emergency" | "resignation";
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}
```

### Leave Types

- **Sick Leave**: Medical emergencies
- **Personal Leave**: Personal matters
- **Emergency Leave**: Urgent situations
- **Resignation**: Driver quitting

---

## Document Management

### Document Types

- **Aadhar Card**: Identity verification
- **Driving License**: License verification
- **PAN Card**: Tax identification
- **Bank Details**: Payment information
- **Vehicle Documents**: Registration, insurance

### Document Upload Flow

1. **File Selection**: Choose document type
2. **File Upload**: Upload to Supabase Storage
3. **Status Tracking**: Pending → Approved/Rejected
4. **Admin Review**: Admin can approve/reject documents

---

## API Endpoints

### Authentication Endpoints

```typescript
// Supabase Auth endpoints
POST / auth / v1 / signup;
POST / auth / v1 / signin;
POST / auth / v1 / signout;
GET / auth / v1 / user;
POST / auth / v1 / recover;
```

### Driver Data Endpoints

```typescript
// Get driver profile
GET /rest/v1/users?select=*&id=eq.{user_id}

// Update driver profile
PATCH /rest/v1/users?id=eq.{user_id}

// Get driver's reports
GET /rest/v1/fleet_reports?user_id=eq.{user_id}&order=submission_date.desc

// Submit new report
POST /rest/v1/fleet_reports
```

### File Upload Endpoints

```typescript
// Upload file to storage
POST / storage / v1 / object / uploads / { file_path };

// Get file URL
GET / storage / v1 / object / public / uploads / { file_path };
```

### Payment Endpoints

```typescript
// Get payment history
GET /rest/v1/driver_penalty_transactions?user_id=eq.{user_id}

// Get deposit transactions
GET /rest/v1/driver_balance_transactions?user_id=eq.{user_id}
```

---

## Business Logic & Calculations

### Daily Report Validation

1. **Date Check**: Ensure no duplicate reports for same date
2. **Vehicle Check**: Verify driver has assigned vehicle
3. **Online Check**: Driver must be online to submit
4. **Data Validation**: All required fields must be filled

### Automatic Calculations

1. **Platform Fee**: Auto-calculated based on net fare
2. **Rent Amount**: Calculated using trip-based slabs
3. **Deposit Cutting**: Automatic based on report count
4. **Penalty Application**: Daily penalty if applicable

### Report Status Flow

```
pending_verification → approved/rejected/leave
```

### Vehicle Trip Updates

- **Automatic Update**: Vehicle total_trips incremented on report submission
- **Rollback**: Trip count decreased if report deleted

---

## UI Components & Navigation

### Main Navigation Structure

```
Profile Page
├── Profile Tab
│   ├── Personal Information
│   ├── Vehicle Assignment
│   ├── Shift Information
│   └── Account Details
├── Documents Tab
│   ├── Document Upload
│   ├── Document Status
│   └── Document History
└── Payment History Tab
    ├── Transaction List
    ├── Deposit Balance
    └── Penalty History
```

### Key UI Components

- **Weekly Calendar**: Date selection for reports
- **File Upload**: Screenshot upload with preview
- **Form Validation**: Real-time validation feedback
- **Payment Display**: Clear payment/refund messaging
- **Status Indicators**: Visual status for reports/documents

### Mobile-First Design Considerations

- **Touch-friendly**: Large buttons and inputs
- **Offline Support**: Cache critical data
- **Image Optimization**: Compress uploads
- **Responsive Layout**: Adapt to different screen sizes

---

## Real-time Features

### Supabase Realtime Subscriptions

```typescript
// Listen to report status changes
const subscription = supabase
  .channel("reports")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "fleet_reports",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Update report status in UI
    }
  )
  .subscribe();
```

### Real-time Updates

- **Report Status**: Live updates when admin approves/rejects
- **Payment Updates**: Real-time balance changes
- **Document Status**: Live document approval status

---

## File Upload & Storage

### Storage Structure

```
uploads/
├── {user_id}/
│   ├── reports/
│   │   ├── {timestamp}_uber_screenshot.{ext}
│   │   └── {timestamp}_payment_screenshot.{ext}
│   └── documents/
│       ├── aadhar.{ext}
│       ├── license.{ext}
│       └── pan.{ext}
```

### File Upload Process

1. **File Selection**: User selects file from device
2. **Validation**: Check file type and size
3. **Upload**: Upload to Supabase Storage
4. **URL Generation**: Generate public URL
5. **Database Update**: Save file path to database

### Supported File Types

- **Images**: JPG, PNG, WebP
- **Documents**: PDF
- **Max Size**: 10MB per file

---

## Key Features for Mobile App

### Core Functionality

1. **Daily Report Submission**

   - Date selection with calendar
   - Form data entry
   - File upload (Uber screenshot)
   - Real-time calculations
   - Submission confirmation

2. **Profile Management**

   - View personal information
   - Update contact details
   - View vehicle assignment
   - Check shift information

3. **Payment Tracking**

   - View payment history
   - Check deposit balance
   - Track penalty amounts
   - Payment status updates

4. **Document Management**

   - Upload required documents
   - Track approval status
   - View document history

5. **Leave Management**
   - Apply for leave
   - Track leave status
   - View leave history

### Offline Capabilities

- **Data Caching**: Cache user profile and recent reports
- **Offline Forms**: Allow form completion offline
- **Sync on Connect**: Upload when connection restored

### Push Notifications

- **Report Status**: Notify when report approved/rejected
- **Payment Updates**: Notify about balance changes
- **Document Status**: Notify about document approval
- **System Alerts**: Important announcements

### Security Considerations

- **Authentication**: Secure login with Supabase Auth
- **Data Encryption**: All data encrypted in transit
- **File Security**: Secure file upload and storage
- **Session Management**: Automatic session refresh

---

## Database Schema Summary

### Core Tables

- **users**: Driver information and authentication
- **fleet_reports**: Daily trip reports
- **vehicles**: Vehicle information and trip counts
- **driver_penalty_transactions**: Payment and penalty records
- **driver_balance_transactions**: Deposit transactions
- **documents**: Document uploads and status
- **leave_applications**: Leave requests and approvals
- **rooms/beds/bed_assignments**: Accommodation management

### Key Relationships

- **users** → **fleet_reports** (one-to-many)
- **users** → **vehicles** (many-to-one)
- **users** → **documents** (one-to-many)
- **users** → **leave_applications** (one-to-many)
- **users** → **bed_assignments** (one-to-many)

---

## API Integration Examples

### Submit Report

```typescript
const submitReport = async (reportData: ReportFormData, files: File[]) => {
  // Upload files first
  const uberScreenshotUrl = await uploadFile(files.uberScreenshot);
  const paymentScreenshotUrl = files.paymentScreenshot
    ? await uploadFile(files.paymentScreenshot)
    : null;

  // Submit report
  const { data, error } = await supabase.from("fleet_reports").insert({
    ...reportData,
    uber_screenshot: uberScreenshotUrl,
    payment_screenshot: paymentScreenshotUrl,
    status: "pending_verification",
  });

  return { data, error };
};
```

### Get Payment History

```typescript
const getPaymentHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from("driver_penalty_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error };
};
```

### Upload Document

```typescript
const uploadDocument = async (
  userId: string,
  file: File,
  documentType: string
) => {
  const fileName = `${userId}/documents/${documentType}_${Date.now()}.${file.name
    .split(".")
    .pop()}`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(fileName, file);

  if (!error) {
    await supabase.from("documents").insert({
      user_id: userId,
      document_type: documentType,
      file_url: fileName,
      file_name: file.name,
      status: "pending",
    });
  }

  return { data, error };
};
```

---

This context file provides comprehensive information for building a native mobile app for drivers. It includes all the data models, business logic, API endpoints, and user flows that drivers interact with in the FleetWave Portal system.


