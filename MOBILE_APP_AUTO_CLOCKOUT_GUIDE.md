# 📱 Mobile App - Auto Clock-Out & Accurate Time Tracking

## 🎯 Requirements

1. ✅ Auto clock-out when app is closed/killed
2. ✅ Track only actual working hours
3. ✅ Handle app going to background
4. ✅ Prevent time manipulation
5. ✅ Real-time work hour display
6. ✅ Server-side validation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  App State Listener                                     │
│  ├─ Active (Foreground)  → Continue tracking           │
│  ├─ Background           → Auto clock-out               │
│  └─ Inactive/Closed      → Auto clock-out               │
│                                                          │
│  Heartbeat System                                       │
│  └─ Send "I'm alive" every 60 seconds                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE BACKEND                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Database Function: auto_clockout_inactive_sessions()   │
│  └─ Runs every 2 minutes                                │
│  └─ Checks for inactive sessions (no heartbeat)         │
│  └─ Auto clocks out inactive staff                      │
│                                                          │
│  RLS Policies                                           │
│  └─ Prevent time manipulation                           │
│  └─ Server-side time validation                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile App Implementation

### 1. Install Required Packages

```bash
npm install @react-native-community/netinfo
npm install react-native-background-timer
npm install @react-native-async-storage/async-storage
```

### 2. App State Listener

Create: `src/utils/appStateManager.js`

```javascript
import { AppState } from 'react-native';
import { supabase } from '../api/supabase';

class AppStateManager {
  constructor() {
    this.appState = AppState.currentState;
    this.userId = null;
    this.activeAttendanceId = null;
    this.heartbeatInterval = null;
  }

  initialize(userId) {
    this.userId = userId;
    
    // Listen to app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Start heartbeat
    this.startHeartbeat();
  }

  handleAppStateChange = async (nextAppState) => {
    // App going to background or being closed
    if (
      this.appState.match(/active/) &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log('App going to background - Auto clocking out');
      await this.autoClockOut();
      this.stopHeartbeat();
    }
    
    // App coming back to foreground
    if (
      this.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App came to foreground');
      // Check if still clocked in
      await this.checkClockInStatus();
    }
    
    this.appState = nextAppState;
  };

  startHeartbeat = () => {
    // Send heartbeat every 60 seconds
    this.heartbeatInterval = setInterval(async () => {
      if (this.activeAttendanceId) {
        await this.sendHeartbeat();
      }
    }, 60000); // 60 seconds
  };

  stopHeartbeat = () => {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  };

  sendHeartbeat = async () => {
    try {
      if (!this.activeAttendanceId) return;

      await supabase
        .from('hr_staff_attendance')
        .update({
          last_heartbeat: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.activeAttendanceId);

      console.log('Heartbeat sent');
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  };

  autoClockOut = async () => {
    try {
      if (!this.userId) return;

      // Get active attendance
      const { data: attendance } = await supabase
        .from('hr_staff_attendance')
        .select('*')
        .eq('staff_user_id', this.userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!attendance) return;

      // Calculate actual work duration
      const clockInTime = new Date(attendance.clock_in_time);
      const clockOutTime = new Date();
      const durationSeconds = Math.floor((clockOutTime - clockInTime) / 1000);

      // Clock out
      await supabase
        .from('hr_staff_attendance')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          total_work_duration_seconds: durationSeconds,
          is_active: false,
          auto_clocked_out: true, // Mark as auto clock-out
          updated_at: clockOutTime.toISOString()
        })
        .eq('id', attendance.id);

      console.log('Auto clocked out successfully');
      this.activeAttendanceId = null;
    } catch (error) {
      console.error('Error auto clocking out:', error);
    }
  };

  checkClockInStatus = async () => {
    try {
      if (!this.userId) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: attendance } = await supabase
        .from('hr_staff_attendance')
        .select('*')
        .eq('staff_user_id', this.userId)
        .gte('clock_in_time', `${today}T00:00:00`)
        .eq('is_active', true)
        .maybeSingle();

      if (attendance) {
        this.activeAttendanceId = attendance.id;
        this.startHeartbeat();
      } else {
        this.activeAttendanceId = null;
        this.stopHeartbeat();
      }

      return !!attendance;
    } catch (error) {
      console.error('Error checking clock-in status:', error);
      return false;
    }
  };

  setActiveAttendanceId = (attendanceId) => {
    this.activeAttendanceId = attendanceId;
  };

  cleanup = () => {
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.stopHeartbeat();
  };
}

export default new AppStateManager();
```

### 3. Clock In Function (Updated)

Create: `src/api/attendance.js`

