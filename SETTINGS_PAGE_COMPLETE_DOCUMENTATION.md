# Admin Settings Page - Complete Documentation

## Overview

The Admin Settings page is a centralized configuration system that allows administrators to manage all dynamic settings of the fleet management application. All configurations are stored in a database table (`admin_settings`) as JSONB data, allowing for flexible, real-time updates without code deployments.

---

## Database Schema

### `admin_settings` Table

```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type VARCHAR(50) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(setting_type, setting_key)
);
```

**Key Fields:**
- `setting_type`: Category of the setting (e.g., "fleet_expense", "company_earnings", "general")
- `setting_key`: Unique identifier within the type (e.g., "rent_slabs", "earnings_slabs")
- `setting_value`: JSONB object containing the actual configuration data
- **Unique Constraint**: `(setting_type, setting_key)` ensures one setting per type-key combination

---

## Settings Categories & Tabs

The settings page is organized into 6 main tabs:

### 1. **General Settings Tab**

**Purpose**: Basic company information and contact details

**Storage**:
- `setting_type`: `"general"`
- `setting_key`: `"company_info"`
- `setting_value`: JSON object with:
  ```json
  {
    "company_name": "Fleet Management",
    "contact_email": "admin@fleetmanagement.com",
    "contact_phone": "+91 1234567890"
  }
  ```

**UI Fields**:
- Company Name (text input)
- Contact Email (email input)
- Contact Phone (tel input)

**Functionality**: Simple CRUD - update and save company information

---

### 2. **Fleet Expenses Tab**

**Purpose**: Configure fleet rent amounts based on trip count ranges (slabs)

**Storage**:
- `setting_type`: `"fleet_expense"`
- `setting_key`: `"rent_slabs"`
- `setting_value`: Array of slab objects:
  ```json
  [
    {
      "min_trips": 0,
      "max_trips": 63,
      "amount": 980
    },
    {
      "min_trips": 64,
      "max_trips": 79,
      "amount": 830
    },
    // ... more slabs
    {
      "min_trips": 140,
      "max_trips": null,
      "amount": 290
    }
  ]
  ```

**Slab Structure**:
- `min_trips`: Minimum trip count for this slab (inclusive)
- `max_trips`: Maximum trip count for this slab (inclusive, or `null` for unlimited)
- `amount`: Rent amount in ₹ (Indian Rupees)

**Default Configuration**:
```
0-63 trips:   ₹980
64-79 trips:  ₹830
80-109 trips: ₹740
110-124 trips: ₹560
125-139 trips: ₹410
140+ trips:    ₹290
```

**How It Works**:
1. When calculating fleet rent for a vehicle with X trips, the system finds the slab where `min_trips <= X <= max_trips` (or `max_trips === null`)
2. Returns the `amount` from the matching slab
3. Used in Vehicle Performance reports and fleet expense calculations

**UI Features**:
- Add new slab (button)
- Edit existing slab (edit icon)
- Delete slab (delete icon)
- Table display showing: Min Trips | Max Trips | Amount (₹) | Actions
- Edit form with 3 fields: Min Trips, Max Trips (optional), Amount
- Automatic sorting by `min_trips` after save

**Calculation Function** (from hook):
```typescript
calculateFleetRent(tripCount: number): number {
  const slab = fleetRentSlabs.find(
    (slab) =>
      tripCount >= slab.min_trips &&
      (slab.max_trips === null || tripCount <= slab.max_trips)
  );
  return slab?.amount || 0;
}
```

---

### 3. **Company Earnings Tab**

This tab contains **3 sub-sections**:

#### 3.1. **Regular Shift Earnings Slabs**

**Purpose**: Configure company earnings (driver rent) for morning/night shifts based on trip count

**Storage**:
- `setting_type`: `"company_earnings"`
- `setting_key`: `"earnings_slabs"`
- `setting_value`: Array of slab objects (same structure as fleet rent slabs)

**Default Configuration**:
```
0-4 trips:  ₹795
5-7 trips:  ₹745
8-9 trips:  ₹715
10 trips:   ₹635
11 trips:   ₹585
12+ trips:  ₹535
```

**Usage**: Used when driver shift is "morning" or "night"

#### 3.2. **24-Hour Shift Earnings Slabs**

**Purpose**: Configure company earnings for 24-hour shifts (different rates)

**Storage**:
- `setting_type`: `"company_earnings"`
- `setting_key`: `"earnings_slabs_24hr"`
- `setting_value`: Array of slab objects

**Default Configuration** (example):
```
0-9 trips:   ₹1590
10-15 trips: ₹1490
16-19 trips: ₹1430
20-21 trips: ₹1270
22-23 trips: ₹1170
24+ trips:   ₹1070
```

