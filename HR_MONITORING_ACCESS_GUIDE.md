# HR Performance Monitoring System - Access Guide

## ✅ Integration Complete!

The HR Performance Monitoring System is now fully integrated into your HRDashboard. You can now access all the new features!

---

## 🎯 How to Access the New Features

### For HR Managers & Admins:

When you log in to the HR Dashboard, you'll now see these new menu items in the sidebar:

#### 1. **Team Performance** 📊
- **What it shows:** Comprehensive team analytics with tabs for:
  - Performance metrics and rankings
  - Live activity monitoring
  - Target management
  - Alert center
  - Team rankings
- **How to access:** Click "Team Performance" in the sidebar

#### 2. **Live Activity** 🔴
- **What it shows:** Real-time monitoring of all HR staff
  - Who's currently active/idle/offline
  - Last activity timestamps
  - Work duration
  - Auto-refresh every 30 seconds
- **How to access:** Click "Live Activity" in the sidebar

#### 3. **Target Management** 🎯
- **What it shows:** Set and manage performance targets
  - Daily/weekly/monthly call targets
  - Conversion rate targets
  - Individual staff target assignment
  - Target progress tracking
- **How to access:** Click "Target Management" in the sidebar

#### 4. **Alert Center** 🔔
- **What it shows:** Performance alerts and notifications
  - Target miss alerts
  - Extended idle time alerts
  - Low quality score alerts
  - Filter and resolve alerts
- **How to access:** Click "Alert Center" in the sidebar

#### 5. **System Settings** ⚙️
- **What it shows:** Configure system parameters
  - Work hours settings
  - Alert thresholds
  - Default targets
  - Performance metrics
- **How to access:** Click "System Settings" in the sidebar

---

### For HR Staff:

When you log in, you'll see:

#### 1. **Clock-In Widget** ⏰
- **Location:** Top of your Overview/Analytics page
- **Features:**
  - Clock in/out button
  - Current status display (Active/Idle/Offline)
  - Work duration timer
  - Automatic idle detection

#### 2. **My Targets** 🎯
- **Location:** In your Overview/Analytics page
- **Features:**
  - View your assigned targets
  - Progress bars showing achievement
  - Daily/weekly/monthly targets
  - Real-time progress updates

#### 3. **My Alerts** ⚠️
- **Location:** Top of your Overview/Analytics page
- **Features:**
  - See alerts about your performance
  - Target miss notifications
  - Idle time warnings

#### 4. **Activity Timeline** 📈
- **Location:** In your Overview/Analytics page
- **Features:**
  - Hourly activity visualization
  - See your daily activity breakdown
  - Track productive hours

---

## 🚀 Getting Started

### Step 1: Run Database Migration
Before using the system, run this SQL in your Supabase SQL Editor:

```sql
-- Run the HR Performance Monitoring Schema
-- File: supabase/HR_PERFORMANCE_MONITORING_SCHEMA.sql

-- Or use the quick setup:
-- File: supabase/QUICK_ADD_OTHER_FEE.sql (for the other_fee column)
```

### Step 2: Log In
1. Go to your application
2. Log in as HR Manager or HR Staff
3. Navigate to the HR Dashboard

### Step 3: For HR Staff - Clock In
1. You'll see a prompt at the top if you haven't clocked in
2. Click the "Clock In" button
3. Your work hours will now be tracked automatically

### Step 4: For HR Managers - Set Targets
1. Click "Target Management" in the sidebar
2. Select a staff member
3. Set daily/weekly/monthly targets
4. Targets will be automatically monitored

---

## 📱 Mobile Access

The system is fully responsive! On mobile devices:
- Swipe or tap the menu icon to access the sidebar
- All features are optimized for touch
- Activity tracking works on mobile too

---

## 🔄 Automatic Features

These features run automatically in the background:

### 1. **Activity Tracking**
- Automatically logs when you:
  - View pages
  - Make calls
  - Update lead status
  - Send WhatsApp messages

### 2. **Idle Detection**
- Automatically detects when staff are idle
- Updates status in real-time
- Generates alerts for extended idle time

### 3. **Target Monitoring**
- Checks targets every hour
- Generates alerts when targets aren't met
- Updates progress in real-time

### 4. **Daily Metrics**
- Calculates daily performance metrics at 11:59 PM
- Aggregates call data, activity, and attendance
- Generates quality scores

### 5. **Auto Clock-Out**
- Automatically clocks out staff after 12 hours
- Clocks out after 2 hours of inactivity
- Generates notification alerts

---

## 🎨 Visual Indicators

### Status Colors:
- 🟢 **Green**: Active/Good performance
- 🟡 **Yellow**: Idle/Warning
- 🔴 **Red**: Offline/Alert
- 🔵 **Blue**: Information

### Alert Severity:
- 🔴 **High**: Urgent attention needed
- 🟠 **Medium**: Should be addressed soon
- 🟡 **Low**: For information

---

## 📊 Key Metrics Tracked

### For Staff:
- Total calls (daily/weekly/monthly)
- Call duration (total and average)
- Conversion rate
- Response time
- Quality score
- Active work hours
- Idle time
- Target achievement %

### For Managers:
- Team performance overview
- Staff rankings
- Attendance patterns
- Alert frequency
- Target achievement rates
- Activity distribution
- Real-time staff status

---

## 🔧 Troubleshooting

### "I can't see the new features"
1. Make sure you've run the database migration
2. Clear your browser cache
3. Log out and log back in
4. Check that you have the correct role (HR Manager or HR Staff)

### "Clock-in button not working"
1. Check your internet connection
2. Verify the database migration was successful
3. Check browser console for errors

### "Targets not showing"
1. Managers need to set targets first
2. Check that targets are set to "active"
3. Refresh the page

### "Activity not being tracked"
1. Make sure you're clocked in (for staff)
2. Check that the activity tracker service is loaded
3. Verify database permissions

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Verify database migrations are applied
3. Check Supabase logs for backend errors
4. Review the `HR_PERFORMANCE_MONITORING_README.md` for detailed documentation

---

## 🎉 You're All Set!

The HR Performance Monitoring System is now ready to use. Enjoy tracking and improving your team's performance!

---

*Last Updated: November 28, 2025*
*Version: 1.0.0*