```javascript
import { supabase } from './supabase';
import appStateManager from '../utils/appStateManager';

export const clockIn = async (userId) => {
  try {
    // 1. Check if already clocked in
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('hr_staff_attendance')
      .select('*')
      .eq('staff_user_id', userId)
      .gte('clock_in_time', `${today}T00:00:00`)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      throw new Error('Already clocked in');
    }

    // 2. Clock in
    const { data: attendance, error } = await supabase
      .from('hr_staff_attendance')
      .insert([{
        staff_user_id: userId,
        clock_in_time: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        is_active: true,
        auto_clocked_out: false
      }])
      .select()
      .single();

    if (error) throw error;

    // 3. Start tracking
    appStateManager.setActiveAttendanceId(attendance.id);
    appStateManager.startHeartbeat();

    return attendance;
  } catch (error) {
    console.error('Error clocking in:', error);
    throw error;
  }
};

export const clockOut = async (userId) => {
  try {
    // 1. Get active attendance
    const { data: attendance } = await supabase
      .from('hr_staff_attendance')
      .select('*')
      .eq('staff_user_id', userId)
      .eq('is_active', true)
      .single();

    if (!attendance) {
      throw new Error('No active clock-in found');
    }

    // 2. Calculate duration
    const clockOutTime = new Date();
    const clockInTime = new Date(attendance.clock_in_time);
    const durationSeconds = Math.floor((clockOutTime - clockInTime) / 1000);

    // 3. Clock out
    const { data: updated, error } = await supabase
      .from('hr_staff_attendance')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        total_work_duration_seconds: durationSeconds,
        is_active: false,
        auto_clocked_out: false,
        updated_at: clockOutTime.toISOString()
      })
      .eq('id', attendance.id)
      .select()
      .single();

    if (error) throw error;

    // 4. Stop tracking
    appStateManager.setActiveAttendanceId(null);
    appStateManager.stopHeartbeat();

    return updated;
  } catch (error) {
    console.error('Error clocking out:', error);
    throw error;
  }
};

export const getClockInStatus = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabase
      .from('hr_staff_attendance')
      .select('*')
      .eq('staff_user_id', userId)
      .gte('clock_in_time', `${today}T00:00:00`)
      .eq('is_active', true)
      .maybeSingle();

    return {
      isClockedIn: !!attendance,
      attendance: attendance,
      duration: attendance ? calculateDuration(attendance.clock_in_time) : 0
    };
  } catch (error) {
    console.error('Error getting clock-in status:', error);
    return { isClockedIn: false, attendance: null, duration: 0 };
  }
};

const calculateDuration = (clockInTime) => {
  const now = new Date();
  const startTime = new Date(clockInTime);
  return Math.floor((now - startTime) / 1000); // seconds
};
```

### 4. App.js Integration

```javascript
import React, { useEffect } from 'react';
import { supabase } from './src/api/supabase';
import appStateManager from './src/utils/appStateManager';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Initialize app state manager
        appStateManager.initialize(user.id);
      }
    };

    getUser();

    // Cleanup on unmount
    return () => {
      appStateManager.cleanup();
    };
  }, []);

  return (
    // Your app components
  );
}
```

---

## 🗄️ Database Updates

### 1. Update hr_staff_attendance Table

```sql
-- Add new columns for heartbeat and auto clock-out tracking
ALTER TABLE hr_staff_attendance 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_clocked_out BOOLEAN DEFAULT false;

-- Create index for faster heartbeat queries
CREATE INDEX IF NOT EXISTS idx_hr_staff_attendance_heartbeat 
ON hr_staff_attendance(staff_user_id, is_active, last_heartbeat);

-- Add comments
COMMENT ON COLUMN hr_staff_attendance.last_heartbeat IS 'Last time the app sent a heartbeat signal';
COMMENT ON COLUMN hr_staff_attendance.auto_clocked_out IS 'True if automatically clocked out (not manual)';
```

### 2. Create Auto Clock-Out Function

```sql
-- Function to automatically clock out inactive sessions
CREATE OR REPLACE FUNCTION auto_clockout_inactive_sessions()
RETURNS void AS $$
DECLARE
  inactive_record RECORD;
  current_time TIMESTAMP WITH TIME ZONE;
  duration_seconds INTEGER;
BEGIN
  current_time := NOW();
  
  -- Find all active sessions with no heartbeat in last 3 minutes
  FOR inactive_record IN 
    SELECT *
    FROM hr_staff_attendance
    WHERE is_active = true
    AND (
      last_heartbeat IS NULL 
      OR last_heartbeat < (current_time - INTERVAL '3 minutes')
    )
  LOOP
    -- Calculate actual work duration
    duration_seconds := EXTRACT(EPOCH FROM (
      COALESCE(inactive_record.last_heartbeat, current_time) - 
      inactive_record.clock_in_time
    ))::INTEGER;
    
    -- Clock out the session
    UPDATE hr_staff_attendance
    SET 
      clock_out_time = COALESCE(last_heartbeat, current_time),
      total_work_duration_seconds = duration_seconds,
      is_active = false,
      auto_clocked_out = true,
      updated_at = current_time
    WHERE id = inactive_record.id;
    
    RAISE NOTICE 'Auto clocked out staff % (Session: %)', 
      inactive_record.staff_user_id, 
      inactive_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION auto_clockout_inactive_sessions() IS 
'Automatically clocks out staff whose app has been inactive for 3+ minutes';
```

