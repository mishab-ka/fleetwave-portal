# 🕵️ Web App - HR Staff Manipulation Monitoring System

## 🎯 Overview

Complete monitoring system to detect and prevent HR staff manipulation, integrated with the mobile app's heartbeat and activity tracking.

---

## 📊 What You Can Monitor

### 1. **Time Manipulation**
- Staff keeping timer running without actually working
- Backdating clock-in times
- Extended idle periods while clocked in

### 2. **Activity Manipulation**
- Low app usage vs. claimed work hours
- Excessive background time
- No calls made while clocked in

### 3. **Productivity Manipulation**
- Fake call entries
- Inflated work hours
- Pattern anomalies

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP                            │
│  • Heartbeat every 60 seconds                           │
│  • Activity logging (app open/close, calls)             │
│  • Active vs Background time tracking                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE DATABASE                       │
│  • hr_staff_attendance (heartbeat, active time)         │
│  • hr_staff_activity_log (all activities)               │
│  • hr_call_tracking (call records)                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    WEB DASHBOARD                         │
│  • Real-time Monitoring                                 │
│  • Manipulation Alerts                                  │
│  • Productivity Analytics                               │
│  • Reports & Exports                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Manipulation Detection Algorithms

### Algorithm 1: Idle Time Detection

```javascript
/**
 * Detects staff who are clocked in but have low activity
 */
async function detectIdleStaff() {
  const now = new Date();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  
  const { data: activeStaff } = await supabase
    .from('hr_staff_attendance')
    .select(`
      id,
      staff_user_id,
      clock_in_time,
      last_activity_time,
      active_work_seconds,
      background_seconds,
      users:staff_user_id (name, email_id)
    `)
    .eq('is_active', true)
    .lt('clock_in_time', twoHoursAgo);
  
  const alerts = [];
  
  for (const staff of activeStaff || []) {
    const totalSeconds = staff.active_work_seconds + staff.background_seconds;
    const activePercentage = totalSeconds > 0 
      ? (staff.active_work_seconds / totalSeconds) * 100 
      : 0;
    
    const lastActivityMinutes = Math.floor(
      (now - new Date(staff.last_activity_time)) / 60000
    );
    
    // Alert 1: Very low active percentage (< 40%)
    if (activePercentage < 40 && totalSeconds > 3600) {
      alerts.push({
        type: 'LOW_ACTIVE_TIME',
        severity: 'HIGH',
        staff_id: staff.staff_user_id,
        staff_name: staff.users.name,
        staff_email: staff.users.email_id,
        message: `Only ${activePercentage.toFixed(1)}% active time`,
        details: {
          active_seconds: staff.active_work_seconds,
          background_seconds: staff.background_seconds,
          active_percentage: activePercentage,
          clock_in_time: staff.clock_in_time
        }
      });
    }
    
    // Alert 2: No activity for 30+ minutes
    if (lastActivityMinutes > 30) {
      alerts.push({
        type: 'EXTENDED_IDLE',
        severity: 'HIGH',
        staff_id: staff.staff_user_id,
        staff_name: staff.users.name,
        staff_email: staff.users.email_id,
        message: `No activity for ${lastActivityMinutes} minutes`,
        details: {
          last_activity: staff.last_activity_time,
          minutes_idle: lastActivityMinutes
        }
      });
    }
  }
  
  return alerts;
}
```

### Algorithm 2: No Call Activity Detection

```javascript
/**
 * Detects staff who haven't made calls in extended period
 */
async function detectNoCallActivity() {
  const now = new Date();
  const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];
  
  // Get all active staff
  const { data: activeStaff } = await supabase
    .from('hr_staff_attendance')
    .select(`
      staff_user_id,
      clock_in_time,
      users:staff_user_id (name, email_id)
    `)
    .eq('is_active', true)
    .lt('clock_in_time', threeHoursAgo);
  
  const alerts = [];
  
  for (const staff of activeStaff || []) {
    // Check if they've made any calls today
    const { count } = await supabase
      .from('hr_call_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('staff_user_id', staff.staff_user_id)
      .gte('called_date', today);
    
    if (count === 0) {
      const hoursWorked = Math.floor(
        (now - new Date(staff.clock_in_time)) / 3600000
      );
      
      alerts.push({
        type: 'NO_CALLS_MADE',
        severity: 'CRITICAL',
        staff_id: staff.staff_user_id,
        staff_name: staff.users.name,
        staff_email: staff.users.email_id,
        message: `No calls made in ${hoursWorked} hours of work`,
        details: {
          clock_in_time: staff.clock_in_time,
          hours_worked: hoursWorked,
          calls_made: 0
        }
      });
    }
  }
  
  return alerts;
}
```

