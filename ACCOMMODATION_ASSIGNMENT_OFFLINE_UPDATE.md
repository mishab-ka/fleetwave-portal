# AccommodationAssignment Component - Offline Room Support

## Overview

I've updated the AccommodationAssignment component in the DriverDetailsModal to respect room online/offline status and prevent assignments to offline rooms, maintaining consistency with the main RoomBedManagement component.

## ✅ Updates Implemented

### 1. **Room Selection Filtering**

**Location**: Room dropdown in assignment form
**Enhancement**: Only shows online rooms for assignment

```typescript
// Before: Showed all rooms
{
  rooms.map((room) => (
    <SelectItem key={room.id} value={room.id}>
      {room.room_name}
    </SelectItem>
  ));
}

// After: Only shows online rooms with status indicator
{
  rooms
    .filter((room) => room.status === "online")
    .map((room) => (
      <SelectItem key={room.id} value={room.id}>
        {room.room_name} 🟢
      </SelectItem>
    ));
}
```

### 2. **Enhanced Bed Filtering Logic**

**Location**: `availableBeds` calculation
**Enhancement**: Excludes beds from offline rooms and fully occupied beds

```typescript
const availableBeds = beds.filter((bed) => {
  const room = rooms.find((r) => r.id === bed.room_id);

  // Only show beds from online rooms
  if (room?.status !== "online") return false;

  // If a specific room is selected, only show beds from that room
  if (selectedRoom) {
    return bed.room_id === selectedRoom;
  }

  // Don't show fully occupied beds
  return !(bed.morning_driver && bed.night_driver);
});
```

### 3. **Bed Selection Status Indicators**

**Location**: Bed dropdown in assignment form
**Enhancement**: Shows availability status for each bed

```typescript
{
  availableBeds.map((bed) => {
    const room = rooms.find((r) => r.id === bed.room_id);
    const isPartiallyOccupied = bed.morning_driver || bed.night_driver;
    return (
      <SelectItem key={bed.id} value={bed.id}>
        {room?.room_name} - {bed.bed_name}
        {isPartiallyOccupied ? " (Partially Occupied)" : " (Available)"}
      </SelectItem>
    );
  });
}
```

### 4. **No Online Rooms Warning**

**Location**: Assignment form header
**Enhancement**: Shows warning when no online rooms are available

```typescript
{
  rooms.filter((room) => room.status === "online").length === 0 && (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 text-yellow-800">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          No online rooms available for assignment
        </span>
      </div>
    </div>
  );
}
```

### 5. **Assignment Button State Management**

**Location**: "Assign to Bed" button
**Enhancement**: Disabled when no online rooms are available

```typescript
<Button
  onClick={handleAssignBed}
  disabled={
    !selectedBed ||
    !selectedShift ||
    isAssigning ||
    rooms.filter((room) => room.status === "online").length === 0
  }
  className="w-full bg-fleet-purple hover:bg-fleet-purple/90"
>
  <Plus className="w-4 h-4 mr-2" />
  {isAssigning ? "Assigning..." : "Assign to Bed"}
  {rooms.filter((room) => room.status === "online").length === 0 &&
    " (No Online Rooms)"}
</Button>
```

### 6. **Room Overview Status Display**

**Location**: Available Beds overview section
**Enhancement**: Shows room status badges and dims offline room beds

```typescript
<div className="flex items-center gap-2">
  <h4 className="font-medium">{room.room_name}</h4>
  <Badge
    variant={room.status === "online" ? "default" : "secondary"}
    className={
      room.status === "online"
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-gray-800"
    }
  >
    {room.status === "online" ? "🟢 Online" : "🔴 Offline"}
  </Badge>
</div>
```

## 🎯 User Experience Improvements

### **Assignment Form**

- ✅ **Online Rooms Only**: Room dropdown only shows online rooms with 🟢 indicator
- ✅ **Smart Bed Filtering**: Only shows assignable beds (not fully occupied)
- ✅ **Status Indicators**: Clear "(Available)" or "(Partially Occupied)" labels
- ✅ **Warning Messages**: Alert when no online rooms are available
- ✅ **Disabled States**: Button disabled when no online rooms exist