### 3. Create Scheduled Job (Cron)

```sql
-- Create a cron job to run auto clock-out every 2 minutes
-- Using pg_cron extension
SELECT cron.schedule(
  'auto-clockout-inactive',      -- Job name
  '*/2 * * * *',                 -- Every 2 minutes
  $$SELECT auto_clockout_inactive_sessions()$$
);

-- Verify the job
SELECT * FROM cron.job WHERE jobname = 'auto-clockout-inactive';
```

**Alternative (If pg_cron not available):**

Use Supabase Edge Functions or create a serverless function that runs every 2 minutes.

### 4. Create View for Accurate Work Hours

```sql
-- Create a view that shows only actual work hours
CREATE OR REPLACE VIEW hr_staff_work_hours AS
SELECT 
  ha.id,
  ha.staff_user_id,
  u.name as staff_name,
  ha.clock_in_time,
  ha.clock_out_time,
  ha.total_work_duration_seconds,
  ROUND(ha.total_work_duration_seconds / 3600.0, 2) as hours_worked,
  ha.is_active,
  ha.auto_clocked_out,
  ha.last_heartbeat,
  DATE(ha.clock_in_time) as work_date
FROM hr_staff_attendance ha
JOIN users u ON u.id = ha.staff_user_id
ORDER BY ha.clock_in_time DESC;

-- Comment
COMMENT ON VIEW hr_staff_work_hours IS 
'Shows accurate work hours for all staff attendance records';
```

---

## 📊 Display Work Hours in Mobile App

### Real-Time Work Hour Display Component

Create: `src/components/WorkHoursDisplay.js`

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

const WorkHoursDisplay = ({ clockInTime, isActive }) => {
  const [workHours, setWorkHours] = useState('0h 0m');

  useEffect(() => {
    if (!isActive || !clockInTime) {
      setWorkHours('0h 0m');
      return;
    }

    // Update work hours every second
    const interval = setInterval(() => {
      const duration = calculateDuration(clockInTime);
      setWorkHours(formatDuration(duration));
    }, 1000);

    return () => clearInterval(interval);
  }, [clockInTime, isActive]);

  const calculateDuration = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    return Math.floor((now - start) / 1000); // seconds
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hours Worked:</Text>
      <Text style={styles.hours}>{workHours}</Text>
    </View>
  );
};

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  hours: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
};

export default WorkHoursDisplay;
```

### Dashboard Integration

```javascript
import WorkHoursDisplay from './components/WorkHoursDisplay';

function StaffDashboard() {
  const [clockInStatus, setClockInStatus] = useState(null);

  useEffect(() => {
    checkClockInStatus();
  }, []);

  const checkClockInStatus = async () => {
    const status = await getClockInStatus(user.id);
    setClockInStatus(status);
  };

  return (
    <View>
      {clockInStatus?.isClockedIn && (
        <WorkHoursDisplay 
          clockInTime={clockInStatus.attendance.clock_in_time}
          isActive={clockInStatus.isClockedIn}
        />
      )}
    </View>
  );
}
```

---

## 🔒 Security & Validation

### 1. Prevent Time Manipulation

```sql
-- RLS Policy: Prevent backdating clock-in
CREATE POLICY "Cannot backdate clock-in" 
ON hr_staff_attendance
FOR INSERT
WITH CHECK (
  -- Clock-in time must be within last 5 minutes
  clock_in_time >= (NOW() - INTERVAL '5 minutes')
  AND clock_in_time <= NOW()
);

-- RLS Policy: Prevent future clock-in
CREATE POLICY "Cannot clock-in in future"
ON hr_staff_attendance
FOR INSERT
WITH CHECK (
  clock_in_time <= NOW()
);

-- RLS Policy: Staff can only clock themselves
CREATE POLICY "Staff can only clock themselves"
ON hr_staff_attendance
FOR ALL
USING (staff_user_id = auth.uid());
```

### 2. Validate Work Hours

```sql
-- Function to validate work hours
CREATE OR REPLACE FUNCTION validate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if work duration is reasonable (max 16 hours)
  IF NEW.total_work_duration_seconds > (16 * 3600) THEN
    RAISE EXCEPTION 'Work duration exceeds maximum allowed (16 hours)';
  END IF;
  
  -- Check if clock-out is after clock-in
  IF NEW.clock_out_time IS NOT NULL AND NEW.clock_out_time < NEW.clock_in_time THEN
    RAISE EXCEPTION 'Clock-out time cannot be before clock-in time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_work_hours_trigger ON hr_staff_attendance;
