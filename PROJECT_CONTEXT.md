# FleetWave Portal - Project Context

## Project Overview

FleetWave Portal is a comprehensive fleet management system designed to handle vehicle tracking, driver management, financial reporting, and vehicle auditing. The application is built using React with TypeScript and integrates with Supabase for backend services.

## System Architecture

### Frontend Architecture

- **Framework**: React with TypeScript
- **UI Components**: Custom components using Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router
- **Data Visualization**: Recharts for analytics

### Backend Integration

- **Database**: Supabase
- **Authentication**: Supabase Auth
- **Real-time Updates**: Supabase Realtime

## Core Features

### 1. Dashboard (AdminDashboard.tsx)

- Real-time statistics display
- Financial metrics tracking
  - Total Revenue
  - Monthly Expenses
  - Net Profit
  - Assets Value
- Fleet performance visualization
  - Revenue & Expenses Analysis
  - Profit Analysis
- Key performance indicators
  - Active Drivers count
  - Fleet Size
  - Report Submission rates

### 2. Vehicle Management (AdminVehicles.tsx)

- Vehicle inventory tracking
- Status management (online/offline)
- Trip history tracking
- Vehicle performance metrics
- Fleet maintenance records

### 3. Report Management (AdminReports.tsx)

- Driver report submission
- Financial tracking
  - Total earnings
  - Rent payment status
  - Cash collection
  - Toll expenses
- Report verification system
- Document management (screenshots, receipts)

### 4. Vehicle Auditing (AdminVehicleAuditReports.tsx)

- Comprehensive vehicle inspection system
- Damage reporting
- Audit verification workflow
- Issue tracking and resolution
- Performance metrics tracking
  - Pass rates
  - Open issues
  - Verification status

## Data Models

### Vehicle

```typescript
interface Vehicle {
  vehicle_number: string;
  fleet_name: string | null;
  total_trips: number | null;
  online: boolean | null;
  deposit: number | null;
  created_at: string | null;
}
```

### Report

```typescript
interface Report {
  id: string;
  driver_name: string;
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  rent_paid_status: boolean;
  total_cashcollect: number;
  rent_paid_amount: number;
  rent_verified: boolean;
  submission_date: string;
  rent_date: string;
  shift: string;
  uber_screenshot: string | null;
  payment_screenshot: string | null;
  status: string | null;
  remarks: string | null;
  toll: number;
}
```

## Key Business Flows

### 1. Vehicle Audit Process

1. Initiate vehicle inspection
2. Document vehicle condition
3. Report issues if found
4. Verify and approve audit
5. Track resolution of identified issues

### 2. Financial Reporting

1. Driver submits daily earnings report
2. System calculates total earnings and expenses
3. Verification of rent payment
4. Generation of financial analytics
5. Real-time updates to dashboard metrics

### 3. Fleet Management

1. Vehicle registration and tracking
2. Driver assignment and management
3. Trip history recording
4. Performance metrics calculation
5. Maintenance scheduling

## Integration Points

### Supabase Tables

- users
- vehicles
- fleet_reports
- vehicle_audits
- vehicle_trip_history

### Real-time Subscriptions

- Fleet report updates
- Vehicle status changes
- Audit report modifications

## Security Considerations

- Role-based access control
- Secure file storage for documents
- Data validation and sanitization
- Audit trail maintenance

## Future Enhancements

1. Advanced analytics and reporting
2. Mobile application integration
3. Automated maintenance scheduling
4. Enhanced driver performance tracking
5. Integration with additional payment systems