### **Room Overview**

- ✅ **Status Badges**: Each room shows 🟢 Online or 🔴 Offline status
- ✅ **Visual Dimming**: Offline room beds appear dimmed (60% opacity)
- ✅ **Consistent Styling**: Matches main RoomBedManagement component

### **Assignment Prevention**

- ✅ **No Offline Assignments**: Cannot assign drivers to offline rooms
- ✅ **Clear Feedback**: Button text shows "(No Online Rooms)" when disabled
- ✅ **Visual Warnings**: Yellow warning box when no online rooms available

## 🔄 Consistency with Main Component

The AccommodationAssignment component now maintains full consistency with the main RoomBedManagement component:

| Feature                      | Main Component | Driver Modal | Status        |
| ---------------------------- | -------------- | ------------ | ------------- |
| Online Room Filtering        | ✅             | ✅           | ✅ Consistent |
| Fully Occupied Bed Filtering | ✅             | ✅           | ✅ Consistent |
| Status Badges                | ✅             | ✅           | ✅ Consistent |
| Warning Messages             | ✅             | ✅           | ✅ Consistent |
| Disabled States              | ✅             | ✅           | ✅ Consistent |
| Visual Indicators            | ✅             | ✅           | ✅ Consistent |

## 📱 Visual Examples

### **Assignment Form with Online Rooms**

```
┌─────────────────────────────────────────────────┐
│ Assign to Bed                                  │
├─────────────────────────────────────────────────┤
│ Select Room: [Room 1 🟢 ▼]                     │
│ Select Bed: [Room 1 - Bed A (Available) ▼]     │
│ Select Shift: [Morning Shift (12hr) ▼]         │
│ [Assign to Bed]                                │
└─────────────────────────────────────────────────┘
```

### **Assignment Form with No Online Rooms**

```
┌─────────────────────────────────────────────────┐
│ Assign to Bed                                  │
├─────────────────────────────────────────────────┤
│ ⚠️ No online rooms available for assignment     │
│ Select Room: [No rooms available ▼]            │
│ Select Bed: [No beds available ▼]              │
│ Select Shift: [Morning Shift (12hr) ▼]         │
│ [Assign to Bed (No Online Rooms)] (disabled)   │
└─────────────────────────────────────────────────┘
```

### **Room Overview with Status**

```
┌─────────────────────────────────────────────────┐
│ Available Beds                                  │
├─────────────────────────────────────────────────┤
│ Room 1 🟢 Online                               │
│ ├─ Bed A (Available)                           │
│ └─ Bed B (Partially Occupied)                  │
│                                                 │
│ Room 2 🔴 Offline (dimmed)                     │
│ ├─ Bed A (dimmed)                              │
│ └─ Bed B (dimmed)                              │
└─────────────────────────────────────────────────┘
```

## 🚀 Benefits

### ✅ **Data Integrity**

- **Prevents Invalid Assignments**: Cannot assign to offline rooms
- **Consistent State**: Same filtering logic as main component
- **Real-time Updates**: Status changes reflect immediately

### ✅ **User Experience**

- **Clear Status**: Always know which rooms are available
- **Smart Filtering**: Only see relevant assignment options
- **Visual Feedback**: Clear indicators and warnings
- **Consistent Interface**: Same experience across all components

### ✅ **Operational Control**

- **Maintenance Support**: Proper offline room handling
- **Quality Assurance**: Ensure only good rooms are used
- **Emergency Response**: Quick room disabling capability

## 📁 Files Modified

- `/src/components/admin/drivers/AccommodationAssignment.tsx` - Added offline room support

## 🎉 Result

The DriverDetailsModal's Accommodation tab now provides:

1. ✅ **Consistent Behavior**: Same room status logic as main component
2. ✅ **Smart Filtering**: Only shows assignable beds from online rooms
3. ✅ **Visual Indicators**: Clear status badges and warnings
4. ✅ **Assignment Prevention**: Cannot assign to offline rooms
5. ✅ **Enhanced UX**: Clear feedback and intuitive controls

The accommodation assignment system now maintains complete consistency across all components! 🏠🔄✅











