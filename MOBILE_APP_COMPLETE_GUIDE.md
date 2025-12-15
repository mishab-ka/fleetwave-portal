# 📱 HR Mobile App - Complete Implementation Guide

## 🎯 Overview

This guide provides **complete specifications** for building a mobile app replica of the HR Staff Portal with **role-based access** for HR Staff and HR Managers.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Screen Specifications](#screen-specifications)
6. [Feature Requirements](#feature-requirements)
7. [UI/UX Guidelines](#uiux-guidelines)
8. [Data Flow](#data-flow)
9. [Implementation Checklist](#implementation-checklist)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Login Screen │────────▶│ Role Check   │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
│                    ┌──────────────┴──────────────┐          │
│                    ▼                             ▼          │
│          ┌──────────────────┐         ┌──────────────────┐ │
│          │  HR Staff Portal │         │ HR Manager Portal│ │
│          │  (role=hr_staff) │         │ (role=hr_manager)│ │
│          └──────────────────┘         └──────────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   SUPABASE BACKEND                           │
│  • Authentication (auth.users)                              │
│  • PostgreSQL Database                                      │
│  • Row Level Security (RLS)                                 │
│  • Real-time Subscriptions                                  │
│  • Storage (optional)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Authorization

### Supabase Setup

```javascript
// supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Login Flow

```javascript
// Login function
async function login(email, password) {
  try {
    // 1. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (authError) throw authError

    // 2. Get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, phone')
      .eq('id', authData.user.id)
      .single()

    if (userError) throw userError

    // 3. Check if user is HR staff or manager
    if (!['hr_staff', 'hr_manager', 'admin'].includes(userData.role)) {
      throw new Error('Access denied. HR role required.')
    }

    // 4. Return user data with role
    return {
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

### Role-Based Routing

```javascript
// After successful login
function navigateBasedOnRole(user) {
  if (user.role === 'hr_staff') {
    // Navigate to HR Staff Portal
    navigation.navigate('HRStaffPortal')
  } else if (user.role === 'hr_manager' || user.role === 'admin') {
    // Navigate to HR Manager Portal
    navigation.navigate('HRManagerPortal')
  }
}
```

---

## 🗄️ Database Schema

### Core Tables Used

#### 1. **users** (Authentication & User Info)
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  name VARCHAR,
  phone VARCHAR,
  role VARCHAR, -- 'hr_staff', 'hr_manager', 'admin'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 2. **hr_leads** (Lead Management)
```sql
hr_leads (
  id UUID PRIMARY KEY,
  name VARCHAR,
  phone VARCHAR NOT NULL,
  email VARCHAR,
  status VARCHAR,
  source VARCHAR,
  assigned_staff_user_id UUID, -- FK to users(id)
  callback_date DATE,
  joining_date DATE,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 3. **hr_call_tracking** (Call History)
```sql
hr_call_tracking (
  id UUID PRIMARY KEY,
  lead_id UUID, -- FK to hr_leads(id)
  staff_user_id UUID, -- FK to users(id)
  name VARCHAR,
  phone VARCHAR,
  status VARCHAR,
  called_date DATE,
  callback_date DATE,
  joining_date DATE,
  notes TEXT,
  source VARCHAR,
  call_duration INTEGER, -- seconds
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 4. **hr_staff_attendance** (Clock In/Out)
```sql
hr_staff_attendance (
  id UUID PRIMARY KEY,
  staff_user_id UUID, -- FK to users(id)
  clock_in_time TIMESTAMP,
  clock_out_time TIMESTAMP,
  total_work_duration_seconds INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

#### 5. **hr_staff_daily_stats** (Daily Performance)
```sql
hr_staff_daily_stats (
  id UUID PRIMARY KEY,
  staff_user_id UUID, -- FK to users(id)
  date DATE,
  total_calls INTEGER,
  successful_calls INTEGER,
  failed_calls INTEGER,
  total_call_duration INTEGER,
  avg_call_duration DECIMAL(10,2),
  leads_contacted INTEGER,
  hot_leads_generated INTEGER,
  leads_joined INTEGER,
  callbacks_scheduled INTEGER,
  conversion_rate DECIMAL(5,2),
  status_breakdown JSONB,
  source_breakdown JSONB,
  clock_in_time TIMESTAMP,
  clock_out_time TIMESTAMP,
  total_work_hours DECIMAL(10,2),
  UNIQUE(staff_user_id, date)
)
```

#### 6. **hr_whatsapp_numbers** (WhatsApp Numbers)
```sql
hr_whatsapp_numbers (
  id UUID PRIMARY KEY,
  phone VARCHAR NOT NULL,
  assigned_staff_user_id UUID, -- FK to users(id)
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

#### 7. **hr_lead_statuses** (Lead Status Options)
```sql
hr_lead_statuses (
  id UUID PRIMARY KEY,
  name VARCHAR,
  color VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

#### 8. **hr_staff_targets** (Performance Targets)
```sql
hr_staff_targets (
  id UUID PRIMARY KEY,
  staff_user_id UUID, -- FK to users(id)
  target_type VARCHAR, -- 'daily', 'weekly', 'monthly'
  metric_name VARCHAR, -- 'calls', 'conversions', 'joined'
  target_value INTEGER,
  current_value INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP
)
```

#### 9. **hr_lead_activities** (Activity Log)
```sql
hr_lead_activities (
  id UUID PRIMARY KEY,
  lead_id UUID, -- FK to hr_leads(id)
  staff_user_id UUID, -- FK to users(id)
  activity_type VARCHAR, -- 'call_started', 'call_completed', etc.
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP
)
```

---

## 🔌 API Endpoints

### Authentication APIs

#### Login
```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Get user role
const { data: user } = await supabase
  .from('users')
  .select('id, name, email, role, phone')
  .eq('id', data.user.id)
  .single()
```

#### Logout
```javascript
const { error } = await supabase.auth.signOut()
```

#### Get Current User
```javascript
const { data: { user } } = await supabase.auth.getUser()
```

---

### HR Staff APIs

#### 1. Get My Assigned Leads
```javascript
const { data: leads, error } = await supabase
  .from('hr_leads')
  .select('*')
  .eq('assigned_staff_user_id', userId)
  .order('created_at', { ascending: false })
```

#### 2. Get Today's Stats
```javascript
const today = new Date().toISOString().split('T')[0]

const { data: stats, error } = await supabase
  .from('hr_staff_daily_stats')
  .select('*')
  .eq('staff_user_id', userId)
  .eq('date', today)
  .single()
```

#### 3. Clock In
```javascript
const { data, error } = await supabase
  .from('hr_staff_attendance')
  .insert([{
    staff_user_id: userId,
    clock_in_time: new Date().toISOString(),
    is_active: true
  }])
```

#### 4. Clock Out
```javascript
// 1. Get active attendance record
const { data: attendance } = await supabase
  .from('hr_staff_attendance')
  .select('*')
  .eq('staff_user_id', userId)
  .eq('is_active', true)
  .single()

// 2. Calculate duration
const clockOutTime = new Date()
const clockInTime = new Date(attendance.clock_in_time)
const durationSeconds = Math.floor((clockOutTime - clockInTime) / 1000)

// 3. Update record
const { error } = await supabase
  .from('hr_staff_attendance')
  .update({
    clock_out_time: clockOutTime.toISOString(),
    total_work_duration_seconds: durationSeconds,
    is_active: false
  })
  .eq('id', attendance.id)
```

#### 5. Check Clock In Status
```javascript
const today = new Date().toISOString().split('T')[0]

const { data, error } = await supabase
  .from('hr_staff_attendance')
  .select('*')
  .eq('staff_user_id', userId)
  .gte('clock_in_time', `${today}T00:00:00`)
  .eq('is_active', true)
  .maybeSingle()

const isClockedIn = !!data
```

#### 6. Save Call Tracking
```javascript
const { error } = await supabase
  .from('hr_call_tracking')
  .insert([{
    lead_id: leadId,
    staff_user_id: userId,
    name: leadName,
    phone: leadPhone,
    status: callStatus,
    called_date: new Date().toISOString().split('T')[0],
    callback_date: callbackDate || null,
    joining_date: joiningDate || null,
    notes: notes,
    source: source,
    call_duration: durationInSeconds,
    created_at: new Date().toISOString()
  }])

// Also update the lead
if (joiningDate || callbackDate || statusChanged) {
  await supabase
    .from('hr_leads')
    .update({
      status: newStatus,
      joining_date: joiningDate,
      callback_date: callbackDate
    })
    .eq('id', leadId)
}

// Trigger daily stats aggregation
await supabase.rpc('aggregate_daily_stats', {
  p_staff_user_id: userId,
  p_date: new Date().toISOString().split('T')[0]
})
```

#### 7. Get My Call History
```javascript
const { data: calls, error } = await supabase
  .from('hr_call_tracking')
  .select('*')
  .eq('staff_user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50)
```

#### 8. Get My WhatsApp Numbers
```javascript
const { data: numbers, error } = await supabase
  .from('hr_whatsapp_numbers')
  .select('*')
  .eq('assigned_staff_user_id', userId)
  .eq('is_active', true)
```

#### 9. Get My Daily History
```javascript
const { data: history, error } = await supabase
  .from('hr_staff_daily_stats')
  .select('*')
  .eq('staff_user_id', userId)
  .gte('date', startDate)
  .order('date', { ascending: false })
```

#### 10. Get Lead Statuses
```javascript
const { data: statuses, error } = await supabase
  .from('hr_lead_statuses')
  .select('*')
  .eq('is_active', true)
  .order('name', { ascending: true })
```

#### 11. Get My Targets
```javascript
const { data: targets, error } = await supabase
  .from('hr_staff_targets')
  .select('*')
  .eq('staff_user_id', userId)
  .gte('end_date', new Date().toISOString().split('T')[0])
  .order('end_date', { ascending: true })
```

---

### HR Manager APIs

#### 1. Get All Staff
```javascript
const { data: staff, error } = await supabase
  .from('users')
  .select('id, name, email, phone, created_at')
  .eq('role', 'hr_staff')
  .order('name', { ascending: true })
```

#### 2. Get All Leads
```javascript
const { data: leads, error } = await supabase
  .from('hr_leads')
  .select(`
    *,
    assigned_staff:users!assigned_staff_user_id(id, name)
  `)
  .order('created_at', { ascending: false })
```

#### 3. Assign Lead to Staff
```javascript
const { error } = await supabase
  .from('hr_leads')
  .update({ assigned_staff_user_id: staffUserId })
  .eq('id', leadId)
```

#### 4. Get Team Performance
```javascript
const startDate = '2025-11-01' // or calculate based on filter

const { data: performance, error } = await supabase
  .from('hr_call_tracking')
  .select(`
    staff_user_id,
    call_duration,
    status,
    called_date,
    source
  `)
  .gte('called_date', startDate)
  .order('called_date', { ascending: false })
```

#### 5. Get All Daily Stats
```javascript
const { data: stats, error } = await supabase
  .from('hr_staff_daily_stats')
  .select(`
    *,
    staff:users!staff_user_id(name)
  `)
  .gte('date', startDate)
  .order('date', { ascending: false })
```

#### 6. Get Live Activity
```javascript
// Get recent activities (last 24 hours)
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

const { data: activities, error } = await supabase
  .from('hr_lead_activities')
  .select(`
    *,
    staff:users!staff_user_id(name),
    lead:hr_leads!lead_id(name, phone)
  `)
  .gte('created_at', yesterday)
  .order('created_at', { ascending: false })
  .limit(100)
```

#### 7. Get Staff Attendance
```javascript
const today = new Date().toISOString().split('T')[0]

const { data: attendance, error } = await supabase
  .from('hr_staff_attendance')
  .select(`
    *,
    staff:users!staff_user_id(name)
  `)
  .gte('clock_in_time', `${today}T00:00:00`)
  .order('clock_in_time', { ascending: false })
```

#### 8. Create/Update Target
```javascript
const { error } = await supabase
  .from('hr_staff_targets')
  .insert([{
    staff_user_id: staffUserId,
    target_type: 'daily', // or 'weekly', 'monthly'
    metric_name: 'calls', // or 'conversions', 'joined'
    target_value: 50,
    current_value: 0,
    start_date: startDate,
    end_date: endDate
  }])
```

#### 9. Manage WhatsApp Numbers
```javascript
// Add number
const { error } = await supabase
  .from('hr_whatsapp_numbers')
  .insert([{
    phone: phoneNumber,
    assigned_staff_user_id: staffUserId,
    is_active: true
  }])

// Reassign number
const { error } = await supabase
  .from('hr_whatsapp_numbers')
  .update({ assigned_staff_user_id: newStaffUserId })
  .eq('id', numberId)
```

#### 10. Get Joining Calendar
```javascript
const { data: joiningLeads, error } = await supabase
  .from('hr_leads')
  .select(`
    *,
    assigned_staff:users!assigned_staff_user_id(name)
  `)
  .not('joining_date', 'is', null)
  .gte('joining_date', startDate)
  .lte('joining_date', endDate)
  .order('joining_date', { ascending: true })
```

---

## 📱 Screen Specifications

### Common Screens (Both Roles)

#### 1. **Login Screen**

**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│         [LOGO/ICON]             │
│                                 │
│      HR Management System       │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Email                     │  │
│  │ [input field]             │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Password                  │  │
│  │ [input field]             │  │
│  └───────────────────────────┘  │
│                                 │
│    [ ] Remember Me              │
│                                 │
│  ┌───────────────────────────┐  │
│  │      Login Button         │  │
│  └───────────────────────────┘  │
│                                 │
│      Forgot Password?           │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Email and password input fields
- Remember me checkbox
- Login button with loading state
- Error message display
- Forgot password link (optional)

**API Calls:**
```javascript
const result = await login(email, password)
if (result.success) {
  navigateBasedOnRole(result.user)
}
```

---

### HR STAFF Portal Screens

#### 1. **HR Staff Home/Dashboard**

**Layout:**
```
┌─────────────────────────────────┐
│ ☰  HR Staff Portal      [👤]   │
├─────────────────────────────────┤
│                                 │
│  [Clock In/Out Button]          │
│  Status: Clocked In (2h 30m)    │
│                                 │
│  ┌──────────┐ ┌──────────┐     │
│  │ Calls    │ │ Joined   │     │
│  │   15     │ │    3     │     │
│  └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐     │
│  │ Hot Leads│ │ Conv.Rate│     │
│  │    5     │ │   68%    │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  Today's Target: 50 calls       │
│  [Progress Bar: 30%]            │
│                                 │
│  Quick Actions:                 │
│  [📞 Make Call]                 │
│  [📊 My Performance]            │
│  [📅 Call History]              │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Clock in/out button with timer
- Today's stats cards (calls, joined, hot leads, conversion rate)
- Daily target progress
- Quick action buttons
- Bottom navigation

**Bottom Navigation:**
```
[🏠 Home] [📞 Leads] [📊 Stats] [👤 Profile]
```

---

#### 2. **My Leads Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← My Leads              [🔍]    │
├─────────────────────────────────┤
│                                 │
│  [Search leads...]              │
│                                 │
│  Filter: [All ▼] [Status ▼]    │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Ahmed Mohammed           │  │
│  │ 📱 +971-50-123-4567     │  │
│  │ Status: New Lead         │  │
│  │ Source: WhatsApp         │  │
│  │ [Call] [WhatsApp]        │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Sara Ali                 │  │
│  │ 📱 +971-55-987-6543     │  │
│  │ Status: Callback         │  │
│  │ 📅 Callback: Today 2PM   │  │
│  │ [Call] [WhatsApp]        │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Search bar
- Filter by status
- Lead cards with:
  - Name
  - Phone number
  - Status badge
  - Source
  - Callback date (if set)
  - Call button
  - WhatsApp button
- Pull to refresh
- Infinite scroll/pagination

---

#### 3. **Call Tracking Dialog/Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ Call Tracking          [×]      │
├─────────────────────────────────┤
│                                 │
│  Timer: 00:02:35               │
│  [⏸️ Pause]                     │
│                                 │
│  Name: Ahmed Mohammed           │
│  [input field]                  │
│                                 │
│  Phone: +971-50-123-4567       │
│  [input field]                  │
│                                 │
│  Status: [Select ▼]            │
│  • New Lead                     │
│  • Contacted                    │
│  • Hot Lead                     │
│  • Callback                     │
│  • Joined                       │
│  • Not Interested               │
│                                 │
│  Source: [Select ▼]            │
│  • WhatsApp                     │
│  • Facebook                     │
│  • Instagram                    │
│  • Referral                     │
│                                 │
│  Called Date: [2025-11-28]     │
│                                 │
│  Callback Date: [optional]     │
│                                 │
│  Joining Date: [optional]      │
│                                 │
│  Notes:                         │
│  [text area]                    │
│                                 │
│  [Save Call]                    │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Call timer (starts automatically)
- Pause/resume timer
- Pre-filled lead info
- Status dropdown
- Source dropdown
- Date pickers
- Notes text area
- Save button with loading state
- Validation

---

#### 4. **My Performance Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← My Performance                │
├─────────────────────────────────┤
│                                 │
│  [Today] [Week] [Month]         │
│                                 │
│  ┌──────────┐ ┌──────────┐     │
│  │ Total    │ │ Successful│    │
│  │ Calls    │ │  Calls   │     │
│  │   45     │ │    28    │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  ┌──────────┐ ┌──────────┐     │
│  │ Leads    │ │ Conv.    │     │
│  │ Joined   │ │ Rate     │     │
│  │    5     │ │   62%    │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  Status Breakdown:              │
│  ━━━━━━━━ Joined (5)            │
│  ━━━━━━━━━━━ Hot Lead (12)      │
│  ━━━━━━ Callback (8)            │
│  ━━━━ Contacted (15)            │
│  ━━ Not Interested (5)          │
│                                 │
│  Daily Performance Chart        │
│  [Line/Bar Chart]               │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Time period tabs (Today, Week, Month)
- Performance metrics cards
- Status breakdown with progress bars
- Performance chart
- Export option (optional)

---

#### 5. **Daily History Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Daily History                 │
├─────────────────────────────────┤
│                                 │
│  Filter: [Last 7 Days ▼]       │
│                                 │
│  ┌──────────────────────────┐  │
│  │ November 28, 2025        │  │
│  │ ─────────────────────    │  │
│  │ Total Calls: 45          │  │
│  │ Successful: 28 (62%)     │  │
│  │ Joined: 5                │  │
│  │ Hot Leads: 12            │  │
│  │ Work Hours: 8.5h         │  │
│  │ ↗️ +15% vs yesterday     │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ November 27, 2025        │  │
│  │ ─────────────────────    │  │
│  │ Total Calls: 39          │  │
│  │ Successful: 24 (62%)     │  │
│  │ Joined: 4                │  │
│  │ Hot Leads: 10            │  │
│  │ Work Hours: 8h           │  │
│  │ ↘️ -5% vs previous day   │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Date range filter
- Daily summary cards
- Trend indicators
- Expandable details
- Pull to refresh

---

#### 6. **Profile/Settings Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Profile                       │
├─────────────────────────────────┤
│                                 │
│       [Profile Photo]           │
│                                 │
│     Ahmed Mohammed              │
│     HR Staff                    │
│     ahmed@example.com           │
│                                 │
│  ┌──────────────────────────┐  │
│  │ 📧 Email Notifications   │  │
│  │                     [ON] │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ 🔔 Push Notifications    │  │
│  │                     [ON] │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ 🔒 Change Password       │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ ℹ️ About                 │  │
│  └──────────────────────────┘  │
│                                 │
│  [Logout Button]                │
│                                 │
└─────────────────────────────────┘
```

---

### HR MANAGER Portal Screens

#### 1. **HR Manager Dashboard**

**Layout:**
```
┌─────────────────────────────────┐
│ ☰  HR Manager Portal    [👤]   │
├─────────────────────────────────┤
│                                 │
│  Team Overview                  │
│  ┌──────────┐ ┌──────────┐     │
│  │ Total    │ │ Active   │     │
│  │ Leads    │ │  Staff   │     │
│  │  1,234   │ │    15    │     │
│  └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐     │
│  │ Calls    │ │ Team     │     │
│  │ Today    │ │ Conv.Rate│     │
│  │   245    │ │   65%    │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  Top Performers Today:          │
│  ┌──────────────────────────┐  │
│  │ 🥇 Ahmed - 45 calls      │  │
│  │ 🥈 Sara - 38 calls       │  │
│  │ 🥉 Mohammed - 35 calls   │  │
│  └──────────────────────────┘  │
│                                 │
│  Live Activity:                 │
│  • Ahmed just joined a lead     │
│  • Sara made a call (2m ago)    │
│                                 │
└─────────────────────────────────┘
```

**Bottom Navigation:**
```
[🏠 Home] [👥 Staff] [📊 Analytics] [⚙️ Settings]
```

---

#### 2. **Staff Management Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Staff Management      [+]     │
├─────────────────────────────────┤
│                                 │
│  [Search staff...]              │
│                                 │
│  Active Staff (15)              │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Ahmed Mohammed           │  │
│  │ 📞 Calls Today: 45       │  │
│  │ 💯 Conv. Rate: 68%       │  │
│  │ ⏰ Clocked In (8h 30m)   │  │
│  │ [View Details]           │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Sara Ali                 │  │
│  │ 📞 Calls Today: 38       │  │
│  │ 💯 Conv. Rate: 72%       │  │
│  │ ⏰ Clocked In (7h 45m)   │  │
│  │ [View Details]           │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Staff Detail Screen:**
```
┌─────────────────────────────────┐
│ ← Ahmed Mohammed                │
├─────────────────────────────────┤
│                                 │
│  Contact: +971-50-123-4567     │
│  Email: ahmed@example.com       │
│  Role: HR Staff                 │
│  Joined: Jan 1, 2025            │
│                                 │
│  Today's Performance:           │
│  • Calls: 45                    │
│  • Joined: 5                    │
│  • Conversion: 68%              │
│  • Work Hours: 8.5h             │
│                                 │
│  Weekly Performance:            │
│  [Chart showing daily calls]    │
│                                 │
│  Assigned Leads: 125            │
│  Assigned WhatsApp: 3 numbers   │
│                                 │
│  [View Full Report]             │
│  [Assign Leads]                 │
│  [Set Target]                   │
│                                 │
└─────────────────────────────────┘
```

---

#### 3. **Leads Management Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← All Leads             [+]     │
├─────────────────────────────────┤
│                                 │
│  [Search leads...]              │
│  Filter: [All] [Status] [Staff] │
│                                 │
│  Total: 1,234 leads             │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Ahmed Mohammed           │  │
│  │ 📱 +971-50-123-4567     │  │
│  │ Status: Hot Lead         │  │
│  │ Assigned: Sara Ali       │  │
│  │ Last Call: 2h ago        │  │
│  │ [View] [Reassign]        │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Mohammed Ali             │  │
│  │ 📱 +971-55-987-6543     │  │
│  │ Status: Callback         │  │
│  │ Assigned: Ahmed          │  │
│  │ Callback: Today 3PM      │  │
│  │ [View] [Reassign]        │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Bulk Actions:**
- Select multiple leads
- Bulk assign to staff
- Bulk status change
- Export to CSV

---

#### 4. **Team Analytics Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Team Analytics                │
├─────────────────────────────────┤
│                                 │
│  [Today] [Week] [Month]         │
│                                 │
│  Team Performance               │
│  ┌──────────┐ ┌──────────┐     │
│  │ Total    │ │ Success  │     │
│  │ Calls    │ │  Rate    │     │
│  │   245    │ │   65%    │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  Staff Performance Table:       │
│  ┌──────────────────────────┐  │
│  │ Name     | Calls | Conv. │  │
│  │ Ahmed    |  45   | 68%   │  │
│  │ Sara     |  38   | 72%   │  │
│  │ Mohammed |  35   | 60%   │  │
│  │ Fatima   |  32   | 65%   │  │
│  └──────────────────────────┘  │
│                                 │
│  Performance Chart              │
│  [Line chart showing trends]    │
│                                 │
│  Status Distribution            │
│  [Pie chart]                    │
│                                 │
└─────────────────────────────────┘
```

---

#### 5. **Daily History (Manager View)**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Team Daily History            │
├─────────────────────────────────┤
│                                 │
│  Filter: [Last 7 Days ▼]       │
│  Staff: [All Staff ▼]           │
│                                 │
│  November 28, 2025              │
│  ┌──────────────────────────┐  │
│  │ Ahmed Mohammed           │  │
│  │ Calls: 45 | Joined: 5    │  │
│  │ Conv: 68% | Hours: 8.5h  │  │
│  │ ↗️ +15% vs yesterday     │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Sara Ali                 │  │
│  │ Calls: 38 | Joined: 7    │  │
│  │ Conv: 72% | Hours: 8h    │  │
│  │ ↗️ +8% vs yesterday      │  │
│  └──────────────────────────┘  │
│                                 │
│  November 27, 2025              │
│  [Previous day stats...]        │
│                                 │
└─────────────────────────────────┘
```

---

#### 6. **Target Management Screen**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Target Management     [+]     │
├─────────────────────────────────┤
│                                 │
│  Active Targets                 │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Daily Call Target        │  │
│  │ Staff: Ahmed Mohammed    │  │
│  │ Target: 50 calls         │  │
│  │ Current: 45 calls        │  │
│  │ [━━━━━━━━━ 90%]         │  │
│  │ [Edit] [Delete]          │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Weekly Conversion Target │  │
│  │ Staff: Sara Ali          │  │
│  │ Target: 70%              │  │
│  │ Current: 72%             │  │
│  │ [━━━━━━━━━━ 103%] ✓     │  │
│  │ [Edit] [Delete]          │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Create Target Screen:**
```
┌─────────────────────────────────┐
│ ← Create Target                 │
├─────────────────────────────────┤
│                                 │
│  Staff Member: [Select ▼]      │
│  • Ahmed Mohammed               │
│  • Sara Ali                     │
│  • All Staff                    │
│                                 │
│  Target Type: [Select ▼]       │
│  • Daily                        │
│  • Weekly                       │
│  • Monthly                      │
│                                 │
│  Metric: [Select ▼]            │
│  • Total Calls                  │
│  • Successful Calls             │
│  • Leads Joined                 │
│  • Conversion Rate              │
│                                 │
│  Target Value: [input]          │
│                                 │
│  Start Date: [date picker]     │
│  End Date: [date picker]        │
│                                 │
│  [Create Target]                │
│                                 │
└─────────────────────────────────┘
```

---

#### 7. **Live Activity Monitor**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Live Activity         [🔄]   │
├─────────────────────────────────┤
│                                 │
│  Real-time Staff Activity       │
│                                 │
│  ⏰ Currently Active: 12/15     │
│                                 │
│  ┌──────────────────────────┐  │
│  │ 🟢 Ahmed                 │  │
│  │ Currently on call (2m)   │  │
│  │ Last action: 2m ago      │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ 🟢 Sara                  │  │
│  │ Just joined a lead       │  │
│  │ Last action: 1m ago      │  │
│  └──────────────────────────┘  │
│                                 │
│  Recent Activities:             │
│  • Ahmed completed call         │
│  • Sara marked lead as joined   │
│  • Mohammed scheduled callback  │
│  • Fatima clocked in            │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Real-time updates
- Staff activity status
- Recent activity feed
- Auto-refresh

---

#### 8. **Joining Calendar**

**Layout:**
```
┌─────────────────────────────────┐
│ ← Joining Calendar              │
├─────────────────────────────────┤
│                                 │
│  [< November 2025 >]            │
│                                 │
│  S  M  T  W  T  F  S            │
│        1  2  3  4  5            │
│  6  7  8  9 10 11 12            │
│ 13 14 15 16 17 18 19            │
│ 20 21 22 23 24 25 26            │
│ 27 28●29 30                     │
│                                 │
│  ● = Leads joining this day     │
│                                 │
│  November 28, 2025:             │
│  ┌──────────────────────────┐  │
│  │ Ahmed Mohammed           │  │
│  │ 📱 +971-50-123-4567     │  │
│  │ Staff: Sara Ali          │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ Ali Hassan               │  │
│  │ 📱 +971-55-111-2222     │  │
│  │ Staff: Ahmed             │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 🎨 UI/UX Guidelines

### Color Scheme

```javascript
const colors = {
  // Primary
  primary: '#8B5CF6',      // Fleet Purple
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  
  // Status Colors
  success: '#10B981',      // Green (Joined, Success)
  warning: '#F59E0B',      // Orange (Hot Lead, Callback)
  danger: '#EF4444',       // Red (Not Interested, Failed)
  info: '#3B82F6',         // Blue (Contacted, Info)
  
  // Neutrals
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  
  // Status Indicators
  online: '#10B981',
  offline: '#9CA3AF',
  busy: '#F59E0B',
}
```

### Typography

```javascript
const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: 'normal' },
  caption: { fontSize: 14, fontWeight: 'normal' },
  small: { fontSize: 12, fontWeight: 'normal' },
}
```

### Spacing

```javascript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}
```

### Components

#### Button Styles
```javascript
const buttonStyles = {
  primary: {
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: 8,
  },
  secondary: {
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    padding: '12px 24px',
    borderRadius: 8,
  },
  success: {
    backgroundColor: colors.success,
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: 8,
  },
  danger: {
    backgroundColor: colors.danger,
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: 8,
  },
}
```

#### Card Styles
```javascript
const cardStyles = {
  default: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}
```

---

## 📊 Data Flow Examples

### Example 1: HR Staff Makes a Call

```
1. Staff opens "My Leads" screen
   └─ API: GET hr_leads (assigned to staff)
   
2. Staff clicks "Call" button on a lead
   └─ Opens Call Tracking Dialog
   └─ Timer starts automatically
   
3. Staff fills in call details
   - Status: "Hot Lead"
   - Callback Date: Tomorrow
   - Notes: "Very interested, wants more info"
   
4. Staff clicks "Save Call"
   └─ API: INSERT hr_call_tracking
   └─ API: UPDATE hr_leads (status, callback_date)
   └─ API: INSERT hr_lead_activities (activity log)
   └─ API: RPC aggregate_daily_stats (update today's stats)
   
5. UI updates
   └─ Dialog closes with success message
   └─ Lead list refreshes
   └─ Dashboard stats update
```

### Example 2: HR Manager Views Team Performance

```
1. Manager opens "Team Analytics" screen
   └─ API: GET hr_staff_daily_stats (all staff, date range)
   └─ API: GET hr_call_tracking (aggregate data)
   
2. Manager selects "This Week" filter
   └─ API calls re-fetch with new date range
   
3. Manager clicks on a staff member
   └─ Navigate to Staff Detail Screen
   └─ API: GET user details
   └─ API: GET staff's call history
   └─ API: GET staff's daily stats
   
4. Manager views performance chart
   └─ Data visualized from fetched stats
```

### Example 3: HR Staff Clocks In

```
1. Staff opens app (already logged in)
   └─ API: Check clock-in status
   └─ Query: hr_staff_attendance (today, is_active=true)
   
2. Staff sees "Clock In" button (not clocked in)
   └─ Staff clicks "Clock In"
   
3. Clock In process
   └─ API: INSERT hr_staff_attendance
      - staff_user_id: [user id]
      - clock_in_time: [current timestamp]
      - is_active: true
   
4. UI updates
   └─ Button changes to "Clock Out"
   └─ Timer starts showing elapsed time
   └─ Dashboard shows "Clocked In" status
```

---

## ✅ Implementation Checklist

### Phase 1: Setup & Authentication
- [ ] Set up React Native project (or Flutter/etc)
- [ ] Install Supabase client library
- [ ] Configure Supabase credentials
- [ ] Create Login screen
- [ ] Implement authentication flow
- [ ] Implement role-based routing
- [ ] Set up secure storage for auth tokens

### Phase 2: HR Staff Features
- [ ] Create HR Staff navigation structure
- [ ] Implement Dashboard/Home screen
- [ ] Implement "My Leads" screen with search/filter
- [ ] Implement Call Tracking dialog with timer
- [ ] Implement Performance screen
- [ ] Implement Daily History screen
- [ ] Implement Clock In/Out functionality
- [ ] Implement Profile/Settings screen

### Phase 3: HR Manager Features
- [ ] Create HR Manager navigation structure
- [ ] Implement Manager Dashboard
- [ ] Implement Staff Management screen
- [ ] Implement All Leads screen with filters
- [ ] Implement Team Analytics screen
- [ ] Implement Daily History (manager view)
- [ ] Implement Target Management
- [ ] Implement Live Activity Monitor
- [ ] Implement Joining Calendar

### Phase 4: Advanced Features
- [ ] Implement real-time updates (WebSockets)
- [ ] Add push notifications
- [ ] Implement offline mode with sync
- [ ] Add data caching
- [ ] Implement pull-to-refresh on lists
- [ ] Add infinite scroll/pagination
- [ ] Implement WhatsApp deep linking
- [ ] Add phone call integration

### Phase 5: Polish & Testing
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Add empty states
- [ ] Implement form validation
- [ ] Add success/error messages
- [ ] Test on iOS and Android
- [ ] Performance optimization
- [ ] Security audit

---

## 🚀 Quick Start Code Examples

### Project Structure
```
mobile-app/
├── src/
│   ├── api/
│   │   ├── supabase.js
│   │   ├── auth.js
│   │   ├── leads.js
│   │   ├── calls.js
│   │   └── stats.js
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.js
│   │   ├── staff/
│   │   │   ├── StaffDashboard.js
│   │   │   ├── MyLeadsScreen.js
│   │   │   ├── CallTrackingScreen.js
│   │   │   ├── PerformanceScreen.js
│   │   │   └── DailyHistoryScreen.js
│   │   └── manager/
│   │       ├── ManagerDashboard.js
│   │       ├── StaffManagementScreen.js
│   │       ├── AllLeadsScreen.js
│   │       ├── TeamAnalyticsScreen.js
│   │       └── TargetManagementScreen.js
│   ├── components/
│   │   ├── LeadCard.js
│   │   ├── StatCard.js
│   │   ├── PerformanceChart.js
│   │   └── TimerDisplay.js
│   ├── navigation/
│   │   ├── AppNavigator.js
│   │   ├── StaffNavigator.js
│   │   └── ManagerNavigator.js
│   ├── utils/
│   │   ├── dateHelpers.js
│   │   └── validators.js
│   └── constants/
│       ├── colors.js
│       └── config.js
```

---

This guide provides everything needed to build the mobile app! Give this to Cursor with your preferred mobile framework (React Native, Flutter, etc.) and it will have all the specifications to implement it. 🚀

