# Bed Assignment Display Fix

## 🐛 Problem Identified

The bed assignment display wasn't working properly - beds were showing as "Available" even when drivers were assigned to them.

## 🔧 Root Cause

The issue was in the `fetchBeds` function where the Supabase query structure wasn't correctly fetching the bed assignments and their associated driver information.

## ✅ Fixes Implemented

### 1. **Fixed Bed Assignment Data Fetching**

**Problem**: Complex nested query wasn't working correctly
**Solution**: Split into two separate queries for better reliability

```typescript
// Before: Complex nested query (not working)
const { data, error } = await supabase.from("beds").select(`
    *,
    morning_assignment:bed_assignments!bed_assignments_bed_id_fkey(
      user:users(id, name)
    ),
    night_assignment:bed_assignments!bed_assignments_bed_id_fkey(
      user:users(id, name)
    )
  `);

// After: Two separate queries (working)
// 1. Get all beds
const { data: bedsData } = await supabase.from("beds").select("*");

// 2. Get all active assignments with user data
const { data: assignmentsData } = await supabase
  .from("bed_assignments")
  .select(
    `
    *,
    user:users(id, name, phone_number),
    bed:beds(id, bed_name, room_id)
  `
  )
  .eq("status", "active")
  .is("end_date", null);
```

### 2. **Improved Data Processing**

**Enhancement**: Better logic to match assignments to beds

```typescript
const processedBeds = (bedsData || []).map((bed) => {
  // Find morning assignment for this bed
  const morningAssignment = assignmentsData?.find(
    (assignment: any) =>
      assignment.bed_id === bed.id &&
      assignment.shift === "morning" &&
      assignment.status === "active" &&
      !assignment.end_date
  );

  // Find night assignment for this bed
  const nightAssignment = assignmentsData?.find(
    (assignment: any) =>
      assignment.bed_id === bed.id &&
      assignment.shift === "night" &&
      assignment.status === "active" &&
      !assignment.end_date
  );

  return {
    ...bed,
    morning_driver: morningAssignment?.user || null,
    night_driver: nightAssignment?.user || null,
  };
});
```

### 3. **Enhanced Visual Status Indicators**

**Added**: Clear status badges and improved visual feedback

```typescript
// New status text function
const getBedStatusText = (bed: Bed) => {
  if (bed.morning_driver && bed.night_driver) {
    return "Fully Occupied";
  } else if (bed.morning_driver || bed.night_driver) {
    return "Partially Occupied";
  } else {
    return "Available";
  }
};
```

**Visual Improvements**:

- ✅ **Status Badges**: "Fully Occupied", "Partially Occupied", "Available"
- ✅ **Color-coded Badges**: Red for fully occupied, default for partially, secondary for available
- ✅ **Better Layout**: Status badge + rent badge side by side

### 4. **Added Debug Logging**

**Enhancement**: Console logging to help troubleshoot assignment issues

```typescript
// Debug logging for first few beds
if (bed.bed_number <= 2) {
  console.log(`Bed ${bed.bed_name}:`, {
    bedId: bed.id,
    morningAssignment: morningAssignment?.user?.name || "None",
    nightAssignment: nightAssignment?.user?.name || "None",
    allAssignments: assignmentsData?.filter((a) => a.bed_id === bed.id),
  });
}
```

### 5. **Fixed Driver Filtering**

**Issue**: Role filter was accidentally removed
**Fix**: Re-added `.eq("role", "driver")` filter

```typescript
const { data, error } = await supabase
  .from("users")
  .select("id, name, phone_number, shift, current_room_id, current_bed_id")
  .eq("role", "driver") // ✅ Re-added role filter
  .eq("online", true)
  .order("name");
```

## 🎯 Expected Results

### **Before Fix**:

```
Room 1 - Bed A
🟡 Morning Shift: Available
🔵 Night Shift: Available
```

### **After Fix**:

```
Room 1 - Bed A                    [Fully Occupied] [₹100/day]
🟡 Morning Shift: John Doe [Unassign]
🔵 Night Shift: Sarah Smith [Unassign]
```

## 🔍 Debug Information

The console will now show:

- Assignment data for the first 2 beds
- All assignments data
- Driver names and assignment details

## 📱 Visual Enhancements

### **Status Badges**:

- 🔴 **Fully Occupied**: Red badge when both shifts are assigned
- 🟡 **Partially Occupied**: Default badge when one shift is assigned
- 🟢 **Available**: Secondary badge when no shifts are assigned

### **Driver Display**:

- **Assigned**: Shows driver name with unassign button
- **Available**: Shows "Available" in italic gray text
- **Color-coded shifts**: Yellow dot for morning, blue dot for night

## 🚀 Benefits

### ✅ **Accurate Display**

- Beds now correctly show assigned driver names
- Status badges provide instant visual feedback
- No more false "Available" status for occupied beds

### ✅ **Better User Experience**

- Clear visual indicators for bed occupancy
- Easy identification of available vs occupied beds
- Consistent status display across all beds

### ✅ **Improved Debugging**

- Console logging helps identify assignment issues
- Better error handling and data validation
- Easier troubleshooting of assignment problems

## 📁 Files Modified

- `/src/components/RoomBedManagement.tsx` - Fixed bed assignment fetching and display

## 🎉 Result

The bed assignment system now correctly displays:

1. ✅ **Driver names** when beds are assigned
2. ✅ **"Available"** only when beds are truly unassigned
3. ✅ **Status badges** showing occupancy level
4. ✅ **Proper filtering** of drivers only
5. ✅ **Debug information** for troubleshooting

The accommodation management system now works as expected! 🏠✅











