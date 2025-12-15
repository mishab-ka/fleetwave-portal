# MonthlyRentDashboard - Enhanced Rent Calculation & Bed Occupancy Tracking

## Overview

I've enhanced the MonthlyRentDashboard to provide comprehensive rent calculations based on driver reports (₹100 per report) with detailed bed occupancy tracking and room allocation information.

## ✅ Enhancements Implemented

### 1. **Enhanced Data Fetching**

**Location**: `fetchDriverRentData` function
**Enhancement**: Fixed database queries to properly fetch room and bed assignments

```typescript
// Get driver reports with room/bed info
const { data: driverReports, error } = await supabase
  .from("fleet_reports")
  .select(
    `
    user_id,
    driver_name,
    rent_date,
    users!inner(
      id,
      name,
      phone_number,
      current_room_id,
      current_bed_id,
      current_shift,
      current_bed_assignment:bed_assignments!bed_assignments_user_id_fkey(
        bed:beds(
          bed_name,
          room:rooms(
            room_number,
            room_name
          )
        ),
        shift
      )
    )
  `
  )
  .gte("rent_date", startOfMonth.toISOString().split("T")[0])
  .lte("rent_date", endOfMonth.toISOString().split("T")[0])
  .eq("users.current_bed_assignment.status", "active")
  .is("users.current_bed_assignment.end_date", null);
```

### 2. **Improved Monthly Summary Calculation**

**Location**: `fetchMonthlySummary` function
**Enhancement**: Better bed occupancy tracking and rent calculations

```typescript
// Get current bed assignments (active assignments)
const { data: assignments, error: assignmentsError } = await supabase
  .from("bed_assignments")
  .select(
    `
    user_id,
    bed_id,
    shift,
    bed:beds(
      bed_name,
      room:rooms(
        room_number,
        room_name
      )
    )
  `
  )
  .eq("status", "active")
  .is("end_date", null);

// Calculate occupied beds (beds with at least one active assignment)
const occupiedBedIds = new Set(assignments?.map((a) => a.bed_id) || []);
const totalBeds = allBeds?.length || 30; // Default to 30 if query fails
const occupiedBeds = occupiedBedIds.size;
```

### 3. **Rent Calculation Details Section**

**Location**: Summary view
**Enhancement**: Added detailed rent structure and bed utilization breakdown

```typescript
{
  /* Rent Calculation Details */
}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <DollarSign className="h-5 w-5" />
      Rent Calculation Details
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Rent Structure</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Cost per Report:</span>
            <span className="font-medium">₹100</span>
          </div>
          <div className="flex justify-between">
            <span>Total Reports Submitted:</span>
            <span className="font-medium">
              {currentMonthData?.total_reports || 0}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Total Rent Collected:</span>
            <span className="font-bold text-green-600">
              ₹{currentMonthData?.total_rent || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Bed Space Utilization</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total Bed Spaces:</span>
            <span className="font-medium">30</span>
          </div>
          <div className="flex justify-between">
            <span>Occupied Bed Spaces:</span>
            <span className="font-medium text-orange-600">
              {currentMonthData?.occupied_beds || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Available Bed Spaces:</span>
            <span className="font-medium text-green-600">
              {30 - (currentMonthData?.occupied_beds || 0)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Revenue per Bed:</span>
            <span className="font-bold text-blue-600">
              ₹{currentMonthData?.revenue_per_bed?.toFixed(0) || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>;
```

### 4. **Driver Summary Cards**

**Location**: Driver details view
**Enhancement**: Added summary statistics for driver data

```typescript
{
  /* Driver Summary */
}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <Card>
    <CardContent className="p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600">Total Drivers</p>
        <p className="text-2xl font-bold text-fleet-purple">
          {driverData.length}
        </p>
      </div>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600">Assigned Drivers</p>
        <p className="text-2xl font-bold text-green-600">
          {driverData.filter((d) => d.room_number > 0).length}
        </p>
      </div>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600">Total Reports</p>
        <p className="text-2xl font-bold text-blue-600">
          {driverData.reduce((sum, d) => sum + d.reports_count, 0)}
        </p>
      </div>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600">Total Rent</p>
        <p className="text-2xl font-bold text-green-600">
          ₹{driverData.reduce((sum, d) => sum + d.total_rent, 0)}
        </p>
      </div>
    </CardContent>
  </Card>
</div>;
```

### 5. **Enhanced Driver Table Display**

**Location**: Driver details table
**Enhancement**: Better handling of unassigned drivers

```typescript
<td className="py-3 px-4">
  {driver.room_number > 0 ? (
    <Badge variant="outline">
      Room {driver.room_number}
    </Badge>
  ) : (
    <span className="text-gray-500 italic">Not Assigned</span>
  )}
</td>
<td className="py-3 px-4">
  {driver.bed_name !== "Not Assigned" ? (
    <span className="font-medium">{driver.bed_name}</span>
  ) : (
    <span className="text-gray-500 italic">Not Assigned</span>
  )}
</td>
```

