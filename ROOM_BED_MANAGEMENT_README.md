# Room & Bed Management System

## Overview

The Room & Bed Management System is a comprehensive solution for managing driver accommodation across 6 rooms and 30 beds. The system handles driver assignments, rent calculations, and provides detailed reporting capabilities.

## System Architecture

### Database Structure

#### 1. Rooms Table

- **6 rooms total** (Room 1-6)
- Each room contains **5 beds** (Bed A, B, C, D, E)
- **Total capacity: 30 beds**

#### 2. Beds Table

- Individual bed management
- Daily rent: **₹100 per driver**
- Status tracking (available, occupied, maintenance)

#### 3. Bed Assignments Table

- Driver assignments to specific beds
- **12-hour shifts**: Morning and Night
- **2 drivers per bed** (24-hour coverage)
- Assignment history tracking

#### 4. Rent Transactions Table

- Daily rent tracking based on submitted reports
- **1 report = 1 day = ₹100 rent**
- Payment status management

## Key Features

### 1. Room & Bed Management Dashboard

- **Location**: `/admin/room-bed-management`
- **Features**:
  - Visual room and bed layout
  - Real-time occupancy status
  - Driver assignment/unassignment
  - Bed availability tracking
  - Rent calculation display

### 2. Monthly Rent Dashboard

- **Location**: `/admin/monthly-rent-dashboard`
- **Features**:
  - Monthly rent summaries
  - Driver-specific rent tracking
  - Export functionality (CSV)
  - Occupancy rate calculations
  - Revenue analytics

### 3. Driver Profile Integration

- **Location**: Driver profile → Accommodation tab
- **Features**:
  - Current room and bed information
  - Shift details
  - Monthly rent calculation
  - Assignment history

## Rent Calculation Logic

### Daily Rent

- **₹100 per driver per day**
- Calculated based on submitted reports
- **1 report = 1 day of accommodation**

### Monthly Rent

- **₹3,000 per driver per month** (30 days × ₹100)
- **₹6,000 per bed space per month** (2 drivers × ₹3,000)
- **Total monthly revenue**: Based on actual reports submitted

### Example Calculation

```
Driver submits 25 reports in a month
Monthly rent = 25 × ₹100 = ₹2,500
```

## System Workflow

### 1. Driver Assignment

1. Admin selects available bed
2. Chooses driver and shift (morning/night)
3. System creates bed assignment
4. Updates driver's current room/bed info
5. Bed status changes to occupied

### 2. Rent Collection

1. Driver submits daily report
2. System automatically calculates rent (₹100)
3. Rent transaction recorded
4. Monthly totals updated

### 3. Reporting

1. Admin views monthly dashboard
2. System shows:
   - Total reports submitted
   - Total rent collected
   - Occupancy rates
   - Driver-specific data

## Database Migration

To set up the system, run the migration:

```sql
-- Run the migration file
supabase/migrations/20250108000000_create_room_bed_management.sql
```

This migration will:

- Create all necessary tables
- Insert initial room and bed data
- Set up indexes for performance
- Create helper functions
- Add triggers for automatic updates

## API Functions

### 1. `calculate_monthly_rent(user_id, month)`

- Calculates monthly rent for a specific driver
- Based on submitted reports count

### 2. `get_bed_occupancy_status(bed_id)`

- Returns current occupancy status
- Shows morning and night shift drivers

## Navigation Structure

### Admin Menu

```
Accommodation
├── Room & Bed Management
└── Monthly Rent Dashboard
```

### Driver Profile

```
Profile Tabs
├── Profile
├── Accommodation ← New tab
├── Documents
└── Payment History
```

## Key Benefits

1. **Automated Rent Calculation**: Based on actual work reports
2. **Real-time Occupancy Tracking**: Always know bed availability
3. **Comprehensive Reporting**: Detailed analytics and exports
4. **Driver Transparency**: Clear accommodation information
5. **Scalable System**: Easy to add more rooms/beds

## Usage Examples

### Assigning a Driver

1. Go to Room & Bed Management
2. Click "Assign Driver"
3. Select bed, driver, and shift
4. Confirm assignment

### Checking Monthly Revenue

1. Go to Monthly Rent Dashboard
2. Select month
3. View summary or driver details
4. Export data if needed

### Driver Viewing Accommodation

1. Go to Profile → Accommodation tab
2. View current room/bed assignment
3. See monthly rent calculation
4. Request room change if needed

## Technical Implementation

### Components Created

- `RoomBedManagement.tsx` - Main management interface
- `DriverRoomBedInfo.tsx` - Driver accommodation display
- `MonthlyRentDashboard.tsx` - Reporting dashboard

### Pages Added

- `/admin/room-bed-management` - Management interface
- `/admin/monthly-rent-dashboard` - Reporting interface
- Driver profile accommodation tab

### Database Tables

- `rooms` - Room information
- `beds` - Individual bed data
- `bed_assignments` - Driver assignments
- `rent_transactions` - Rent tracking

## Future Enhancements

1. **Room Change Requests**: Allow drivers to request room changes
2. **Maintenance Scheduling**: Track bed/room maintenance
3. **Advanced Analytics**: More detailed reporting
4. **Mobile App Integration**: Mobile-friendly interface
5. **Automated Notifications**: Rent reminders and updates

## Support

For technical support or questions about the Room & Bed Management System, please contact the development team or refer to the system documentation.