**Usage**: Used when driver shift is "24hr"

#### 3.3. **Vehicle Performance Rental Income**

**Purpose**: Set a fixed rental income amount displayed in Vehicle Performance tab

**Storage**:
- `setting_type`: `"company_earnings"`
- `setting_key`: `"vehicle_performance_rental_income"`
- `setting_value`: Single number (not an array)

**UI**: Single number input field with label "Rental Income Amount (₹)"

**Calculation Functions** (from hook):
```typescript
calculateCompanyEarnings(tripCount: number): number {
  // Uses earnings_slabs
  const slab = companyEarningsSlabs.find(
    (slab) =>
      tripCount >= slab.min_trips &&
      (slab.max_trips === null || tripCount <= slab.max_trips)
  );
  return slab?.amount || 0;
}

calculateCompanyEarnings24hr(tripCount: number): number {
  // Uses earnings_slabs_24hr
  const slab = companyEarningsSlabs24hr.find(
    (slab) =>
      tripCount >= slab.min_trips &&
      (slab.max_trips === null || tripCount <= slab.max_trips)
  );
  return slab?.amount || 0;
}
```

---

### 4. **Penalty Division Tab**

**Purpose**: Configure how penalties are divided and applied to drivers over time

**Storage**:
- `setting_type`: `"penalty_division"`
- `setting_key`: `"division_period"`
- `setting_value`: JSON object:
  ```json
  {
    "division_days": 7,
    "enabled": true,
    "auto_apply": true
  }
  ```

**Fields**:
1. **Division Period (Days)**: Number input (1-365)
   - Example: If set to 7, a ₹700 penalty becomes ₹100/day for 7 days
   - Default: 7 days

2. **Enable Penalty Division**: Toggle switch
   - When enabled: Penalties are automatically divided
   - When disabled: Penalties are applied as a single amount

3. **Auto-apply to Reports**: Toggle switch
   - When enabled: Daily penalty amount automatically added to submit reports
   - When disabled: Penalties tracked but not auto-applied

**How It Works**:
1. When a penalty is added to a driver, it's divided by `division_days`
2. Daily penalty amount = Total penalty / division_days
3. If `auto_apply` is enabled, the daily amount is automatically added to rent payable in submit reports
4. Penalties are automatically marked as paid when fully recovered

**UI Features**:
- Number input for division days with min/max validation
- Two toggle switches (enabled, auto_apply)
- Info box explaining how the system works

---

### 5. **Notifications Tab**

**Purpose**: Configure notification preferences

**Storage**:
- `setting_type`: `"notifications"`
- `setting_key`: `"preferences"`
- `setting_value`: JSON object:
  ```json
  {
    "email_notifications": true,
    "sms_notifications": false,
    "new_report_notifications": true
  }
  ```

**Fields** (all toggle switches):
1. **Email Notifications**: Enable/disable email notifications
2. **SMS Notifications**: Enable/disable SMS notifications
3. **New Report Notifications**: Get notified when a new report is submitted

**UI**: Simple toggle switches with labels and descriptions

---

### 6. **System Tab**

**Purpose**: Advanced system configuration options

**Storage**:
- `setting_type`: `"system"`
- `setting_key`: `"config"`
- `setting_value`: JSON object:
  ```json
  {
    "dark_mode": false,
    "debug_mode": false,
    "maintenance_mode": false,
    "api_key": "secret-api-key-here"
  }
  ```

**Fields**:
1. **API Key**: Password input field
   - Shows masked value
   - Has a "Copy" button
   - Warning about keeping it secure

2. **Debug Mode**: Toggle switch
   - Enable detailed error logging
   - Default: false

3. **Maintenance Mode**: Toggle switch
   - Put the site in maintenance mode
   - Default: false

4. **Dark Mode**: Toggle switch (stored but may not be fully implemented)
   - Default: false

---

## Technical Implementation

### React Hook: `useAdminSettings`

**Location**: `src/hooks/useAdminSettings.ts`

**Purpose**: Centralized hook for loading and updating all admin settings

**Exported State**:
```typescript
{
  loading: boolean,
  fleetRentSlabs: FleetRentSlab[],
  companyEarningsSlabs: CompanyEarningsSlab[],
  companyEarningsSlabs24hr: CompanyEarningsSlab[],
  companyInfo: CompanyInfo,
  notificationPreferences: NotificationPreferences,
  systemConfig: SystemConfig,
  penaltyDivisionSettings: PenaltyDivisionSettings,
  vehiclePerformanceRentalIncome: number
}
```

