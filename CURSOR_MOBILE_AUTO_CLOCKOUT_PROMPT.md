# 🤖 CURSOR AI PROMPT: Implement Auto Clock-Out for HR Mobile App

## 🎯 Task

Implement automatic clock-out functionality in the HR mobile app that:
1. ✅ Automatically clocks out staff when app is closed/backgrounded
2. ✅ Tracks only actual working hours (not idle time)
3. ✅ Prevents time manipulation
4. ✅ Shows real-time work hours

---

## 📋 Requirements

### Core Features
- Auto clock-out when app goes to background
- Heartbeat system (sends "I'm alive" signal every 60 seconds)
- Real-time work hour display
- Server-side validation and backup auto clock-out

---

## 🔧 Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @react-native-community/netinfo
npm install react-native-background-timer
```

### Step 2: Create AppStateManager

Create: `src/utils/appStateManager.js`

**Key Functions:**
- `initialize(userId)` - Start tracking for user
- `handleAppStateChange()` - Auto clock-out when app backgrounds
- `startHeartbeat()` - Send heartbeat every 60 seconds
- `autoClockOut()` - Clock out user automatically

**Implementation:**
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
    AppState.addEventListener('change', this.handleAppStateChange);
    this.startHeartbeat();
  }

  handleAppStateChange = async (nextAppState) => {
    // Auto clock-out when going to background
    if (
      this.appState.match(/active/) &&
      nextAppState.match(/inactive|background/)
    ) {
      await this.autoClockOut();
      this.stopHeartbeat();
    }
    
    if (
      this.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      await this.checkClockInStatus();
    }
    
    this.appState = nextAppState;
  };

  startHeartbeat = () => {
    this.heartbeatInterval = setInterval(async () => {
      if (this.activeAttendanceId) {
        await this.sendHeartbeat();
      }
    }, 60000); // Every 60 seconds
  };

  sendHeartbeat = async () => {
    await supabase
      .from('hr_staff_attendance')
      .update({
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', this.activeAttendanceId);
  };

  autoClockOut = async () => {
    const { data: attendance } = await supabase
      .from('hr_staff_attendance')
      .select('*')
      .eq('staff_user_id', this.userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!attendance) return;

    const clockOutTime = new Date();
    const clockInTime = new Date(attendance.clock_in_time);
    const durationSeconds = Math.floor((clockOutTime - clockInTime) / 1000);

    await supabase
      .from('hr_staff_attendance')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        total_work_duration_seconds: durationSeconds,
        is_active: false,
        auto_clocked_out: true
      })
      .eq('id', attendance.id);

    this.activeAttendanceId = null;
  };

  cleanup = () => {
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.stopHeartbeat();
  };
}

export default new AppStateManager();
```

### Step 3: Update Clock In/Out Functions

Update: `src/api/attendance.js`

```javascript
import appStateManager from '../utils/appStateManager';

export const clockIn = async (userId) => {
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

  // Start tracking
  appStateManager.setActiveAttendanceId(attendance.id);
  appStateManager.startHeartbeat();

  return attendance;
};

export const clockOut = async (userId) => {
  const { data: attendance } = await supabase
    .from('hr_staff_attendance')
    .select('*')
    .eq('staff_user_id', userId)
    .eq('is_active', true)
    .single();

  const clockOutTime = new Date();
  const clockInTime = new Date(attendance.clock_in_time);
  const durationSeconds = Math.floor((clockOutTime - clockInTime) / 1000);

  const { data: updated, error } = await supabase
    .from('hr_staff_attendance')
    .update({
      clock_out_time: clockOutTime.toISOString(),
      total_work_duration_seconds: durationSeconds,
      is_active: false
    })
    .eq('id', attendance.id)
    .select()
    .single();

  // Stop tracking
  appStateManager.setActiveAttendanceId(null);
  appStateManager.stopHeartbeat();

  return updated;
};
```

