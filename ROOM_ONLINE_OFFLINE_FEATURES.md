# Room Online/Offline Management Features

## Overview

I've successfully implemented room online/offline functionality with smart bed assignment filtering. This allows admins to control when rooms are available for driver assignments and automatically filters out fully occupied beds.

## ✅ Features Implemented

### 1. **Room Online/Offline Toggle**

**Location**: Room card headers
**Functionality**:

- ✅ **Toggle Buttons**: Each room has "Go Online" / "Go Offline" button
- ✅ **Status Badges**: Visual indicators showing 🟢 Online or 🔴 Offline
- ✅ **Real-time Updates**: Status changes immediately reflect in the UI
- ✅ **Database Integration**: Updates room status in Supabase

**Visual Design**:

```
┌─────────────────────────────────────────────────┐
│ Room 1                    🟢 Online  [Go Offline] │
│ 5 beds                                         │
└─────────────────────────────────────────────────┘
```

### 2. **Smart Bed Assignment Filtering**

**Location**: Assign Driver dialog
**Functionality**:

- ✅ **Online Rooms Only**: Only shows beds from online rooms
- ✅ **Exclude Fully Occupied**: Hides beds that are fully occupied (both shifts)
- ✅ **Status Indicators**: Shows "(Available)" or "(Partially Occupied)"
- ✅ **Dynamic Updates**: List updates when room status changes

**Example Dropdown**:

```
Room 1 - Bed A (Available)
Room 1 - Bed B (Partially Occupied)
Room 2 - Bed A (Available)
Room 3 - Bed C (Partially Occupied)
```

### 3. **Offline Room Management**

**Location**: Room cards and assignment actions
**Functionality**:

- ✅ **Visual Warning**: Shows "Room is offline - No new assignments allowed"
- ✅ **Disabled Actions**: Unassign buttons are disabled for offline rooms
- ✅ **Dimmed Appearance**: Bed cards have reduced opacity when room is offline
- ✅ **Assignment Prevention**: Main assign button disabled when all rooms offline

**Offline Room Display**:

```
┌─────────────────────────────────────────────────┐
│ Room 1                    🔴 Offline  [Go Online] │
│ ⚠️ Room is offline - No new assignments allowed  │
│ 5 beds                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Bed A (dimmed)                             │ │
│ │ Morning: John Doe [Unassign] (disabled)    │ │
│ │ Night: Available                           │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4. **Enhanced User Experience**

**Improvements**:

- ✅ **Clear Status Indicators**: Color-coded badges and icons
- ✅ **Intuitive Controls**: Easy-to-understand toggle buttons
- ✅ **Contextual Messages**: Helpful text explaining offline status
- ✅ **Consistent Styling**: Matches existing design system

## 🔧 Technical Implementation

### **Database Schema Update**

```sql
-- Updated room status constraint
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
CHECK (status IN ('active', 'maintenance', 'inactive', 'online', 'offline'));

-- Set default status to 'online'
UPDATE rooms SET status = 'online' WHERE status = 'active';
ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'online';
```

### **Room Status Toggle Function**

```typescript
const handleToggleRoomStatus = async (
  roomId: string,
  currentStatus: string
) => {
  const newStatus = currentStatus === "online" ? "offline" : "online";

  const { error } = await supabase
    .from("rooms")
    .update({ status: newStatus })
    .eq("id", roomId);

  if (error) throw error;
  toast.success(
    `Room ${newStatus === "online" ? "activated" : "deactivated"} successfully!`
  );
  fetchData();
};
```

### **Smart Bed Filtering**

```typescript
{
  beds
    .filter((bed) => {
      const room = rooms.find((r) => r.id === bed.room_id);
      // Only show beds from online rooms and not fully occupied
      return (
        room?.status === "online" && !(bed.morning_driver && bed.night_driver)
      );
    })
    .map((bed) => {
      const room = rooms.find((r) => r.id === bed.room_id);
      return (
        <SelectItem key={bed.id} value={bed.id}>
          {room?.room_name} - {bed.bed_name}
          {bed.morning_driver || bed.night_driver
            ? " (Partially Occupied)"
            : " (Available)"}
        </SelectItem>
      );
    });
}
```

## 🎯 Use Cases

### **Maintenance Scenarios**

- **Room Maintenance**: Set room offline during cleaning/repairs
- **Power Outages**: Disable assignments when room has issues
- **Renovations**: Take room offline during construction
- **Emergency Situations**: Quickly disable problematic rooms

### **Operational Control**

- **Gradual Rollout**: Enable rooms one by one
- **Capacity Management**: Control which rooms accept new drivers
- **Shift Management**: Temporarily disable rooms between shifts
- **Quality Control**: Ensure only properly maintained rooms are used

## 📱 User Interface Features

### **Room Status Indicators**

- 🟢 **Online**: Green badge with "Online" text
- 🔴 **Offline**: Gray badge with "Offline" text
- **Toggle Buttons**: "Go Online" / "Go Offline" with appropriate colors

### **Assignment Controls**

- **Smart Filtering**: Only shows assignable beds
- **Status Labels**: Clear indication of bed availability
- **Disabled States**: Prevents actions when inappropriate
- **Visual Feedback**: Dimmed appearance for offline rooms

### **Warning Messages**

- **Offline Notice**: Clear message about assignment restrictions
- **Button States**: Disabled buttons with explanatory text
- **Contextual Help**: Information about why actions are disabled

## 🚀 Benefits

### ✅ **Operational Control**

- **Flexible Management**: Easy room status control
- **Maintenance Support**: Proper offline handling during repairs
- **Quality Assurance**: Ensure only good rooms are used
- **Emergency Response**: Quick room disabling capability

### ✅ **User Experience**

- **Clear Status**: Always know which rooms are available
- **Smart Filtering**: Only see relevant assignment options
- **Intuitive Controls**: Easy-to-use toggle buttons
- **Visual Feedback**: Clear indication of room status

### ✅ **Data Integrity**

- **Prevent Invalid Assignments**: Can't assign to offline rooms
- **Maintain Existing Assignments**: Current drivers unaffected
- **Consistent State**: Status changes reflect everywhere
- **Audit Trail**: All status changes are logged

## 📁 Files Modified

- `/src/components/RoomBedManagement.tsx` - Added room status management
- `/supabase/migrations/20250108000001_update_room_status.sql` - Database schema update

## 🎉 Result

The room management system now provides:

1. ✅ **Complete Room Control**: Online/offline toggle for each room
2. ✅ **Smart Assignment Filtering**: Only shows available beds from online rooms
3. ✅ **Visual Status Indicators**: Clear online/offline status display
4. ✅ **Maintenance Support**: Proper offline room handling
5. ✅ **Enhanced UX**: Intuitive controls and clear feedback

The accommodation management system now offers full operational control with excellent user experience! 🏠🔄✅