**Exported Functions**:
- `updateFleetRentSlabs(slabs: FleetRentSlab[]): Promise<void>`
- `updateCompanyEarningsSlabs(slabs: CompanyEarningsSlab[]): Promise<void>`
- `updateCompanyEarningsSlabs24hr(slabs: CompanyEarningsSlab[]): Promise<void>`
- `updateCompanyInfo(info: CompanyInfo): Promise<void>`
- `updateNotificationPreferences(prefs: NotificationPreferences): Promise<void>`
- `updateSystemConfig(config: SystemConfig): Promise<void>`
- `updatePenaltyDivisionSettings(settings: PenaltyDivisionSettings): Promise<void>`
- `updateVehiclePerformanceRentalIncome(amount: number): Promise<void>`
- `calculateFleetRent(tripCount: number): number`
- `calculateCompanyEarnings(tripCount: number): number`
- `calculateCompanyEarnings24hr(tripCount: number): number`
- `loadSettings(): Promise<void>`

**Data Flow**:
1. Hook loads all settings from `admin_settings` table on mount
2. Parses `setting_value` JSONB into typed objects
3. Stores in React state
4. Updates use `upsert` with `onConflict: "setting_type,setting_key"`
5. Updates local state and shows toast notification

### Component: `AdminSettings`

**Location**: `src/pages/admin/AdminSettings.tsx`

**Structure**:
- Uses `Tabs` component with 6 tabs
- Each tab contains one or more `Card` components
- Tables for displaying slab arrays
- Forms for editing individual slabs
- Input fields for simple settings
- Toggle switches for boolean settings

**State Management**:
- Uses `useAdminSettings` hook for data
- Local state for editing slabs (`editingFleetSlab`, `editingEarningsSlab`, etc.)
- Temp state for form inputs (prevents direct mutation of hook state)
- Updates temp state when hook data loads

**CRUD Operations**:
- **Create**: Click "Add Slab" → Edit form appears → Fill fields → Save
- **Read**: Data loaded from hook → Displayed in tables
- **Update**: Click edit icon → Form pre-filled → Modify → Save
- **Delete**: Click delete icon → Removes from array → Saves

**Slab Management Logic**:
1. When adding/editing, finds existing slab by `min_trips` (unique identifier)
2. If exists: replaces in array
3. If new: appends to array
4. Sorts array by `min_trips` ascending
5. Calls update function from hook
6. Hook saves to database via upsert

---

## Integration Points

### Where Slabs Are Used

1. **Submit Report Page** (`src/pages/SubmitReport.tsx`)
   - Uses `calculateCompanyEarnings()` and `calculateCompanyEarnings24hr()` to determine driver rent
   - Rent is deducted from earnings in `rent_paid_amount` calculation

2. **Admin Reports Page** (`src/pages/admin/AdminReports.tsx`)
   - Uses `calculateFleetRent()` for fleet expense calculations
   - Uses `calculateCompanyEarnings()` for earnings display
   - Real-time updates when settings change

3. **Vehicle Performance Page** (`src/pages/admin/VehiclePerformance.tsx`)
   - Uses `calculateFleetRent()` for vehicle rent
   - Uses `calculateCompanyEarnings()` for performance metrics
   - Uses `vehiclePerformanceRentalIncome` for rental income display

4. **Monthly Rent Dashboard**
   - Uses calculation functions for aggregations
   - Displays slab-based calculations

---

## Slab Calculation Logic

### Finding the Correct Slab

For any trip count X, find the slab where:
```
slab.min_trips <= X <= slab.max_trips
OR
slab.max_trips === null (unlimited)
```

**Priority**: First matching slab (array should be sorted by `min_trips`)

**Example**:
```typescript
// Slabs:
[
  { min_trips: 0, max_trips: 63, amount: 980 },
  { min_trips: 64, max_trips: 79, amount: 830 },
  { min_trips: 140, max_trips: null, amount: 290 }
]

// Trip count: 75
// Matches: { min_trips: 64, max_trips: 79, amount: 830 }
// Returns: 830

// Trip count: 150
// Matches: { min_trips: 140, max_trips: null, amount: 290 }
// Returns: 290
```

### Edge Cases

1. **No matching slab**: Returns 0 (should not happen with proper configuration)
2. **Overlapping slabs**: First match wins (should be avoided in configuration)
3. **Gaps in ranges**: Values in gaps return 0 (should be avoided)
4. **Null max_trips**: Always matches if trip count >= min_trips (should be last slab)

---

## Default Data Migration

When setting up the system, default values are inserted via SQL migration:

