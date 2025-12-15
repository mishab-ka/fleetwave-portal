# 📱 BUILD HR MOBILE APP - Complete Cursor AI Prompt

## 🎯 Project Overview

Build a React Native mobile application for an HR Management System with **role-based access** for HR Staff and HR Managers. The app connects to a Supabase backend.

---

## 📋 Core Requirements

### Technology Stack

- **Framework**: React Native (with React Navigation)
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: React Context API or Zustand
- **UI Library**: React Native Paper or Native Base
- **HTTP Client**: Supabase JS Client

### App Structure

```
Login Screen
     ↓
Role Check (users.role)
     ↓
  ┌──────┴──────┐
  ▼             ▼
HR Staff      HR Manager
Portal        Portal
```

---

## 🔐 Authentication Flow

### Login Process

1. User enters email and password
2. Authenticate with Supabase Auth
3. Fetch user role from `users` table
4. Route based on role:
   - `hr_staff` → HR Staff Portal
   - `hr_manager` or `admin` → HR Manager Portal
5. Store user session securely

### Required API

```javascript
// Supabase Configuration
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

// Login Function
async function login(email, password) {
  // 1. Auth
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 2. Get user role
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, role, phone")
    .eq("id", authData.user.id)
    .single();

  // 3. Validate role
  if (!["hr_staff", "hr_manager", "admin"].includes(user.role)) {
    throw new Error("Access denied");
  }

  return user;
}
```

---

## 👤 HR STAFF PORTAL

### Navigation Structure

```
Bottom Tab Navigator:
├─ Home (Dashboard)
├─ My Leads
├─ Performance
└─ Profile
```

### 1. HOME/DASHBOARD Screen

**Features Required:**

- Clock In/Out button with timer
- Today's stats cards:
  - Total Calls
  - Leads Joined
  - Hot Leads
  - Conversion Rate
- Daily target progress bar
- Quick action buttons

**APIs to Use:**

```javascript
// Get today's stats
GET hr_staff_daily_stats
WHERE staff_user_id = [user.id]
AND date = TODAY

// Clock in
INSERT hr_staff_attendance
{ staff_user_id, clock_in_time, is_active: true }

// Clock out
UPDATE hr_staff_attendance
SET clock_out_time, total_work_duration_seconds, is_active: false
WHERE staff_user_id = [user.id] AND is_active = true
```

### 2. MY LEADS Screen

**Features Required:**

- Search bar
- Filter by status dropdown
- Lead list with cards showing:
  - Name
  - Phone number (with Call button)
  - Status badge (colored)
  - Source
  - Callback date (if exists)
  - WhatsApp button
- Pull to refresh
- Tap to open Call Tracking screen

**APIs to Use:**

```javascript
// Get my leads
GET hr_leads
WHERE assigned_staff_user_id = [user.id]
ORDER BY created_at DESC

// With filters
WHERE status = [selected_status]
AND (name ILIKE '%search%' OR phone ILIKE '%search%')
```

### 3. CALL TRACKING Screen (Modal/Fullscreen)

**Features Required:**

- Call timer (starts automatically)
- Pause/Resume timer button
- Form fields:
  - Name (text input)
  - Phone (text input)
  - Status (dropdown from hr_lead_statuses)
  - Source (dropdown: WhatsApp, Facebook, Instagram, Referral)
  - Called Date (auto-filled with today)
  - Callback Date (optional date picker)
  - Joining Date (optional date picker)
  - Notes (text area)
- Save button
- Form validation

**APIs to Use:**

```javascript
// Get statuses
GET hr_lead_statuses
WHERE is_active = true

// Save call
INSERT hr_call_tracking
{
  lead_id,
  staff_user_id,
  name,
  phone,
  status,
  called_date,
  callback_date,
  joining_date,
  notes,
  source,
  call_duration
}

// Update lead
UPDATE hr_leads
SET status, joining_date, callback_date
WHERE id = [lead_id]

// Aggregate daily stats
RPC aggregate_daily_stats(staff_user_id, date)
```

### 4. PERFORMANCE Screen

**Features Required:**

- Time period tabs (Today, Week, Month)
- Performance metric cards:
  - Total Calls
  - Successful Calls
  - Leads Joined
  - Conversion Rate