### Algorithm 3: Timer Manipulation Detection

```javascript
/**
 * Detects suspicious timer patterns
 */
async function detectTimerManipulation() {
  const alerts = [];
  
  // Alert 1: Timer running overnight (> 16 hours)
  const { data: overnightTimers } = await supabase
    .from('hr_staff_attendance')
    .select(`
      id,
      staff_user_id,
      clock_in_time,
      users:staff_user_id (name, email_id)
    `)
    .eq('is_active', true);
  
  for (const staff of overnightTimers || []) {
    const hoursRunning = (Date.now() - new Date(staff.clock_in_time)) / 3600000;
    
    if (hoursRunning > 16) {
      alerts.push({
        type: 'OVERNIGHT_TIMER',
        severity: 'CRITICAL',
        staff_id: staff.staff_user_id,
        staff_name: staff.users.name,
        staff_email: staff.users.email_id,
        message: `Timer running for ${hoursRunning.toFixed(1)} hours`,
        details: {
          clock_in_time: staff.clock_in_time,
          hours_running: hoursRunning
        }
      });
    }
  }
  
  // Alert 2: Excessive background time
  const { data: highBackgroundStaff } = await supabase
    .from('hr_staff_attendance')
    .select(`
      staff_user_id,
      active_work_seconds,
      background_seconds,
      users:staff_user_id (name, email_id)
    `)
    .eq('is_active', true);
  
  for (const staff of highBackgroundStaff || []) {
    const totalSeconds = staff.active_work_seconds + staff.background_seconds;
    const backgroundPercentage = totalSeconds > 0
      ? (staff.background_seconds / totalSeconds) * 100
      : 0;
    
    if (backgroundPercentage > 70 && totalSeconds > 3600) {
      alerts.push({
        type: 'EXCESSIVE_BACKGROUND_TIME',
        severity: 'HIGH',
        staff_id: staff.staff_user_id,
        staff_name: staff.users.name,
        staff_email: staff.users.email_id,
        message: `${backgroundPercentage.toFixed(1)}% time in background`,
        details: {
          background_percentage: backgroundPercentage,
          background_seconds: staff.background_seconds,
          active_seconds: staff.active_work_seconds
        }
      });
    }
  }
  
  return alerts;
}
```

### Algorithm 4: Pattern Anomaly Detection

```javascript
/**
 * Detects unusual patterns compared to historical behavior
 */
async function detectPatternAnomalies(staffUserId) {
  // Get last 7 days average
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: historicalData } = await supabase
    .from('hr_staff_daily_stats')
    .select('*')
    .eq('staff_user_id', staffUserId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
  
  if (!historicalData || historicalData.length < 3) {
    return null; // Not enough data
  }
  
  // Calculate averages
  const avgCalls = historicalData.reduce((sum, d) => sum + d.total_calls, 0) / historicalData.length;
  const avgConversion = historicalData.reduce((sum, d) => sum + d.conversion_rate, 0) / historicalData.length;
  const avgWorkHours = historicalData.reduce((sum, d) => sum + d.total_work_hours, 0) / historicalData.length;
  
  // Get today's data
  const { data: todayData } = await supabase
    .from('hr_staff_daily_stats')
    .select('*')
    .eq('staff_user_id', staffUserId)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();
  
  if (!todayData) return null;
  
  const alerts = [];
  
  // Alert: Calls significantly lower than average
  if (todayData.total_calls < avgCalls * 0.5) {
    alerts.push({
      type: 'LOW_CALL_VOLUME',
      severity: 'MEDIUM',
      message: `Only ${todayData.total_calls} calls vs avg ${avgCalls.toFixed(0)}`,
      details: {
        today_calls: todayData.total_calls,
        avg_calls: avgCalls,
        deviation: ((todayData.total_calls / avgCalls - 1) * 100).toFixed(1)
      }
    });
  }
  
  // Alert: Work hours significantly higher than average
  if (todayData.total_work_hours > avgWorkHours * 1.5) {
    alerts.push({
      type: 'EXCESSIVE_WORK_HOURS',
      severity: 'HIGH',
      message: `${todayData.total_work_hours.toFixed(1)}h vs avg ${avgWorkHours.toFixed(1)}h`,
      details: {
        today_hours: todayData.total_work_hours,
        avg_hours: avgWorkHours,
        deviation: ((todayData.total_work_hours / avgWorkHours - 1) * 100).toFixed(1)
      }
    });
  }
  
  return alerts;
}
```