```sql
-- Fleet rent slabs
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('fleet_expense', 'rent_slabs', '[...]', 'Fleet rent expense calculation based on trip count');

-- Company earnings slabs
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('company_earnings', 'earnings_slabs', '[...]', 'Company earnings calculation based on trip count'),
('company_earnings', 'earnings_slabs_24hr', '[...]', 'Company earnings calculation for 24-hour shifts'),
('company_earnings', 'vehicle_performance_rental_income', 0, 'Fixed rental income amount for Vehicle Performance tab');

-- General settings
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('general', 'company_info', '{...}', 'General company information');

-- Notification settings
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('notifications', 'preferences', '{...}', 'Notification preferences');

-- System settings
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('system', 'config', '{...}', 'System configuration settings');

-- Penalty division
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description) VALUES
('penalty_division', 'division_period', '{...}', 'Penalty division period in days and settings');
```

---

## User Experience Flow

### Adding a New Slab

1. User clicks "Add Slab" button
2. Edit form appears below the table
3. User fills in:
   - Min Trips (required, number)
   - Max Trips (optional, number or empty for unlimited)
   - Amount (required, number in ₹)
4. User clicks "Save"
5. System:
   - Checks if slab with same `min_trips` exists
   - If exists: Updates in array
   - If new: Adds to array
   - Sorts array by `min_trips`
   - Saves to database via upsert
   - Updates local state
   - Shows success toast
   - Hides edit form
6. Table refreshes with new/updated slab

### Editing an Existing Slab

1. User clicks edit icon (pencil) next to a slab
2. Edit form appears with pre-filled values
3. User modifies values
4. User clicks "Save"
5. Same process as adding (updates existing)

### Deleting a Slab

1. User clicks delete icon (trash) next to a slab
2. Slab is immediately removed from array
3. Array is saved to database
4. Table refreshes
5. Success toast shown

### Updating Simple Settings (e.g., Company Info)

1. User modifies input fields
2. Changes stored in temp state
3. User clicks "Save Changes" button
4. Settings saved to database
5. Local state updated
6. Success toast shown

---

## Validation & Error Handling

### Input Validation

1. **Min Trips**: Must be a number >= 0
2. **Max Trips**: Must be a number >= min_trips (if provided), or null/empty
3. **Amount**: Must be a number >= 0
4. **Division Days**: Must be between 1-365
5. **Email**: Should be valid email format (browser validation)

### Error Handling

- Database errors: Shown in toast notification
- Network errors: Shown in toast notification
- Validation errors: Browser/form validation
- Loading states: Spinner shown while loading settings

### Data Integrity

- **Unique constraint**: Prevents duplicate `(setting_type, setting_key)` combinations
- **Upsert**: Uses `onConflict` to update existing or insert new
- **JSONB validation**: Database ensures valid JSON structure
- **Type safety**: TypeScript interfaces ensure correct data shapes

---

## Security Considerations

1. **RLS Policies**: Only admins can read/write settings
2. **Authentication**: User must be authenticated and have admin role
3. **Input Sanitization**: Numbers validated, strings sanitized
4. **API Key**: Stored securely, masked in UI
5. **Audit Trail**: `created_by`, `updated_by`, timestamps track changes

---

## Future Enhancements (Not Implemented)

1. Settings history/versioning
2. Import/export configuration
3. Setting templates/presets
4. Bulk operations on slabs
5. Advanced validation rules
6. Settings search/filter
7. Settings categories/subcategories
8. Multi-language support
9. Settings comparison/diff view
10. Rollback to previous version

---

## Key Takeaways for Development

1. **Database-driven**: All settings stored as JSONB in single table
2. **Type-safe**: TypeScript interfaces for all settings
3. **Centralized**: Single hook (`useAdminSettings`) manages all settings
4. **Real-time**: Changes immediately reflected across application
5. **Flexible**: Easy to add new setting types without schema changes
6. **Slab-based**: Trip count ranges determine amounts dynamically
7. **CRUD operations**: Full create, read, update, delete for slabs
8. **Calculation functions**: Helper functions abstract slab lookup logic
9. **Integration**: Used throughout application for financial calculations
10. **User-friendly**: Clean UI with tables, forms, and toggles

---

## Example Usage in Code

```typescript
// In any component
import { useAdminSettings } from "@/hooks/useAdminSettings";

const MyComponent = () => {
  const { 
    fleetRentSlabs, 
    calculateFleetRent, 
    calculateCompanyEarnings,
    loading 
  } = useAdminSettings();

  // Calculate rent for 75 trips
  const rent = calculateFleetRent(75); // Returns 830

  // Calculate earnings for 10 trips (morning/night shift)
  const earnings = calculateCompanyEarnings(10); // Returns 635

  if (loading) return <Loading />;

  return <div>Rent: ₹{rent}, Earnings: ₹{earnings}</div>;
};
```

---

This documentation provides a complete understanding of the Admin Settings system, all slabs, their configurations, and how they integrate with the rest of the application.