- Status breakdown with progress bars
- Daily performance chart (line or bar chart)

**APIs to Use:**

```javascript
// Get daily history
GET hr_staff_daily_stats
WHERE staff_user_id = [user.id]
AND date >= [start_date]
ORDER BY date DESC
```

### 5. PROFILE Screen

**Features Required:**

- Profile photo
- User info (name, email, role)
- Settings toggles:
  - Email notifications
  - Push notifications
- Change password button
- About button
- Logout button

---

## 👔 HR MANAGER PORTAL

### Navigation Structure

```
Bottom Tab Navigator:
├─ Dashboard
├─ Staff Management
├─ Team Analytics
└─ Settings
```

### 1. DASHBOARD Screen

**Features Required:**

- Team overview cards:
  - Total Leads
  - Active Staff
  - Calls Today
  - Team Conversion Rate
- Top performers list (by calls today)
- Live activity feed (recent activities)
- Quick action buttons

**APIs to Use:**

```javascript
// Get all leads count
COUNT hr_leads

// Get active staff count
COUNT users WHERE role = 'hr_staff'

// Get today's team stats
GET hr_staff_daily_stats
WHERE date = TODAY

// Get live activity
GET hr_lead_activities
WHERE created_at >= [24 hours ago]
ORDER BY created_at DESC
LIMIT 100
```

### 2. STAFF MANAGEMENT Screen

**Features Required:**

- Search bar
- Staff list cards showing:
  - Name
  - Today's calls
  - Conversion rate
  - Clock-in status with duration
  - View Details button
- Add new staff button (optional)

**Staff Detail Screen:**

- Contact info
- Today's performance
- Weekly performance chart
- Assigned leads count
- Assigned WhatsApp numbers count
- Action buttons:
  - View Full Report
  - Assign Leads
  - Set Target

**APIs to Use:**

```javascript
// Get all staff
GET users
WHERE role = 'hr_staff'

// Get staff details
GET users WHERE id = [staff_id]
GET hr_staff_daily_stats WHERE staff_user_id = [staff_id]
COUNT hr_leads WHERE assigned_staff_user_id = [staff_id]
GET hr_whatsapp_numbers WHERE assigned_staff_user_id = [staff_id]
```

### 3. ALL LEADS Screen

**Features Required:**

- Search bar
- Filters:
  - Status dropdown
  - Assigned staff dropdown
- Lead cards showing:
  - Name
  - Phone
  - Status
  - Assigned staff name
  - Last call time
  - View button
  - Reassign button
- Bulk actions:
  - Select multiple
  - Bulk assign to staff
  - Bulk status change

**APIs to Use:**

```javascript
// Get all leads with staff info
GET hr_leads
SELECT *, users!assigned_staff_user_id(name)
WHERE status = [filter]
AND assigned_staff_user_id = [filter]

// Assign lead
UPDATE hr_leads
SET assigned_staff_user_id = [new_staff_id]
WHERE id = [lead_id]

// Bulk assign
UPDATE hr_leads
SET assigned_staff_user_id = [staff_id]
WHERE id IN ([lead_ids])
```

### 4. TEAM ANALYTICS Screen

**Features Required:**

- Time period tabs (Today, Week, Month)
- Team performance cards
- Staff performance table:
  - Name
  - Total Calls
  - Conversion Rate
  - Leads Joined
- Team performance line chart
- Status distribution pie chart
- Export to CSV button (optional)

**APIs to Use:**

```javascript
// Get team daily stats
GET hr_staff_daily_stats
JOIN users ON users.id = staff_user_id
WHERE date >= [start_date]
ORDER BY date DESC
```

### 5. DAILY HISTORY Screen

**Features Required:**

- Date range filter dropdown
- Staff filter dropdown (All Staff, or specific staff)
- Daily summary cards for each day:
  - Date
  - Staff name (if filtered)
  - Total calls
  - Successful calls with percentage
  - Leads joined
  - Hot leads
  - Work hours
  - Trend indicator (up/down vs previous day)

**APIs to Use:**

```javascript
// Get team daily history
GET hr_staff_daily_stats
JOIN users ON users.id = staff_user_id
WHERE date >= [start_date]
AND staff_user_id = [optional_filter]
ORDER BY date DESC, users.name ASC
```