## 🎯 User Experience

### **Summary View - Rent Calculation Details**

```
┌─────────────────────────────────────────────────┐
│ 💰 Rent Calculation Details                    │
├─────────────────────────────────────────────────┤
│ Rent Structure          │ Bed Space Utilization │
│ ──────────────────────  │ ────────────────────── │
│ Cost per Report: ₹100   │ Total Bed Spaces: 30   │
│ Total Reports: 45       │ Occupied: 12           │
│ Total Rent: ₹4,500      │ Available: 18          │
│                         │ Revenue per Bed: ₹375  │
└─────────────────────────────────────────────────┘
```

### **Driver Details View - Summary Cards**

```
┌─────────────────────────────────────────────────┐
│ 👥 15    🏠 12    📊 45    💰 ₹4,500          │
│ Total    Assigned  Total    Total              │
│ Drivers  Drivers   Reports  Rent               │
└─────────────────────────────────────────────────┘
```

### **Enhanced Driver Table**

```
┌─────────────────────────────────────────────────┐
│ Driver    │ Phone    │ Room      │ Bed    │ ... │
├─────────────────────────────────────────────────┤
│ John Doe  │ 123456   │ Room 1    │ Bed A  │ ... │
│ Mike      │ 789012   │ Not       │ Not    │ ... │
│           │          │ Assigned  │ Assigned│     │
└─────────────────────────────────────────────────┘
```

## 🔧 Technical Features

### **Report-Based Rent Calculation**

- **₹100 per Report**: Each submitted report costs ₹100
- **Monthly Aggregation**: Sum of all reports in selected month
- **Driver Tracking**: Individual driver report counts and rent totals
- **Real-time Updates**: Data refreshes when month selection changes

### **Bed Occupancy Tracking**

- **Active Assignments**: Only counts current active bed assignments
- **Room Information**: Shows room number and name for each driver
- **Bed Details**: Displays specific bed name and shift information
- **Availability Status**: Clear indication of assigned vs unassigned drivers

### **Enhanced Data Queries**

- **Nested Relationships**: Properly fetches bed → room relationships
- **Active Filtering**: Only includes active bed assignments
- **Error Handling**: Graceful fallbacks for missing data
- **Type Safety**: Fixed TypeScript errors with proper typing

### **Visual Improvements**

- **Color Coding**: Green for positive metrics, orange for occupancy
- **Status Indicators**: Clear badges for room assignments
- **Summary Cards**: Quick overview of key metrics
- **Responsive Design**: Works on all screen sizes

## 📊 Key Metrics Displayed

### **Summary View**

- **Total Reports**: Count of all reports submitted in the month
- **Total Rent**: Total rent collected (reports × ₹100)
- **Active Drivers**: Number of drivers who submitted reports
- **Revenue per Bed**: Average revenue per occupied bed space
- **Occupancy Rate**: Percentage of bed spaces occupied

### **Driver Details View**

- **Total Drivers**: All drivers in the system
- **Assigned Drivers**: Drivers with room/bed assignments
- **Total Reports**: Sum of all driver reports
- **Total Rent**: Sum of all driver rent payments
- **Individual Details**: Per-driver breakdown with room/bed info

## 🎉 Benefits

### ✅ **Complete Rent Visibility**

- **Report-Based Calculation**: Clear ₹100 per report structure
- **Monthly Tracking**: See rent collection trends over time
- **Driver Breakdown**: Individual driver rent contributions
- **Bed Utilization**: Understand space usage efficiency

### ✅ **Enhanced Management**

- **Occupancy Insights**: Know which beds are generating revenue
- **Driver Assignment Status**: See who has accommodation
- **Revenue Analysis**: Track rent collection performance
- **Capacity Planning**: Understand bed space utilization

### ✅ **Improved Data Accuracy**

- **Active Assignment Tracking**: Only current assignments counted
- **Proper Relationships**: Correct room/bed data display
- **Error Handling**: Graceful handling of missing data
- **Real-time Updates**: Fresh data on month selection

## 📁 Files Modified

- `/src/components/MonthlyRentDashboard.tsx` - Enhanced rent calculation and bed occupancy tracking

## 🎯 Result

The MonthlyRentDashboard now provides:

1. ✅ **Accurate Rent Calculations**: ₹100 per report with proper aggregation
2. ✅ **Bed Occupancy Tracking**: Real-time bed space utilization
3. ✅ **Driver Assignment Status**: Clear room and bed information
4. ✅ **Revenue Analysis**: Comprehensive rent collection insights
5. ✅ **Enhanced UI**: Better visual presentation and data organization
6. ✅ **Error-Free Operation**: Fixed database queries and TypeScript issues

The monthly rent dashboard now provides complete visibility into rent collection based on driver reports with detailed bed occupancy tracking! 💰🏠✅











