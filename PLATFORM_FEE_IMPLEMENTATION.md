# Platform Fee and Net Fare Implementation

## Overview

Added platform fee and net fare functionality to the fleet management system. The platform fee is automatically calculated based on the net fare amount, and it's included in the rent calculation.

## Database Changes

### SQL Migration

Run the following SQL to add the new columns to the `fleet_reports` table:

```sql
-- Add platform_fee and net_fare columns to fleet_reports table
ALTER TABLE fleet_reports
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_fare DECIMAL(10,2) DEFAULT 0;

-- Add comments to explain the columns
COMMENT ON COLUMN fleet_reports.platform_fee IS 'Platform fee amount (14% of net fare - e.g., 70 for 500rs, 140 for 1000rs)';
COMMENT ON COLUMN fleet_reports.net_fare IS 'Net fare amount after platform fee deduction';

-- Update existing records to have default values
UPDATE fleet_reports
SET platform_fee = 0, net_fare = 0
WHERE platform_fee IS NULL OR net_fare IS NULL;

-- Make the columns NOT NULL after setting default values
ALTER TABLE fleet_reports
ALTER COLUMN platform_fee SET NOT NULL,
ALTER COLUMN net_fare SET NOT NULL;
```

## Platform Fee Calculation Logic

The platform fee is calculated as 14% of the net fare amount:

- **500rs**: ₹70 (14% of 500)
- **1000rs**: ₹140 (14% of 1000)
- **1500rs**: ₹210 (14% of 1500)
- **2000rs**: ₹280 (14% of 2000)
- **2500rs**: ₹350 (14% of 2500)
- **3000rs**: ₹420 (14% of 3000)
- **3500rs**: ₹490 (14% of 3500)
- **4000rs**: ₹560 (14% of 4000)
- **4500rs**: ₹630 (14% of 4500)
- **5000rs**: ₹700 (14% of 5000)
- **Any amount**: 14% of net fare

## Changes Made

### 1. SubmitReport Component (`src/pages/SubmitReport.tsx`)

#### New Form Fields:

- **Net Fare**: User input field (required)
- **Platform Fee**: Auto-calculated field (disabled for users, editable for admins)

#### Updated Rent Calculation:

- Platform fee is now included in the total rent calculation
- Formula: `amount = earnings + toll - cash - rent - platformFee`

#### Database Insert:

- Added `platform_fee` and `net_fare` to the database insert

### 2. AdminReports Component (`src/pages/admin/AdminReports.tsx`)

#### Interface Updates:

- Added `platform_fee: number` and `net_fare: number` to the Report interface

#### Table Display:

- Added "NF" (Net Fare) and "PF" (Platform Fee) columns to the reports table
- Updated table headers and cells to display the new fields

#### Modal Editing:

- Added form fields for editing net fare and platform fee
- Platform fee is editable for admins (unlike in user form)
- Auto-recalculation includes platform fee in rent calculations

#### CSV Export:

- Added "Net Fare" and "Platform Fee" columns to CSV export

#### Updated Calculations:

- `recomputeRentPaidAmount()` now includes platform fee
- `getPaymentPreviewMessage()` includes platform fee in calculations
- Auto-recalculation triggers when platform fee changes

## User Experience

### For Drivers (SubmitReport):

1. **Net Fare**: Required input field where drivers enter their net fare amount
2. **Platform Fee**: Automatically calculated and displayed (read-only)
3. **Payment Message**: Shows platform fee in the calculation breakdown

### For Admins (AdminReports):

1. **Table View**: Can see net fare and platform fee for all reports
2. **Edit Modal**: Can modify both net fare and platform fee
3. **Auto-calculation**: Rent amount automatically recalculates when platform fee changes
4. **CSV Export**: Includes both fields in exported data

## Key Features

1. **Automatic Calculation**: Platform fee is automatically calculated based on net fare
2. **Admin Override**: Admins can manually adjust platform fee if needed
3. **User Restriction**: Users cannot edit platform fee (it's calculated automatically)
4. **Real-time Updates**: All calculations update in real-time when values change
5. **Export Support**: New fields are included in CSV exports
6. **Backward Compatibility**: Existing reports default to 0 for both fields

## Example Calculations

### Example 1:

- Net Fare: ₹2,500
- Platform Fee: ₹350 (auto-calculated - 14% of ₹2,500)
- Total Earnings: ₹3,000
- Toll: ₹50
- Cash Collected: ₹500
- Rent: ₹535
- **Final Amount**: ₹3,000 + ₹70 - ₹500 - ₹535 - ₹350 = ₹1,685 (Tawaaq pays)

### Example 2:

- Net Fare: ₹2,600
- Platform Fee: ₹364 (auto-calculated - 14% of ₹2,600)
- Total Earnings: ₹3,100
- Toll: ₹50
- Cash Collected: ₹500
- Rent: ₹535
- **Final Amount**: ₹3,100 + ₹70 - ₹500 - ₹535 - ₹364 = ₹1,775 (Tawaaq pays)

## Testing

1. **Submit New Report**: Test with various net fare amounts to verify platform fee calculation
2. **Admin Edit**: Test editing platform fee in admin panel
3. **Export**: Verify new fields appear in CSV export
4. **Calculations**: Verify rent calculations include platform fee correctly

## Future Enhancements

1. **Configurable Rates**: Make platform fee calculation rates configurable via admin settings
2. **Historical Data**: Add platform fee tracking over time
3. **Reports**: Add platform fee analytics and reporting
4. **Notifications**: Alert when platform fee exceeds certain thresholds