### 6. TARGET MANAGEMENT Screen

**Features Required:**

- List of active targets
- Create target button
- Target cards showing:
  - Target type (Daily/Weekly/Monthly)
  - Staff name
  - Metric (Calls/Conversions/Joined)
  - Target value
  - Current value
  - Progress bar
  - Edit/Delete buttons

**Create Target Form:**

- Staff selector
- Target type selector
- Metric selector
- Target value input
- Start/End date pickers

**APIs to Use:**

```javascript
// Get all targets
GET hr_staff_targets
JOIN users ON users.id = staff_user_id
WHERE end_date >= TODAY
ORDER BY end_date ASC

// Create target
INSERT hr_staff_targets
{
  staff_user_id,
  target_type,
  metric_name,
  target_value,
  current_value: 0,
  start_date,
  end_date
}

// Update target
UPDATE hr_staff_targets
WHERE id = [target_id]

// Delete target
DELETE hr_staff_targets
WHERE id = [target_id]
```

### 7. LIVE ACTIVITY MONITOR Screen

**Features Required:**

- Real-time activity feed
- Staff status indicators (online/offline/on call)
- Recent activities list:
  - Staff name
  - Activity type
  - Time ago
  - Activity description
- Auto-refresh every 30 seconds

**APIs to Use:**

```javascript
// Get live activities
GET hr_lead_activities
JOIN users ON users.id = staff_user_id
JOIN hr_leads ON hr_leads.id = lead_id
WHERE created_at >= [24 hours ago]
ORDER BY created_at DESC

// Get current clock-in status
GET hr_staff_attendance
WHERE date = TODAY AND is_active = true
```

### 8. JOINING CALENDAR Screen

**Features Required:**

- Month calendar view
- Days with joining dates highlighted
- Tap day to see leads joining that day
- Lead cards showing:
  - Name
  - Phone
  - Assigned staff
- Navigate between months

**APIs to Use:**

```javascript
// Get joining leads for month
GET hr_leads
JOIN users ON users.id = assigned_staff_user_id
WHERE joining_date >= [month_start]
AND joining_date <= [month_end]
AND joining_date IS NOT NULL
ORDER BY joining_date ASC
```

---

## 🎨 UI/UX Requirements

### Color Palette

```javascript
primary: "#8B5CF6"; // Purple
success: "#10B981"; // Green
warning: "#F59E0B"; // Orange
danger: "#EF4444"; // Red
info: "#3B82F6"; // Blue
background: "#F9FAFB"; // Light Gray
surface: "#FFFFFF"; // White
text: "#111827"; // Dark Gray
```

### Design Guidelines

- Use **Material Design** or **iOS Human Interface Guidelines**
- Cards with shadows for list items
- Bottom tab navigation with icons
- Consistent spacing (8px, 16px, 24px)
- Loading states for all API calls
- Error handling with toast messages
- Pull-to-refresh on lists
- Smooth animations

---

## 📦 Required Components

### Reusable Components to Build

1. **LeadCard**

   - Props: lead (object), onPress, onCall, onWhatsApp
   - Displays: name, phone, status badge, source, callback date

2. **StatCard**

   - Props: title, value, icon, color
   - Displays metric in colored card with icon

3. **StaffCard**

   - Props: staff (object), todayStats, onPress
   - Displays: name, calls, conversion rate, clock status

4. **TargetCard**

   - Props: target (object), onEdit, onDelete
   - Displays: progress bar, metric info, actions

5. **ActivityItem**

   - Props: activity (object)
   - Displays: staff name, description, time ago

6. **PerformanceChart**

   - Props: data, type (line/bar)
   - Renders chart using react-native-chart-kit

7. **TimerDisplay**

   - Props: startTime
   - Shows elapsed time, updates every second

8. **StatusBadge**
   - Props: status, size
   - Colored badge based on status

---

## 🚀 Implementation Steps

### Phase 1: Setup (Week 1)