### Step 4: Create Real-Time Work Hours Display

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

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(clockInTime);
      const seconds = Math.floor((now - start) / 1000);
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      setWorkHours(`${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [clockInTime, isActive]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hours Worked:</Text>
      <Text style={styles.hours}>{workHours}</Text>
    </View>
  );
};

export default WorkHoursDisplay;
```

### Step 5: Integrate in App.js

```javascript
import appStateManager from './src/utils/appStateManager';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        appStateManager.initialize(user.id);
      }
    };

    initUser();

    return () => {
      appStateManager.cleanup();
    };
  }, []);

  return (
    // Your app
  );
}
```

---

## 🗄️ Database Changes Required

### SQL to Run in Supabase

```sql
-- 1. Add heartbeat columns
ALTER TABLE hr_staff_attendance 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_clocked_out BOOLEAN DEFAULT false;

-- 2. Create backup auto clock-out function
CREATE OR REPLACE FUNCTION auto_clockout_inactive_sessions()
RETURNS void AS $$
DECLARE
  inactive_record RECORD;
BEGIN
  FOR inactive_record IN 
    SELECT *
    FROM hr_staff_attendance
    WHERE is_active = true
    AND (
      last_heartbeat IS NULL 
      OR last_heartbeat < (NOW() - INTERVAL '3 minutes')
    )
  LOOP
    UPDATE hr_staff_attendance
    SET 
      clock_out_time = COALESCE(last_heartbeat, NOW()),
      total_work_duration_seconds = EXTRACT(EPOCH FROM (
        COALESCE(last_heartbeat, NOW()) - clock_in_time
      ))::INTEGER,
      is_active = false,
      auto_clocked_out = true
    WHERE id = inactive_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Schedule cron job (run every 2 minutes)
SELECT cron.schedule(
  'auto-clockout-inactive',
  '*/2 * * * *',
  $$SELECT auto_clockout_inactive_sessions()$$
);

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_hr_staff_attendance_heartbeat 
ON hr_staff_attendance(staff_user_id, is_active, last_heartbeat);

-- 5. Create view for easy querying
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
  DATE(ha.clock_in_time) as work_date
FROM hr_staff_attendance ha
JOIN users u ON u.id = ha.staff_user_id;
```

---

## 🔒 Security Validations

```sql
-- Prevent backdating
CREATE POLICY "Cannot backdate clock-in" 
ON hr_staff_attendance
FOR INSERT
WITH CHECK (
  clock_in_time >= (NOW() - INTERVAL '5 minutes')
  AND clock_in_time <= NOW()
);

-- Max 16 hours validation
CREATE OR REPLACE FUNCTION validate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_work_duration_seconds > (16 * 3600) THEN
    RAISE EXCEPTION 'Work duration exceeds 16 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_work_hours_trigger
BEFORE INSERT OR UPDATE ON hr_staff_attendance
FOR EACH ROW
EXECUTE FUNCTION validate_work_hours();
```

---

## 📱 Dashboard Integration

Update Dashboard Screen to show work hours:

```javascript
function StaffDashboard() {
  const [clockInStatus, setClockInStatus] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await getClockInStatus(user.id);
      setClockInStatus(status);
    };
    checkStatus();
  }, []);

  return (
    <View>
      {/* Clock In/Out Button */}
      <Button onPress={clockInStatus?.isClockedIn ? handleClockOut : handleClockIn}>
        {clockInStatus?.isClockedIn ? 'Clock Out' : 'Clock In'}
      </Button>

      {/* Real-time Work Hours */}
      {clockInStatus?.isClockedIn && (
        <WorkHoursDisplay 
          clockInTime={clockInStatus.attendance.clock_in_time}
          isActive={true}
        />
      )}
    </View>
  );
}
```

---

## ✅ Testing Checklist

Test these scenarios:

- [ ] Clock in → heartbeat starts
- [ ] Work hours display updates every second
- [ ] Put app to background → auto clock-out happens
- [ ] Kill app → server detects after 3 minutes and clocks out
- [ ] Reopen app → shows accurate total hours worked
- [ ] Cannot clock in twice
- [ ] Cannot manipulate time
- [ ] Max 16 hours enforced

---

## 📊 How It Works

```
1. Staff clocks in
   └─ Start heartbeat (every 60 seconds)
   └─ Start real-time hour display

2. App is active
   └─ Heartbeat continues
   └─ Hours display updates

3. Staff closes app
   └─ AppStateManager detects background state
   └─ Immediately clocks out
   └─ Saves actual work time

4. Backup System
   └─ Server checks every 2 minutes
   └─ If no heartbeat for 3+ minutes
   └─ Auto clocks out using last heartbeat time
```

---

## 🎯 Result

✅ Accurate work hour tracking  
✅ Auto clock-out on app close  
✅ Prevents time manipulation  
✅ Real-time display  
✅ Server-side validation  
✅ Backup auto clock-out  

---

## 📝 Summary for Implementation

1. Create `AppStateManager` - handles app state and auto clock-out
2. Update `attendance.js` - integrate with manager
3. Create `WorkHoursDisplay` - show real-time hours
4. Update `App.js` - initialize manager
5. Run SQL migrations - add columns, functions, cron
6. Test thoroughly

**Reference:** See `MOBILE_APP_AUTO_CLOCKOUT_GUIDE.md` for complete details.

---

**NOW IMPLEMENT THIS IN THE MOBILE APP!** 🚀

