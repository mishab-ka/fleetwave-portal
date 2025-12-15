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

# FleetWave Portal - Vehicle Attendance Calendar System

## Project Overview

FleetWave Portal is a comprehensive fleet management system built with React, TypeScript, and Supabase. The Vehicle Attendance Calendar is a core component that tracks and manages vehicle operational status across different shifts and time periods.

## Component: VehicleAttendanceCalendar.tsx

### Purpose

The Vehicle Attendance Calendar provides a visual interface for monitoring vehicle operational status across weekly periods, with support for morning and night shifts. It's designed for fleet administrators to track vehicle performance, attendance, and operational efficiency.

### Key Features Implemented

#### 1. **Weekly Calendar View**

- Displays a 7-day calendar grid (Monday-Sunday)
- Navigation controls for previous/next week
- "Today" button to jump to current week
- Dynamic week offset system

#### 2. **Vehicle Management**

- Vehicle dropdown filter (All Vehicles or specific vehicle)
- Dynamic vehicle list based on weekly report submissions
- Vehicle details including fleet name and vehicle number

#### 3. **Dual Shift System**

- Morning shift tracking
- Night shift tracking
- Separate status indicators for each shift (M-Status, N-Status)

#### 4. **Status Management**

- **Running (R)**: Vehicle is operational and submitted reports
- **Stopped (S)**: Vehicle stopped operation but no specific reason
- **Breakdown (B)**: Vehicle experiencing mechanical issues
- **Leave (L)**: Driver/vehicle on approved leave
- **Offline (O)**: Vehicle not responding/no communication
- **Swapped (SW)**: Vehicle has been replaced/swapped
- **Not Active (NA)**: Vehicle hasn't started operations yet

#### 5. **Data Integration**

- **Fleet Reports**: Links to approved fleet reports for operational data
- **Vehicle Attendance**: Dedicated attendance tracking records
- **Vehicle Information**: Basic vehicle metadata and status

#### 6. **Smart Status Logic**

- Automatic status determination based on report submissions
- Historical tracking with first report date awareness
- Future date handling (shows as offline)
- Vehicle lifecycle awareness (not_active before first report)

#### 7. **Interactive Features**

- Click-to-edit status functionality
- Modal interface for status updates
- Notes/comments system for additional context
- Color-coded status indicators

#### 8. **Statistics Dashboard**

- Real-time weekly statistics
- Status breakdown counts
- Total shifts tracking
- Visual statistics cards with color coding

### Recent Fix Implemented

#### Problem Solved:

**Issue**: Vehicle list was not updating when navigating between weeks. Vehicles from other weeks were appearing in weeks where they didn't submit reports.

**Root Cause**: The `fetchVehicles()` function was only called during initial component mount, not when week navigation occurred.

**Solution**: Added `fetchVehicles()` to the week navigation useEffect dependency:

```typescript
useEffect(() => {
  fetchVehicles(); // ← Added this line
  fetchAttendanceData();
  fetchFleetReports();
  fetchVehicleFirstReportDates();
}, [weekOffset, selectedVehicle]);
```

**Result**: Now only vehicles that submitted reports in the specific viewed week are displayed, providing accurate weekly vehicle tracking.

### Technical Architecture

#### State Management

- **React Hooks**: useState, useEffect for local state
- **Supabase Integration**: Real-time database queries
- **Authentication**: useAuth hook for user management

#### Database Tables Used

1. **vehicles**: Basic vehicle information
2. **fleet_reports**: Daily operational reports
3. **vehicle_attendance**: Manual attendance/status records
4. **users**: User roles and permissions

#### Key Functions

1. **fetchVehicles()**: Retrieves vehicles with reports in current week
2. **fetchFleetReports()**: Gets approved reports for date range
3. **fetchAttendanceData()**: Loads manual attendance records
4. **fetchVehicleFirstReportDates()**: Determines vehicle activation dates
5. **getShiftDataForDate()**: Calculates status for specific vehicle/date/shift
6. **handleStatusUpdate()**: Updates/creates attendance records
7. **calculateWeeklyStatistics()**: Computes status distribution

### Data Flow

1. User selects week/vehicle filter
2. System fetches relevant vehicles for that week
3. Fleet reports and attendance data loaded
4. Status logic determines display state for each cell
5. User can click cells to modify status
6. Changes saved to database and UI updated

### Current Stage: Production Ready

#### ✅ Completed Features:

- Full calendar interface
- Dual shift support
- Status management system
- Week navigation
- Vehicle filtering
- Statistics dashboard
- Interactive status updates
- Smart status determination
- Database integration
- Responsive design

#### ✅ Recent Improvements:

- Fixed week-specific vehicle filtering
- Enhanced data consistency
- Improved user experience

#### 🔄 Potential Future Enhancements:

- Export functionality
- Bulk status updates
- Advanced filtering options
- Mobile app support
- Automated report integration
- Performance analytics

### Technology Stack

- **Frontend**: React 18, TypeScript
- **UI Components**: Custom UI components with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Date Handling**: date-fns library
- **State Management**: React Hooks
- **Notifications**: Sonner toast library

### File Structure Context

```
src/components/admin/vehicles/
├── VehicleAttendanceCalendar.tsx (Main component)
├── VehicleStatusModal.tsx (Status edit modal)
└── [Other vehicle-related components]
```

### Component Dependencies

- React & Hooks
- date-fns for date manipulation
- Supabase client for database operations
- Custom UI components (Card, Button, Select, etc.)
- Authentication hook
- Utility functions (cn for className handling)
- Lucide React icons

This component represents a mature, production-ready fleet management tool with comprehensive vehicle tracking capabilities and recent improvements to ensure data accuracy across different time periods.
