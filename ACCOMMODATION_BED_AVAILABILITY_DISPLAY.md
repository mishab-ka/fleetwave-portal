# AccommodationAssignment - Enhanced Bed Availability Display

## Overview

I've enhanced the AccommodationAssignment component in the DriverDetailsModal to provide a comprehensive view of bed availability, showing which beds are available, partially occupied, or fully occupied with clear driver names and visual indicators.

## ✅ Enhancements Implemented

### 1. **Enhanced Header and Description**

**Location**: Bed Availability Overview section
**Enhancement**: Added clear title and description

```typescript
<CardHeader>
  <CardTitle className="flex items-center gap-2">
    <Bed className="h-5 w-5" />
    Bed Availability Overview
  </CardTitle>
  <CardDescription>
    View all beds and their current occupancy status
  </CardDescription>
</CardHeader>
```

### 2. **Availability Summary Dashboard**

**Location**: Top of bed overview section
**Enhancement**: Shows real-time statistics of bed availability

```typescript
{
  /* Availability Summary */
}
<div className="mb-6 p-4 bg-gray-50 rounded-lg">
  <h4 className="font-medium mb-3">Availability Summary</h4>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div className="text-center">
      <div className="text-2xl font-bold text-green-600">
        {beds.filter((bed) => !bed.morning_driver && !bed.night_driver).length}
      </div>
      <div className="text-gray-600">Fully Available</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-yellow-600">
        {
          beds.filter(
            (bed) =>
              (bed.morning_driver && !bed.night_driver) ||
              (!bed.morning_driver && bed.night_driver)
          ).length
        }
      </div>
      <div className="text-gray-600">Partially Occupied</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-red-600">
        {beds.filter((bed) => bed.morning_driver && bed.night_driver).length}
      </div>
      <div className="text-gray-600">Fully Occupied</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-600">
        {rooms.filter((room) => room.status === "online").length}
      </div>
      <div className="text-gray-600">Online Rooms</div>
    </div>
  </div>
</div>;
```

### 3. **Quick Assignment Information**

**Location**: Between summary and bed grid
**Enhancement**: Shows which driver is being assigned

```typescript
{
  /* Quick Assignment Info */
}
{
  !currentAssignment && (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 text-blue-800">
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">Assigning: {driverName}</span>
      </div>
      <p className="text-xs text-blue-600 mt-1">
        Select a room and bed above to assign this driver to accommodation
      </p>
    </div>
  );
}
```

### 4. **Enhanced Bed Display**

**Location**: Individual bed cards
**Enhancement**: Clear status badges and improved driver name display

```typescript
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    {getBedStatusIcon(bed)}
    <span className="font-medium">{bed.bed_name}</span>
  </div>
  <div className="flex gap-1">
    <Badge
      variant={
        bed.morning_driver && bed.night_driver
          ? "destructive"
          : bed.morning_driver || bed.night_driver
          ? "default"
          : "secondary"
      }
      className="text-xs"
    >
      {bed.morning_driver && bed.night_driver
        ? "Fully Occupied"
        : bed.morning_driver || bed.night_driver
        ? "Partially Occupied"
        : "Available"}
    </Badge>
    <Badge variant="outline" className="text-xs">
      ₹{bed.daily_rent}/day
    </Badge>
  </div>
</div>
```

### 5. **Detailed Shift Information**

**Location**: Bed shift details
**Enhancement**: Color-coded shift indicators with clear availability status

```typescript
<div className="text-xs mt-2 space-y-1">
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
      Morning:
    </span>
    <span
      className={
        bed.morning_driver
          ? "font-medium text-gray-900"
          : "text-green-600 font-medium"
      }
    >
      {bed.morning_driver?.name || "✅ Available"}
    </span>
  </div>
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
      Night:
    </span>
    <span
      className={
        bed.night_driver
          ? "font-medium text-gray-900"
          : "text-green-600 font-medium"
      }
    >
      {bed.night_driver?.name || "✅ Available"}
    </span>
  </div>
</div>
```

## 🎯 User Experience