---

## 📊 Real-Time Monitoring Dashboard

### Main Monitoring Component

```javascript
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const StaffManipulationMonitor = () => {
  const [alerts, setAlerts] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadMonitoringData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    
    // Real-time subscriptions
    const subscription = supabase
      .channel('monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hr_staff_attendance'
      }, () => {
        loadMonitoringData();
      })
      .subscribe();
    
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);
  
  const loadMonitoringData = async () => {
    setLoading(true);
    
    try {
      // Run all detection algorithms
      const [idleAlerts, noCallAlerts, timerAlerts] = await Promise.all([
        detectIdleStaff(),
        detectNoCallActivity(),
        detectTimerManipulation()
      ]);
      
      // Combine all alerts
      const allAlerts = [
        ...idleAlerts,
        ...noCallAlerts,
        ...timerAlerts
      ].sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      
      setAlerts(allAlerts);
      
      // Load active staff
      const { data } = await supabase
        .from('hr_staff_attendance')
        .select(`
          *,
          users:staff_user_id (name, email_id)
        `)
        .eq('is_active', true)
        .gte('clock_in_time', new Date().toISOString().split('T')[0]);
      
      setActiveStaff(data || []);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'bg-red-100 border-red-500 text-red-900',
      HIGH: 'bg-orange-100 border-orange-500 text-orange-900',
      MEDIUM: 'bg-yellow-100 border-yellow-500 text-yellow-900',
      LOW: 'bg-blue-100 border-blue-500 text-blue-900'
    };
    return colors[severity] || colors.MEDIUM;
  };
  
  const formatSeconds = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🕵️ Staff Manipulation Monitoring
          </h1>
          <p className="text-gray-600">
            Real-time detection of suspicious behavior and time manipulation
          </p>
        </div>
        <button
          onClick={loadMonitoringData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            🚨 Active Alerts ({alerts.length})
          </h2>
        </div>
        
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">✅ No manipulation detected</p>
            <p className="text-sm">All staff activity looks normal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`border-l-4 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-sm">
                        {alert.severity}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white/50 rounded">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base mb-1">
                      {alert.staff_name}
                    </h3>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <p className="text-xs opacity-75">{alert.staff_email}</p>
                  </div>
                  <button className="px-3 py-1 bg-white rounded text-sm font-medium hover:bg-gray-50">
                    Take Action
                  </button>
                </div>
                
                {/* Details */}
                {alert.details && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium opacity-75 hover:opacity-100">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-white/30 rounded text-xs overflow-x-auto">
                      {JSON.stringify(alert.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Active Staff Monitoring */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          👥 Currently Working Staff ({activeStaff.length})
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeStaff.map((staff) => {
            const totalSeconds = staff.active_work_seconds + staff.background_seconds;
            const activePercentage = totalSeconds > 0
              ? ((staff.active_work_seconds / totalSeconds) * 100).toFixed(1)
              : 0;
            
            const lastActivityMinutes = Math.floor(
              (Date.now() - new Date(staff.last_activity_time)) / 60000
            );
            
            const isActive = lastActivityMinutes < 2;
            
            return (
              <div
                key={staff.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">
                      {staff.users.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {staff.users.email_id}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {isActive ? '🟢 Active' : '⚪ Idle'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Time:</span>
                    <span className="font-medium">
                      {formatSeconds(staff.active_work_seconds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Background:</span>
                    <span className="font-medium">
                      {formatSeconds(staff.background_seconds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active %:</span>
                    <span
                      className={`font-bold ${
                        activePercentage >= 70
                          ? 'text-green-600'
                          : activePercentage >= 50
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {activePercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Last Activity:</span>
                    <span>{lastActivityMinutes}m ago</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StaffManipulationMonitor;
```

---

## 📈 Productivity Analytics Dashboard

```javascript
const ProductivityAnalytics = () => {
  const [staffPerformance, setStaffPerformance] = useState([]);
  
  useEffect(() => {
    loadProductivityData();
  }, []);
  
  const loadProductivityData = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('hr_staff_attendance')
      .select(`
        staff_user_id,
        clock_in_time,
        active_work_seconds,
        background_seconds,
        users:staff_user_id (name, email_id)
      `)
      .eq('is_active', true)
      .gte('clock_in_time', `${today}T00:00:00`);
    
    // Get call counts
    const enrichedData = await Promise.all(
      (data || []).map(async (staff) => {
        const { count: callCount } = await supabase
          .from('hr_call_tracking')
          .select('*', { count: 'exact', head: true })
          .eq('staff_user_id', staff.staff_user_id)
          .gte('called_date', today);
        
        const totalSeconds = staff.active_work_seconds + staff.background_seconds;
        const activePercentage = totalSeconds > 0
          ? (staff.active_work_seconds / totalSeconds) * 100
          : 0;
        
        const hoursWorked = totalSeconds / 3600;
        const callsPerHour = hoursWorked > 0 ? callCount / hoursWorked : 0;
        
        // Calculate productivity score (0-100)
        const activeScore = activePercentage * 0.6; // 60% weight
        const callScore = Math.min(callsPerHour * 10, 40); // 40% weight, max 4 calls/hour
        const productivityScore = Math.round(activeScore + callScore);
        
        return {
          ...staff,
          callCount,
          activePercentage,
          hoursWorked,
          callsPerHour,
          productivityScore
        };
      })
    );
    
    // Sort by productivity score
    enrichedData.sort((a, b) => b.productivityScore - a.productivityScore);
    
    setStaffPerformance(enrichedData);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">📊 Productivity Rankings</h2>
      
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Rank</th>
            <th className="text-left py-2">Staff</th>
            <th className="text-right py-2">Active %</th>
            <th className="text-right py-2">Calls</th>
            <th className="text-right py-2">Calls/Hour</th>
            <th className="text-right py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {staffPerformance.map((staff, index) => (
            <tr key={staff.staff_user_id} className="border-b hover:bg-gray-50">
              <td className="py-3">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </td>
              <td className="py-3">
                <div>
                  <div className="font-medium">{staff.users.name}</div>
                  <div className="text-xs text-gray-500">{staff.users.email_id}</div>
                </div>
              </td>
              <td className="text-right py-3">
                <span
                  className={`font-bold ${
                    staff.activePercentage >= 70
                      ? 'text-green-600'
                      : staff.activePercentage >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {staff.activePercentage.toFixed(1)}%
                </span>
              </td>
              <td className="text-right py-3">{staff.callCount}</td>
              <td className="text-right py-3">
                {staff.callsPerHour.toFixed(1)}
              </td>
              <td className="text-right py-3">
                <span
                  className={`px-3 py-1 rounded-full font-bold ${
                    staff.productivityScore >= 80
                      ? 'bg-green-100 text-green-800'
                      : staff.productivityScore >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {staff.productivityScore}/100
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 🔔 Alert Notification System

```javascript
// Send alert to manager
async function sendAlert(alert) {
  // Option 1: Email notification
  await supabase.functions.invoke('send-email', {
    body: {
      to: 'manager@company.com',
      subject: `[${alert.severity}] ${alert.type}`,
      html: `
        <h2>Staff Manipulation Alert</h2>
        <p><strong>Staff:</strong> ${alert.staff_name}</p>
        <p><strong>Type:</strong> ${alert.type}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <pre>${JSON.stringify(alert.details, null, 2)}</pre>
      `
    }
  });
  
  // Option 2: Save to database
  await supabase
    .from('hr_manipulation_alerts')
    .insert([{
      alert_type: alert.type,
      severity: alert.severity,
      staff_user_id: alert.staff_id,
      message: alert.message,
      details: alert.details,
      created_at: new Date().toISOString()
    }]);
  
  // Option 3: Push notification
  // Implement with your preferred service
}
```

---

## 📊 Reports & Export

### Daily Manipulation Report

```javascript
async function generateDailyReport(date) {
  const dateStr = date.toISOString().split('T')[0];
  
  // Get all alerts for the day
  const { data: alerts } = await supabase
    .from('hr_manipulation_alerts')
    .select('*')
    .gte('created_at', `${dateStr}T00:00:00`)
    .lt('created_at', `${dateStr}T23:59:59`);
  
  // Get all attendance records
  const { data: attendance } = await supabase
    .from('hr_staff_attendance')
    .select(`
      *,
      users:staff_user_id (name, email_id)
    `)
    .gte('clock_in_time', `${dateStr}T00:00:00`);
  
  // Calculate statistics
  const totalStaff = attendance?.length || 0;
  const staffWithAlerts = new Set(alerts?.map(a => a.staff_user_id)).size;
  const criticalAlerts = alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
  
  const avgActivePercentage = attendance?.length > 0
    ? attendance.reduce((sum, a) => {
        const total = a.active_work_seconds + a.background_seconds;
        return sum + (total > 0 ? (a.active_work_seconds / total) * 100 : 0);
      }, 0) / attendance.length
    : 0;
  
  return {
    date: dateStr,
    total_staff: totalStaff,
    staff_with_alerts: staffWithAlerts,
    total_alerts: alerts?.length || 0,
    critical_alerts: criticalAlerts,
    avg_active_percentage: avgActivePercentage.toFixed(1),
    alerts: alerts,
    attendance: attendance
  };
}
```

---

## 🗄️ Database Schema Updates

### Create Alerts Table

```sql
-- Table to store manipulation alerts
CREATE TABLE IF NOT EXISTS hr_manipulation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  staff_user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  details JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_manipulation_alerts_staff ON hr_manipulation_alerts(staff_user_id);
CREATE INDEX idx_manipulation_alerts_date ON hr_manipulation_alerts(created_at);
CREATE INDEX idx_manipulation_alerts_type ON hr_manipulation_alerts(alert_type);
CREATE INDEX idx_manipulation_alerts_severity ON hr_manipulation_alerts(severity);

-- RLS
ALTER TABLE hr_manipulation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view all alerts"
ON hr_manipulation_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);
```

---

## ✅ Implementation Checklist

### Phase 1: Database Setup
- [ ] Run SQL migrations
- [ ] Create alerts table
- [ ] Set up RLS policies
- [ ] Create indexes

### Phase 2: Backend Functions
- [ ] Implement detection algorithms
- [ ] Create alert notification system
- [ ] Set up scheduled jobs (run every 5 minutes)

### Phase 3: Frontend Dashboard
- [ ] Create monitoring dashboard component
- [ ] Add real-time subscriptions
- [ ] Implement productivity analytics
- [ ] Create reports page

### Phase 4: Testing
- [ ] Test all detection algorithms
- [ ] Verify alerts are generated
- [ ] Test real-time updates
- [ ] Export test reports

---

## 🎯 Quick Start

1. **Add to HRDashboard.tsx:**

```tsx
import StaffManipulationMonitor from './StaffManipulationMonitor';

// Add new tab
{
  id: "manipulation_monitoring",
  label: "Manipulation Monitor",
  icon: <Shield className="w-4 h-4" />,
}

// Add render
{activeTab === "manipulation_monitoring" &&
  (userRole === "hr_manager" || userRole === "admin") && (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <StaffManipulationMonitor />
    </div>
  )}
```

2. **Create Scheduled Job:**

```javascript
// Run every 5 minutes
setInterval(async () => {
  const alerts = await Promise.all([
    detectIdleStaff(),
    detectNoCallActivity(),
    detectTimerManipulation()
  ]);
  
  const allAlerts = alerts.flat();
  
  // Send notifications for critical alerts
  const criticalAlerts = allAlerts.filter(a => a.severity === 'CRITICAL');
  for (const alert of criticalAlerts) {
    await sendAlert(alert);
  }
}, 5 * 60 * 1000);
```

---

## 📊 Expected Results

After implementation, you'll be able to:

✅ **Detect manipulation in real-time**  
✅ **Get instant alerts** for suspicious behavior  
✅ **Monitor active vs background time**  
✅ **Track call productivity**  
✅ **Compare staff performance**  
✅ **Generate daily/weekly reports**  
✅ **Export data for analysis**  
✅ **Take action on alerts**  

---

**You now have a complete manipulation monitoring system!** 🕵️🔒

This will help you:
- Catch staff manipulating work hours
- Ensure actual productivity
- Maintain accurate time tracking
- Improve team performance
- Prevent time theft

---

*All detection algorithms are configurable and can be adjusted based on your company's policies.*

