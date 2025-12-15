# 📅 HR Joining Calendar - Implementation Guide

## Overview

A comprehensive calendar system to track and manage driver joining dates with smart filtering and beautiful UI.

---

## ✨ Features

### 1. **Smart Filters (Default: Tomorrow)**

- **Today** - Shows all joinings scheduled for today
- **Tomorrow** - Shows all joinings scheduled for tomorrow (DEFAULT)
- **This Week** - Shows all joinings for the current week
- **This Month** - Shows all joinings for the current month

### 2. **Stats Dashboard**

Four interactive stat cards showing:

- **Today**: Count of today's joinings (Green gradient)
- **Tomorrow**: Count of tomorrow's joinings (Blue gradient) - DEFAULT VIEW
- **This Week**: Count of this week's joinings (Purple gradient)
- **This Month**: Count of this month's joinings (Orange gradient)

Click any card to filter the events!

### 3. **Event Display**

Each event shows:

- **Driver Name**
- **Phone Number** (clickable to call)
- **Status Badge** (with color coding and icons)
- **Assigned Staff**
- **Source** (WhatsApp, Facebook, Instagram, etc.)
- **Joining Time**

### 4. **Date Grouping**

Events are grouped by date with:

- **Date Badge** (day number in gradient circle)
- **Day Name** (e.g., "Monday")
- **Full Date** (e.g., "January 15, 2025")
- **Count Badge** (number of joinings on that date)

---

## 🎨 UI Design

### Color Scheme

**Status Colors:**

- `new` - Blue (🔵)
- `contacted` - Yellow (🟡)
- `hot_lead` - Red (🔴)
- `cold_lead` - Gray (⚪)
- `callback` - Purple (🟣)
- `joined` - Green (🟢) with CheckCircle icon
- `not_interested` - Gray (⚫) with XCircle icon

**Filter Cards:**

- Today: Green gradient (`from-green-500 to-green-600`)
- Tomorrow: Blue gradient (`from-blue-500 to-blue-600`)
- This Week: Purple gradient (`from-purple-500 to-purple-600`)
- This Month: Orange gradient (`from-orange-500 to-orange-600`)

### Layout

```
┌─────────────────────────────────────────────┐
│  📅 Joining Calendar                        │
│  Track upcoming driver joining dates        │
└─────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│  Today   │ Tomorrow │This Week │This Month│
│    5     │    12    │    28    │    45    │
│  [Green] │  [Blue]  │ [Purple] │ [Orange] │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────┐
│  Tomorrow (12)                    [Refresh] │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ 15 ─┐  Monday                          │
│  │ Jan  │  January 15, 2025        3 join. │
│  └──────┘                                   │
│                                             │
│    ┌───────────────────────────────────┐   │
│    │ Rajesh Kumar          [Hot Lead]  │   │
│    │ Phone: +919876543210              │   │
│    │ Staff: John Doe                   │   │
│    │ Source: WhatsApp         9:00 AM  │   │
│    └───────────────────────────────────┘   │
│                                             │
│    ┌───────────────────────────────────┐   │
│    │ Amit Singh            [Callback]  │   │
│    │ Phone: +918765432109              │   │
│    │ Staff: Jane Smith                 │   │
│    │ Source: Facebook        10:30 AM  │   │
│    └───────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Component: `HRJoiningCalendar.tsx`

**Location:** `/Users/mishabka/Tawaaq/fleetwave-portal/src/components/HRJoiningCalendar.tsx`

### Key Functions

#### 1. **fetchJoiningEvents()**

```typescript
const fetchJoiningEvents = async () => {
  const { data: leads, error } = await supabase
    .from("hr_leads")
    .select(
      `
      id,
      name,
      phone_number,
      joining_date,
      status,
      source,
      assigned_staff_user_id,
      users:assigned_staff_user_id (name)
    `
    )
    .not("joining_date", "is", null)
    .order("joining_date", { ascending: true });
};
```

**Fetches:**

- All leads with joining dates
- Includes staff name via join
- Orders by joining date (earliest first)

#### 2. **calculateStats()**

```typescript
const calculateStats = (allEvents: JoiningEvent[]) => {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = startOfDay(addDays(now, 1));
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Count events for each period
  allEvents.forEach((event) => {
    const eventDate = parseISO(event.joining_date);

    if (isSameDay(eventDate, today)) stats.today++;
    if (isSameDay(eventDate, tomorrow)) stats.tomorrow++;
    if (isWithinInterval(eventDate, { start: weekStart, end: weekEnd }))
      stats.thisWeek++;
    if (isWithinInterval(eventDate, { start: monthStart, end: monthEnd }))
      stats.thisMonth++;
  });
};
```

**Calculates:**

- Today's count
- Tomorrow's count
- This week's count
- This month's count

#### 3. **applyFilter()**

```typescript
const applyFilter = () => {
  const now = new Date();
  let filtered: JoiningEvent[] = [];

  switch (activeFilter) {
    case "today":
      filtered = events.filter((event) =>
        isSameDay(parseISO(event.joining_date), startOfDay(now))
      );
      break;
    case "tomorrow":
      filtered = events.filter((event) =>
        isSameDay(parseISO(event.joining_date), startOfDay(addDays(now, 1)))
      );
      break;
    case "this_week":
      filtered = events.filter((event) =>
        isWithinInterval(parseISO(event.joining_date), {
          start: startOfWeek(now),
          end: endOfWeek(now),
        })
      );
      break;
    case "this_month":
      filtered = events.filter((event) =>
        isWithinInterval(parseISO(event.joining_date), {
          start: startOfMonth(now),
          end: endOfMonth(now),
        })
      );
      break;
  }

  // Sort by date
  filtered.sort(
    (a, b) =>
      parseISO(a.joining_date).getTime() - parseISO(b.joining_date).getTime()
  );

  setFilteredEvents(filtered);
};
```

**Filters events based on:**

- Selected time period
- Sorts by date (earliest first)

#### 4. **groupEventsByDate()**

```typescript
const groupEventsByDate = () => {
  const grouped: Record<string, JoiningEvent[]> = {};

  filteredEvents.forEach((event) => {
    const dateKey = format(parseISO(event.joining_date), "yyyy-MM-dd");
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });

  return grouped;
};
```

**Groups events by:**

- Date (YYYY-MM-DD format)
- Returns object with date as key, events array as value

---

## 📱 Integration

### Mobile View

**File:** `HRMobileView.tsx`

```typescript
import HRJoiningCalendar from "./HRJoiningCalendar";

