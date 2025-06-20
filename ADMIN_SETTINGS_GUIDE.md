# Admin Settings System

## Overview

The Admin Settings system provides a centralized way to configure dynamic application settings, including fleet rent expenses and company earnings slabs. This replaces hardcoded values with a flexible, database-driven configuration system.

## Features

### 1. Fleet Rent Expense Slabs

Configure fleet rent expenses based on trip count ranges:

- Minimum trips
- Maximum trips (or unlimited)
- Rent amount in ₹

**Default Configuration:**

- 0-63 trips: ₹980
- 64-79 trips: ₹830
- 80-109 trips: ₹740
- 110-124 trips: ₹560
- 125-139 trips: ₹410
- 140+ trips: ₹290

### 2. Company Earnings Slabs

Configure company earnings based on trip count ranges:

- Minimum trips
- Maximum trips (or unlimited)
- Earnings amount in ₹

**Default Configuration:**

- 0-4 trips: ₹795
- 5-7 trips: ₹745
- 8-9 trips: ₹715
- 10 trips: ₹635
- 11 trips: ₹585
- 12+ trips: ₹535

### 3. General Settings

- Company name
- Contact email
- Contact phone

### 4. Notification Preferences

- Email notifications
- SMS notifications
- New report notifications

### 5. System Configuration

- Dark mode
- Debug mode
- Maintenance mode
- API key management

## Database Schema

### admin_settings Table

```sql
- id: UUID (Primary Key)
- setting_type: VARCHAR(50) (fleet_expense, company_earnings, general, notifications, system)
- setting_key: VARCHAR(100) (rent_slabs, earnings_slabs, company_info, preferences, config)
- setting_value: JSONB (Dynamic JSON configuration)
- description: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- created_by: UUID (References auth.users)
- updated_by: UUID (References auth.users)
```

## API Usage

### Using the Hook

```typescript
import { useAdminSettings } from "@/hooks/useAdminSettings";

const MyComponent = () => {
  const {
    fleetRentSlabs,
    companyEarningsSlabs,
    calculateFleetRent,
    calculateCompanyEarnings,
    updateFleetRentSlabs,
    updateCompanyEarningsSlabs,
  } = useAdminSettings();

  // Calculate rent for a vehicle with 75 trips
  const rent = calculateFleetRent(75); // Returns ₹830

  // Calculate earnings for a driver with 10 trips
  const earnings = calculateCompanyEarnings(10); // Returns ₹635
};
```

### Dynamic Calculation Functions

The hook provides two key calculation functions:

1. **calculateFleetRent(tripCount: number): number**

   - Returns the fleet rent amount based on trip count
   - Uses the configured fleet rent slabs

2. **calculateCompanyEarnings(tripCount: number): number**
   - Returns the company earnings based on trip count
   - Uses the configured company earnings slabs

## Pages Integration

### AdminReports.tsx

- Uses `calculateFleetRent()` for fleet expense calculations
- Uses `calculateCompanyEarnings()` for earnings calculations
- Automatically updates when settings change

### VehiclePerformance.tsx

- Uses `calculateFleetRent()` for vehicle rent calculations
- Uses `calculateCompanyEarnings()` for performance metrics
- Dynamic slab-based calculations

### AdminSettings.tsx

- Full CRUD interface for managing all settings
- Real-time preview of changes
- Validation and error handling

## Setup Instructions

1. **Run Database Migration**

   ```bash
   npx supabase db push
   ```

2. **Verify Default Data**
   Check that the admin_settings table is populated with default values.

3. **Access Settings**
   Navigate to Admin → Settings in the application.

## Configuration Management

### Adding New Slabs

1. Go to Admin Settings → Fleet Expenses or Company Earnings
2. Click "Add Slab"
3. Enter minimum trips, maximum trips (optional), and amount
4. Save changes

### Editing Existing Slabs

1. Click the edit icon next to any slab
2. Modify the values
3. Save changes

### Deleting Slabs

1. Click the delete icon next to any slab
2. Confirm deletion

## Data Flow

1. **Settings Storage**: All settings stored in `admin_settings` table as JSONB
2. **Hook Loading**: `useAdminSettings` loads all settings on mount
3. **Real-time Updates**: Changes immediately update local state and database
4. **Calculation Functions**: Dynamic functions use current slab configuration
5. **Application Usage**: All pages use the calculation functions from the hook

## Benefits

- **Flexibility**: No need to redeploy for configuration changes
- **Consistency**: All pages use the same calculation logic
- **Audit Trail**: Track when and who changed settings
- **Real-time**: Changes take effect immediately
- **Validation**: Proper error handling and user feedback

## Security

- **RLS Policies**: Only admins can modify settings
- **Input Validation**: Proper validation on all inputs
- **Audit Trail**: Track all changes with timestamps and user IDs

## Future Enhancements

- Settings history/versioning
- Import/export configuration
- Setting templates
- Bulk operations
- Advanced validation rules