### **Availability Summary Dashboard**

```
┌─────────────────────────────────────────────────┐
│ Availability Summary                            │
├─────────────────────────────────────────────────┤
│  🟢 8        🟡 4        🔴 2        🔵 5      │
│ Fully Avail  Partially   Fully      Online     │
│              Occupied    Occupied   Rooms      │
└─────────────────────────────────────────────────┘
```

### **Quick Assignment Info**

```
┌─────────────────────────────────────────────────┐
│ 👤 Assigning: John Doe                         │
│ Select a room and bed above to assign this     │
│ driver to accommodation                         │
└─────────────────────────────────────────────────┘
```

### **Enhanced Bed Display**

```
┌─────────────────────────────────────────────────┐
│ Room 1 🟢 Online                               │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🟢 Bed A                    [Available] ₹100│ │
│ │ 🟡 Morning: ✅ Available                    │ │
│ │ 🔵 Night: ✅ Available                      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🟡 Bed B              [Partially Occupied] │ │
│ │ 🟡 Morning: John Doe                       │ │
│ │ 🔵 Night: ✅ Available                     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔴 Bed C                [Fully Occupied]   │ │
│ │ 🟡 Morning: Mike Smith                     │ │
│ │ 🔵 Night: Sarah Johnson                    │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 🔧 Technical Features

### **Real-time Statistics**

- **Fully Available**: Beds with no drivers assigned
- **Partially Occupied**: Beds with one driver (morning or night)
- **Fully Occupied**: Beds with both morning and night drivers
- **Online Rooms**: Rooms available for new assignments

### **Visual Indicators**

- **Color-coded Badges**: Green (Available), Yellow (Partially), Red (Fully Occupied)
- **Shift Dots**: Yellow for morning, blue for night
- **Status Icons**: CheckCircle (Fully), Clock (Partially), AlertCircle (Available)
- **Availability Text**: "✅ Available" in green for empty shifts

### **Smart Filtering**

- **Online Rooms Only**: Only shows beds from online rooms in assignment dropdown
- **Exclude Fully Occupied**: Hides fully occupied beds from assignment options
- **Status-aware Display**: Dims offline room beds

## 📱 Benefits

### ✅ **Complete Visibility**

- **At-a-glance Overview**: See all bed availability in one place
- **Real-time Statistics**: Know exactly how many beds are available
- **Driver Names**: See exactly who is assigned to each bed and shift
- **Room Status**: Know which rooms are online/offline

### ✅ **Enhanced Assignment Process**

- **Clear Guidance**: Know which driver is being assigned
- **Visual Clarity**: Easy to identify available beds
- **Status Awareness**: Understand occupancy levels at a glance
- **Quick Reference**: No need to guess availability

### ✅ **Improved Management**

- **Capacity Planning**: See how many beds are available
- **Occupancy Tracking**: Monitor bed utilization
- **Room Management**: Know which rooms are operational
- **Driver Assignment**: Make informed assignment decisions

## 🔄 Integration with Existing Features

### **Assignment Form**

- **Consistent Filtering**: Same logic as main assignment form
- **Status Indicators**: Matches main component styling
- **Real-time Updates**: Changes reflect immediately

### **Room Management**

- **Online/Offline Status**: Respects room status settings
- **Visual Consistency**: Matches main room management interface
- **Status Badges**: Same color coding and styling

## 📁 Files Modified

- `/src/components/admin/drivers/AccommodationAssignment.tsx` - Enhanced bed availability display

## 🎉 Result

The AccommodationAssignment component now provides:

1. ✅ **Complete Bed Visibility**: See all beds and their occupancy status
2. ✅ **Real-time Statistics**: Know exactly how many beds are available
3. ✅ **Driver Names**: See exactly who is assigned to each bed and shift
4. ✅ **Visual Clarity**: Clear color coding and status indicators
5. ✅ **Assignment Guidance**: Know which driver is being assigned
6. ✅ **Room Status**: See which rooms are online/offline

The accommodation assignment system now provides complete visibility of bed availability with clear driver information! 🏠👥✅