// In the calendar tab:
{
  activeTab === "calendar" && (
    <div className="pb-4">
      <HRJoiningCalendar />
    </div>
  );
}
```

### Desktop View

**File:** `HRDashboard.tsx`

```typescript
import HRJoiningCalendar from "@/components/HRJoiningCalendar";

// In the calendar tab:
{
  activeTab === "calendar" && (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <HRJoiningCalendar />
    </div>
  );
}
```

---

## 🎯 User Flow

### For HR Staff

1. **Open HR Dashboard**
2. **Click "Calendar" tab** (bottom navigation on mobile, sidebar on desktop)
3. **View Tomorrow's joinings** (default)
4. **Click other filter cards** to see Today, This Week, or This Month
5. **Scroll through events** grouped by date
6. **Click phone numbers** to call drivers
7. **See status and staff assignments** at a glance

---

## 📊 Data Structure

### JoiningEvent Interface

```typescript
interface JoiningEvent {
  id: string; // Lead ID
  name: string; // Driver name
  phone_number: string; // Phone number
  joining_date: string; // ISO date string
  status: string; // Lead status
  source: string; // Lead source
  assigned_staff_user_id: string; // Staff ID
  staff_name?: string; // Staff name (from join)
}
```

### Filter Types

```typescript
type FilterType = "today" | "tomorrow" | "this_week" | "this_month";
```

---

## 🔍 Database Query

### Main Query

```sql
SELECT
  hr_leads.id,
  hr_leads.name,
  hr_leads.phone_number,
  hr_leads.joining_date,
  hr_leads.status,
  hr_leads.source,
  hr_leads.assigned_staff_user_id,
  users.name as staff_name
FROM hr_leads
LEFT JOIN users ON users.id = hr_leads.assigned_staff_user_id
WHERE hr_leads.joining_date IS NOT NULL
ORDER BY hr_leads.joining_date ASC;
```

---

## 🎨 Styling Classes

### Stat Cards

```typescript
// Active card
"ring-2 ring-purple-500 shadow-lg";

// Hover effect
"hover:shadow-md transition-all";

// Gradient backgrounds
"bg-gradient-to-br from-green-500 to-green-600";
"bg-gradient-to-br from-blue-500 to-blue-600";
"bg-gradient-to-br from-purple-500 to-purple-600";
"bg-gradient-to-br from-orange-500 to-orange-600";
```

### Event Cards

```typescript
// Card with left border
"border-l-4 border-l-purple-500";

// Hover effect
"hover:shadow-md transition-all";

// Status badges
"bg-blue-100 text-blue-800 border-blue-200"; // new
"bg-green-100 text-green-800 border-green-200"; // joined
"bg-red-100 text-red-800 border-red-200"; // hot_lead
```

### Date Headers

```typescript
// Date circle
"w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl";