1. Initialize React Native project
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   npm install @react-navigation/native @react-navigation/bottom-tabs
   npm install react-native-paper
   npm install react-native-chart-kit
   npm install @react-native-async-storage/async-storage
   ```
3. Configure Supabase client
4. Set up navigation structure
5. Create authentication context

### Phase 2: Authentication (Week 1)

1. Build Login screen
2. Implement authentication flow
3. Add role-based routing
4. Implement secure token storage
5. Add logout functionality

### Phase 3: HR Staff Portal (Week 2-3)

1. Build navigation tabs
2. Create Dashboard screen
3. Create My Leads screen
4. Create Call Tracking screen with timer
5. Create Performance screen with charts
6. Implement clock in/out
7. Add Profile screen

### Phase 4: HR Manager Portal (Week 3-4)

1. Build manager navigation
2. Create Manager Dashboard
3. Create Staff Management screens
4. Create All Leads screen with filters
5. Create Team Analytics screen
6. Create Daily History screen
7. Create Target Management screens
8. Create Live Activity screen
9. Create Joining Calendar

### Phase 5: Polish & Testing (Week 5)

1. Add loading states
2. Implement error handling
3. Add animations
4. Test all features
5. Optimize performance
6. Fix bugs

---

## 🔍 Key Features Summary

### HR STAFF PORTAL

✅ Clock In/Out with timer
✅ View assigned leads
✅ Make call with tracking (auto-timer)
✅ View personal performance
✅ View daily history
✅ Call/WhatsApp integration

### HR MANAGER PORTAL

✅ View team dashboard
✅ Manage staff
✅ View all leads
✅ Assign/reassign leads
✅ View team analytics
✅ Set targets for staff
✅ Monitor live activity
✅ View joining calendar
✅ View team daily history

---

## 📚 Database Tables Reference

### users

- id, email, name, phone, role

### hr_leads

- id, name, phone, email, status, source, assigned_staff_user_id, callback_date, joining_date, notes

### hr_call_tracking

- id, lead_id, staff_user_id, name, phone, status, called_date, callback_date, joining_date, notes, source, call_duration

### hr_staff_attendance

- id, staff_user_id, clock_in_time, clock_out_time, total_work_duration_seconds, is_active

### hr_staff_daily_stats

- id, staff_user_id, date, total_calls, successful_calls, failed_calls, leads_joined, hot_leads_generated, conversion_rate, total_work_hours

### hr_lead_statuses

- id, name, color, is_active

### hr_staff_targets

- id, staff_user_id, target_type, metric_name, target_value, current_value, start_date, end_date

### hr_whatsapp_numbers

- id, phone, assigned_staff_user_id, is_active

### hr_lead_activities

- id, lead_id, staff_user_id, activity_type, description, metadata, created_at

---

## 🎯 Success Criteria

### HR Staff Can:

- ✅ Login and see their dashboard
- ✅ Clock in/out and track work hours
- ✅ View assigned leads
- ✅ Make calls with automatic timer
- ✅ Track call details (status, notes, dates)
- ✅ View their performance metrics
- ✅ View their daily history
- ✅ Click to call or WhatsApp leads

### HR Manager Can:

- ✅ Login and see team dashboard
- ✅ View all staff and their performance
- ✅ View all leads in system
- ✅ Assign/reassign leads to staff
- ✅ View team analytics and charts
- ✅ Set targets for staff
- ✅ Monitor live staff activity
- ✅ View joining calendar
- ✅ View team daily history

---

## 📝 Additional Notes

### Performance Optimization

- Implement pagination for long lists
- Cache frequently accessed data
- Optimize images
- Lazy load screens

### Security

- Never expose Supabase service key
- Use Row Level Security (RLS) policies
- Validate all inputs
- Sanitize user data

### Offline Support (Optional)

- Cache lead data
- Queue call tracking for sync
- Show offline indicator

### Push Notifications (Optional)

- New lead assigned
- Target achieved
- Daily summary

---

## 🚀 START BUILDING

**Priority Order:**

1. ✅ Setup + Authentication
2. ✅ HR Staff Dashboard + My Leads
3. ✅ Call Tracking with Timer
4. ✅ HR Manager Dashboard
5. ✅ Staff Management
6. ✅ Team Analytics
7. ✅ Additional Features

**Use these reference documents:**

- `MOBILE_APP_COMPLETE_GUIDE.md` - Full specifications
- `MOBILE_APP_API_REFERENCE.md` - All API functions

---

**NOW BUILD IT!** 🚀

Start with authentication, then HR Staff portal, then HR Manager portal. Test thoroughly at each phase. Good luck!