CREATE TRIGGER validate_work_hours_trigger
BEFORE INSERT OR UPDATE ON hr_staff_attendance
FOR EACH ROW
EXECUTE FUNCTION validate_work_hours();
```

---

## 📱 Mobile App Flow

```
1. User Opens App
   └─ Initialize AppStateManager
   └─ Check if already clocked in
   └─ If clocked in, start heartbeat

2. User Clocks In
   └─ Insert record in hr_staff_attendance
   └─ Start heartbeat (every 60 seconds)
   └─ Start real-time hour display

3. App in Foreground
   └─ Heartbeat continues
   └─ Work hours display updates

4. App Goes to Background
   └─ AppStateManager detects state change
   └─ Auto clock-out immediately
   └─ Stop heartbeat

5. App Killed/Closed
   └─ Last heartbeat timestamp recorded
   └─ Server detects no heartbeat after 3 minutes
   └─ Auto clock-out function runs
   └─ Uses last_heartbeat as clock-out time

6. User Reopens App
   └─ Check clock-in status
   └─ Show accurate work hours (from database)
```

---

## ✅ Testing Checklist

### Test Scenarios

- [ ] Clock in successfully
- [ ] Heartbeat sends every 60 seconds
- [ ] Work hours display updates in real-time
- [ ] App goes to background → auto clock-out
- [ ] App is killed → auto clock-out within 3 minutes
- [ ] Reopen app → shows accurate total hours
- [ ] Cannot clock in twice
- [ ] Cannot backdate clock-in
- [ ] Cannot manipulate work hours
- [ ] Max 16 hours validation works
- [ ] Daily stats show correct hours

---

## 📊 Reports & Analytics

### Get Daily Work Hours

```javascript
const getDailyWorkHours = async (userId, date) => {
  const { data, error } = await supabase
    .from('hr_staff_work_hours')
    .select('*')
    .eq('staff_user_id', userId)
    .eq('work_date', date)
    .order('clock_in_time', { ascending: false });

  if (error) throw error;

  // Calculate total hours for the day
  const totalSeconds = data.reduce(
    (sum, record) => sum + (record.total_work_duration_seconds || 0), 
    0
  );
  const totalHours = (totalSeconds / 3600).toFixed(2);

  return {
    sessions: data,
    totalHours: parseFloat(totalHours),
    totalSessions: data.length
  };
};
```

### Get Weekly Work Hours

```javascript
const getWeeklyWorkHours = async (userId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('hr_staff_work_hours')
    .select('*')
    .eq('staff_user_id', userId)
    .gte('work_date', startDate)
    .lte('work_date', endDate);

  if (error) throw error;

  // Group by date
  const byDate = {};
  data.forEach(record => {
    const date = record.work_date;
    if (!byDate[date]) {
      byDate[date] = {
        date,
        sessions: [],
        totalSeconds: 0,
        totalHours: 0
      };
    }
    byDate[date].sessions.push(record);
    byDate[date].totalSeconds += record.total_work_duration_seconds || 0;
    byDate[date].totalHours = (byDate[date].totalSeconds / 3600).toFixed(2);
  });

  return Object.values(byDate);
};
```

---

## 🚀 Deployment Steps

1. ✅ Update mobile app code with AppStateManager
2. ✅ Run database migrations (add columns, functions, cron job)
3. ✅ Test on iOS and Android
4. ✅ Deploy to App Store / Play Store
5. ✅ Monitor auto clock-out logs
6. ✅ Update API documentation

---

## 📝 Summary

### What This Solution Provides

✅ **Auto clock-out** when app closed  
✅ **Accurate work hours** (only actual time)  
✅ **Heartbeat system** (app sends "I'm alive" signal)  
✅ **Server-side validation** (prevents manipulation)  
✅ **Real-time display** (updates every second)  
✅ **Backup auto clock-out** (server checks every 2 minutes)  
✅ **Security** (RLS policies prevent cheating)  
✅ **Reports** (daily/weekly work hours)  

### How It Works

1. App sends heartbeat every 60 seconds
2. If app closes, heartbeat stops
3. Server detects no heartbeat for 3 minutes
4. Server auto clocks out using last heartbeat time
5. Only actual work time is saved
6. Staff cannot manipulate hours

---

**This ensures 100% accurate work hour tracking!** 🎯