// Border
"border-b-2 border-purple-200";
```

---

## 🚀 Features Breakdown

### 1. Default Filter: Tomorrow

```typescript
const [activeFilter, setActiveFilter] = useState<FilterType>("tomorrow");
```

**Why Tomorrow?**

- Most relevant for planning
- Shows upcoming joinings
- Helps staff prepare

### 2. Interactive Stats Cards

```typescript
<Card
  className={`cursor-pointer transition-all ${
    activeFilter === "tomorrow"
      ? "ring-2 ring-blue-500 shadow-lg"
      : "hover:shadow-md"
  }`}
  onClick={() => setActiveFilter("tomorrow")}
>
```

**Features:**

- Click to filter
- Visual feedback (ring on active)
- Hover effects
- Gradient icons

### 3. Date Grouping

```typescript
{
  Object.entries(groupedEvents).map(([date, dayEvents]) => (
    <div key={date}>
      {/* Date header */}
      {/* Events for this date */}
    </div>
  ));
}
```

**Benefits:**

- Easy to scan
- Clear organization
- Shows count per date

### 4. Scrollable Area

```typescript
<ScrollArea className="h-[600px] pr-4">
```

**Features:**

- Fixed height
- Smooth scrolling
- Padding for scrollbar

---

## 📝 Empty States

### No Events

```typescript
{filteredEvents.length === 0 ? (
  <div className="text-center py-12">
    <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-500 text-lg">
      No joining dates for {getFilterLabel(activeFilter).toLowerCase()}
    </p>
  </div>
) : (
  // Show events
)}
```

### Loading State

```typescript
{loading ? (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
  </div>
) : (
  // Show content
)}
```

---

## 🎯 Use Cases

### 1. Daily Planning

**Scenario:** HR staff wants to see who's joining today

**Action:**

1. Open calendar
2. Click "Today" card
3. View all today's joinings
4. Call drivers to confirm

### 2. Weekly Overview

**Scenario:** HR manager wants to see this week's joinings

**Action:**

1. Open calendar
2. Click "This Week" card
3. View all week's joinings grouped by date
4. Assign staff if needed

### 3. Monthly Planning

**Scenario:** Admin wants to see monthly joining trends

**Action:**

1. Open calendar
2. Click "This Month" card
3. View all month's joinings
4. Analyze patterns

---

## 🔄 Real-time Updates

### Refresh Button

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={fetchJoiningEvents}
  disabled={loading}
>
  {loading ? "Loading..." : "Refresh"}
</Button>
```

**Features:**

- Manual refresh
- Loading state
- Disabled while loading

---

## 📊 Stats Summary

### Example Data

```
Today: 5 joinings
Tomorrow: 12 joinings (DEFAULT VIEW)
This Week: 28 joinings
This Month: 45 joinings
```

### Calculation Logic

- **Today:** `isSameDay(eventDate, today)`
- **Tomorrow:** `isSameDay(eventDate, tomorrow)`
- **This Week:** `isWithinInterval(eventDate, { start: weekStart, end: weekEnd })`
- **This Month:** `isWithinInterval(eventDate, { start: monthStart, end: monthEnd })`

---

## ✅ Testing Checklist

- [x] Calendar loads with tomorrow as default filter
- [x] Stats cards show correct counts
- [x] Clicking stat cards changes filter
- [x] Events are grouped by date
- [x] Phone numbers are clickable
- [x] Status badges show correct colors
- [x] Staff names display correctly
- [x] Empty state shows when no events
- [x] Loading state shows during fetch
- [x] Refresh button works
- [x] Mobile responsive
- [x] Desktop layout works
- [x] Scrolling works smoothly

---

## 🎉 Summary

**What's Implemented:**

✅ **Joining Calendar Component** - Complete calendar for tracking driver joining dates
✅ **Smart Filters** - Today, Tomorrow (default), This Week, This Month
✅ **Interactive Stats Cards** - Click to filter, visual feedback
✅ **Date Grouping** - Events grouped by date with headers
✅ **Status Display** - Color-coded badges with icons
✅ **Staff Assignment** - Shows assigned staff for each lead
✅ **Phone Integration** - Clickable phone numbers
✅ **Source Tracking** - Shows lead source (WhatsApp, Facebook, etc.)
✅ **Mobile Integration** - Works in mobile view
✅ **Desktop Integration** - Works in desktop view
✅ **Empty States** - Helpful messages when no data
✅ **Loading States** - Smooth loading experience
✅ **Refresh Functionality** - Manual refresh button

---

**Status:** ✅ **FULLY IMPLEMENTED**

The HR Joining Calendar is now live and ready to use! 🚀

**Default View:** Tomorrow's joinings
**Access:** Both mobile and desktop HR dashboard
**Users:** All HR staff and managers

