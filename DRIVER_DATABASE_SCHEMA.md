# Driver Database Schema & Queries Reference

## Overview

This document provides complete database schema, table structures, column definitions, and SQL queries for all driver-related functionality in the FleetWave Portal system.

## Table of Contents

1. [Core User Tables](#core-user-tables)
2. [Report Management Tables](#report-management-tables)
3. [Payment & Financial Tables](#payment--financial-tables)
4. [Accommodation Tables](#accommodation-tables)
5. [Document Management Tables](#document-management-tables)
6. [Leave Management Tables](#leave-management-tables)
7. [Vehicle Management Tables](#vehicle-management-tables)
8. [Common Queries](#common-queries)
9. [Authentication Queries](#authentication-queries)
10. [Report Submission Queries](#report-submission-queries)
11. [Payment Tracking Queries](#payment-tracking-queries)
12. [Document Management Queries](#document-management-queries)
13. [Profile Management Queries](#profile-management-queries)

---

## Core User Tables

### users (Main Driver Table)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    vehicle_number VARCHAR(20),
    shift VARCHAR(20) DEFAULT 'morning' CHECK (shift IN ('morning', 'night', '24hr')),
    online BOOLEAN DEFAULT true,
    total_earning DECIMAL(12,2) DEFAULT 0,
    total_trip INTEGER DEFAULT 0,
    pending_balance DECIMAL(12,2) DEFAULT 0,
    daily_penalty_amount DECIMAL(10,2) DEFAULT 0,
    enable_deposit_collection BOOLEAN DEFAULT true,
    resigning_date DATE,
    resignation_reason TEXT,
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    bank_name VARCHAR(100),
    date_of_birth DATE,
    role VARCHAR(50) DEFAULT 'driver',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Columns:**

- `id`: Primary key (UUID)
- `email`: Driver's email address
- `name`: Driver's full name
- `phone_number`: Contact number
- `vehicle_number`: Assigned vehicle
- `shift`: Work shift (morning/night/24hr)
- `online`: Online status for report submission
- `total_earning`: Lifetime earnings
- `total_trip`: Lifetime trips
- `pending_balance`: Deposit balance
- `daily_penalty_amount`: Daily penalty if applicable
- `enable_deposit_collection`: Deposit collection toggle
- `resigning_date`: Resignation date
- `resignation_reason`: Reason for resignation
- `account_number`: Bank account number
- `ifsc_code`: Bank IFSC code
- `bank_name`: Bank name
- `date_of_birth`: Driver's DOB

---

## Report Management Tables

### fleet_reports (Daily Trip Reports)

```sql
CREATE TABLE fleet_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_name VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    total_trips INTEGER NOT NULL,
    total_earnings DECIMAL(12,2) NOT NULL,
    toll DECIMAL(10,2) DEFAULT 0,
    total_cashcollect DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    net_fare DECIMAL(12,2) DEFAULT 0,
    rent_paid_amount DECIMAL(12,2) NOT NULL,
    deposit_cutting_amount DECIMAL(10,2) DEFAULT 0,
    rent_date DATE NOT NULL,
    shift VARCHAR(20) NOT NULL,
    uber_screenshot TEXT,
    payment_screenshot TEXT,
    status VARCHAR(50) DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'approved', 'rejected', 'leave')),
    remarks TEXT,
    is_service_day BOOLEAN DEFAULT false,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Columns:**

- `id`: Primary key
- `user_id`: Driver reference
- `driver_name`: Driver name
- `vehicle_number`: Vehicle used
- `total_trips`: Number of trips
- `total_earnings`: Total earnings
- `toll`: Toll amount
- `total_cashcollect`: Cash collected
- `platform_fee`: Platform fee (auto-calculated)
- `net_fare`: Net fare amount
- `rent_paid_amount`: Final rent amount
- `deposit_cutting_amount`: Deposit cutting
- `rent_date`: Report date
- `shift`: Work shift
- `uber_screenshot`: Screenshot file path
- `payment_screenshot`: Payment screenshot
- `status`: Report status
- `remarks`: Additional notes
- `is_service_day`: Service day flag

---

## Payment & Financial Tables

### driver_penalty_transactions (Payment History)

```sql
CREATE TABLE driver_penalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'refund', 'due', 'penalty')),
    description TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Columns:**

- `id`: Primary key
- `user_id`: Driver reference
- `amount`: Transaction amount
- `type`: Transaction type
- `description`: Transaction description
- `created_by`: Admin who created transaction

### driver_balance_transactions (Deposit Transactions)

```sql
CREATE TABLE driver_balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'refund', 'due')),
    description TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### vehicle_transactions (Vehicle Adjustments)

```sql
CREATE TABLE vehicle_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Accommodation Tables

### rooms (Accommodation Rooms)

```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number INTEGER NOT NULL UNIQUE,
    room_name VARCHAR(50),
    total_beds INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'maintenance', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### beds (Room Beds)

```sql
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number INTEGER NOT NULL,
    bed_name VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available'
        CHECK (status IN ('available', 'occupied', 'maintenance')),
    daily_rent DECIMAL(10,2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, bed_number)
);
```

### bed_assignments (Driver Bed Assignments)

```sql
CREATE TABLE bed_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('morning', 'night')),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'ended', 'transferred')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bed_id, shift, assigned_date)
);
```

### rent_transactions (Rent Collection)

```sql
CREATE TABLE rent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES beds(id),
    amount DECIMAL(10,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Document Management Tables

### documents (Driver Documents)

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT
);
```

**Key Columns:**

- `id`: Primary key
- `user_id`: Driver reference
- `document_type`: Type of document (aadhar, license, pan, etc.)
- `file_url`: File path in storage
- `file_name`: Original file name
- `status`: Approval status
- `reviewed_by`: Admin who reviewed
- `reviewed_at`: Review timestamp

---

## Leave Management Tables

### leave_applications (Leave Requests)

```sql
CREATE TABLE leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL
        CHECK (leave_type IN ('sick', 'personal', 'emergency', 'resignation')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    admin_remarks TEXT
);
```

---

## Vehicle Management Tables

### vehicles (Vehicle Information)

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number VARCHAR(20) NOT NULL UNIQUE,
    total_trips INTEGER DEFAULT 0,
    online BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Common Queries

### 1. Get Driver Profile

```sql
SELECT
    id, email, name, phone_number, vehicle_number, shift,
    online, total_earning, total_trip, pending_balance,
    daily_penalty_amount, enable_deposit_collection,
    account_number, ifsc_code, bank_name, date_of_birth,
    created_at, updated_at
FROM users
WHERE id = $1;
```

### 2. Get Driver's Recent Reports

```sql
SELECT
    id, driver_name, vehicle_number, total_trips, total_earnings,
    toll, total_cashcollect, platform_fee, net_fare,
    rent_paid_amount, deposit_cutting_amount, rent_date, shift,
    status, remarks, is_service_day, submission_date
FROM fleet_reports
WHERE user_id = $1
ORDER BY submission_date DESC
LIMIT 10;
```

### 3. Get Driver's Payment History

```sql
SELECT
    id, amount, type, description, created_at
FROM driver_penalty_transactions
WHERE user_id = $1
ORDER BY created_at DESC;
```

### 4. Get Driver's Deposit Transactions

```sql
SELECT
    id, amount, type, description, created_at
FROM driver_balance_transactions
WHERE user_id = $1
ORDER BY created_at DESC;
```

### 5. Get Driver's Documents

```sql
SELECT
    id, document_type, file_url, file_name,
    uploaded_at, status, reviewed_at, remarks
FROM documents
WHERE user_id = $1
ORDER BY uploaded_at DESC;
```

### 6. Get Driver's Leave Applications

```sql
SELECT
    id, leave_type, start_date, end_date, reason,
    status, applied_at, reviewed_at, admin_remarks
FROM leave_applications
WHERE user_id = $1
ORDER BY applied_at DESC;
```

### 7. Get Driver's Bed Assignment

```sql
SELECT
    ba.id, ba.shift, ba.assigned_date, ba.end_date, ba.status,
    b.bed_name, b.daily_rent,
    r.room_number, r.room_name
FROM bed_assignments ba
JOIN beds b ON ba.bed_id = b.id
JOIN rooms r ON b.room_id = r.id
WHERE ba.user_id = $1 AND ba.status = 'active';
```

---

## Authentication Queries

### 1. Check Driver Online Status

```sql
SELECT online FROM users WHERE id = $1;
```

### 2. Update Driver Online Status

```sql
UPDATE users SET online = $2 WHERE id = $1;
```

### 3. Get Driver by Email

```sql
SELECT id, email, name, phone_number, vehicle_number, shift, online
FROM users WHERE email = $1;
```

### 4. Update Driver Profile

```sql
UPDATE users
SET
    name = $2,
    phone_number = $3,
    account_number = $4,
    ifsc_code = $5,
    bank_name = $6,
    date_of_birth = $7,
    updated_at = NOW()
WHERE id = $1;
```

---

## Report Submission Queries

### 1. Check Existing Report for Date

```sql
SELECT id, status, submission_date
FROM fleet_reports
WHERE user_id = $1 AND rent_date = $2;
```

### 2. Submit New Report

```sql
INSERT INTO fleet_reports (
    user_id, driver_name, vehicle_number, total_trips,
    total_earnings, toll, total_cashcollect, platform_fee,
    net_fare, rent_paid_amount, deposit_cutting_amount,
    rent_date, shift, uber_screenshot, payment_screenshot,
    status, remarks, is_service_day, submission_date
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
);
```

### 3. Update Vehicle Trip Count

```sql
UPDATE vehicles
SET total_trips = total_trips + $2
WHERE vehicle_number = $1;
```

### 4. Update Driver Totals

```sql
UPDATE users
SET
    total_earning = total_earning + $2,
    total_trip = total_trip + $3
WHERE id = $1;
```

### 5. Get Report by ID

```sql
SELECT * FROM fleet_reports WHERE id = $1;
```

---

## Payment Tracking Queries

### 1. Get Driver's Current Balance

```sql
SELECT pending_balance FROM users WHERE id = $1;
```

### 2. Update Driver Balance

```sql
UPDATE users
SET pending_balance = pending_balance + $2
WHERE id = $1;
```

### 3. Get Payment Summary

```sql
SELECT
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) as total_refunds,
    SUM(CASE WHEN type = 'due' THEN amount ELSE 0 END) as total_dues,
    SUM(CASE WHEN type = 'penalty' THEN amount ELSE 0 END) as total_penalties
FROM driver_penalty_transactions
WHERE user_id = $1;
```

### 4. Get Monthly Payment Summary

```sql
SELECT
    DATE_TRUNC('month', created_at) as month,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
    SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) as refunds,
    SUM(CASE WHEN type = 'due' THEN amount ELSE 0 END) as dues
FROM driver_penalty_transactions
WHERE user_id = $1
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

---

## Document Management Queries

### 1. Upload Document

```sql
INSERT INTO documents (
    user_id, document_type, file_url, file_name, status
) VALUES ($1, $2, $3, $4, 'pending');
```

### 2. Get Document Status

```sql
SELECT status, reviewed_at, remarks
FROM documents
WHERE user_id = $1 AND document_type = $2;
```

### 3. Get All Document Types for Driver

```sql
SELECT DISTINCT document_type
FROM documents
WHERE user_id = $1;
```

### 4. Update Document Status

```sql
UPDATE documents
SET
    status = $3,
    reviewed_by = $4,
    reviewed_at = NOW(),
    remarks = $5
WHERE id = $1 AND user_id = $2;
```

---

## Profile Management Queries

### 1. Get Driver Statistics

```sql
SELECT
    COUNT(*) as total_reports,
    SUM(total_trips) as total_trips,
    SUM(total_earnings) as total_earnings,
    AVG(total_trips) as avg_trips_per_day,
    AVG(total_earnings) as avg_earnings_per_day
FROM fleet_reports
WHERE user_id = $1 AND status IN ('approved', 'pending_verification');
```

### 2. Get Recent Activity

```sql
SELECT
    'report' as type,
    submission_date as date,
    status as status,
    total_trips as value1,
    total_earnings as value2
FROM fleet_reports
WHERE user_id = $1

UNION ALL

SELECT
    'payment' as type,
    created_at as date,
    type as status,
    amount as value1,
    0 as value2
FROM driver_penalty_transactions
WHERE user_id = $1

ORDER BY date DESC
LIMIT 20;
```

### 3. Get Driver Performance Metrics

```sql
SELECT
    DATE_TRUNC('month', rent_date) as month,
    COUNT(*) as reports_submitted,
    SUM(total_trips) as total_trips,
    SUM(total_earnings) as total_earnings,
    AVG(total_trips) as avg_trips,
    AVG(total_earnings) as avg_earnings
FROM fleet_reports
WHERE user_id = $1 AND status IN ('approved', 'pending_verification')
GROUP BY DATE_TRUNC('month', rent_date)
ORDER BY month DESC;
```

---

## Accommodation Queries

### 1. Get Available Beds

```sql
SELECT
    b.id, b.bed_name, b.daily_rent,
    r.room_number, r.room_name
FROM beds b
JOIN rooms r ON b.room_id = r.id
WHERE b.status = 'available' AND r.status = 'active';
```

### 2. Assign Driver to Bed

```sql
INSERT INTO bed_assignments (
    bed_id, user_id, shift, assigned_date, status
) VALUES ($1, $2, $3, CURRENT_DATE, 'active');
```

### 3. Get Driver's Rent History

```sql
SELECT
    rt.amount, rt.transaction_date, rt.description,
    b.bed_name, r.room_number
FROM rent_transactions rt
LEFT JOIN beds b ON rt.bed_id = b.id
LEFT JOIN rooms r ON b.room_id = r.id
WHERE rt.user_id = $1
ORDER BY rt.transaction_date DESC;
```

### 4. Calculate Monthly Rent

```sql
SELECT
    COUNT(*) * 100 as monthly_rent
FROM fleet_reports
WHERE user_id = $1
    AND rent_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND rent_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND status IN ('approved', 'pending_verification');
```

---

## Leave Management Queries

### 1. Submit Leave Application

```sql
INSERT INTO leave_applications (
    user_id, leave_type, start_date, end_date, reason, status
) VALUES ($1, $2, $3, $4, $5, 'pending');
```

### 2. Get Leave Applications

```sql
SELECT
    id, leave_type, start_date, end_date, reason,
    status, applied_at, reviewed_at, admin_remarks
FROM leave_applications
WHERE user_id = $1
ORDER BY applied_at DESC;
```

### 3. Check Leave Conflicts

```sql
SELECT COUNT(*)
FROM leave_applications
WHERE user_id = $1
    AND status = 'approved'
    AND (start_date <= $3 AND end_date >= $2);
```

---

## Real-time Subscription Queries

### 1. Listen to Report Status Changes

```sql
-- Supabase Realtime subscription
SELECT * FROM fleet_reports
WHERE user_id = $1;
```

### 2. Listen to Payment Updates

```sql
-- Supabase Realtime subscription
SELECT * FROM driver_penalty_transactions
WHERE user_id = $1;
```

### 3. Listen to Document Status Changes

```sql
-- Supabase Realtime subscription
SELECT * FROM documents
WHERE user_id = $1;
```

---

## File Storage Queries

### 1. Upload File to Storage

```sql
-- This is handled by Supabase Storage API, not SQL
-- File path format: {user_id}/reports/{timestamp}_{filename}
-- Example: 123e4567-e89b-12d3-a456-426614174000/reports/1640995200000_uber_screenshot.jpg
```

### 2. Get File URL

```sql
-- File URLs are generated by Supabase Storage
-- Format: https://{project}.supabase.co/storage/v1/object/public/uploads/{file_path}
```

---

## Indexes for Performance

### Recommended Indexes

```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_vehicle_number ON users(vehicle_number);
CREATE INDEX idx_users_online ON users(online);

-- Fleet reports indexes
CREATE INDEX idx_fleet_reports_user_id ON fleet_reports(user_id);
CREATE INDEX idx_fleet_reports_rent_date ON fleet_reports(rent_date);
CREATE INDEX idx_fleet_reports_status ON fleet_reports(status);
CREATE INDEX idx_fleet_reports_user_date ON fleet_reports(user_id, rent_date);

-- Payment transactions indexes
CREATE INDEX idx_penalty_transactions_user_id ON driver_penalty_transactions(user_id);
CREATE INDEX idx_penalty_transactions_created_at ON driver_penalty_transactions(created_at);
CREATE INDEX idx_balance_transactions_user_id ON driver_balance_transactions(user_id);

-- Documents indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);

-- Leave applications indexes
CREATE INDEX idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_leave_applications_dates ON leave_applications(start_date, end_date);

-- Bed assignments indexes
CREATE INDEX idx_bed_assignments_user_id ON bed_assignments(user_id);
CREATE INDEX idx_bed_assignments_bed_id ON bed_assignments(bed_id);
CREATE INDEX idx_bed_assignments_status ON bed_assignments(status);
```

---

## Common Error Handling

### 1. Check User Exists

```sql
SELECT EXISTS(SELECT 1 FROM users WHERE id = $1);
```

### 2. Check Vehicle Exists

```sql
SELECT EXISTS(SELECT 1 FROM vehicles WHERE vehicle_number = $1);
```

### 3. Check Report Exists for Date

```sql
SELECT EXISTS(
    SELECT 1 FROM fleet_reports
    WHERE user_id = $1 AND rent_date = $2
);
```

### 4. Validate Driver Online Status

```sql
SELECT online FROM users WHERE id = $1 AND online = true;
```

---

This comprehensive database schema and query reference provides everything needed for building a driver mobile app, including all table structures, column definitions, common queries, and performance optimizations.
