# 📡 HR Mobile App - Complete API Reference

## 🔐 Authentication APIs

### 1. Login
```javascript
const login = async (email, password) => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (authError) throw authError
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, name, email, role, phone')
    .eq('id', authData.user.id)
    .single()
  
  if (userError) throw userError
  
  return userData
}
```

### 2. Logout
```javascript
const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

### 3. Get Current Session
```javascript
const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return session
}
```

### 4. Check if Logged In
```javascript
const isLoggedIn = async () => {
  const session = await getSession()
  return !!session
}
```

---

## 👤 HR STAFF APIs

### Get My Leads
```javascript
const getMyLeads = async (userId, filters = {}) => {
  let query = supabase
    .from('hr_leads')
    .select('*')
    .eq('assigned_staff_user_id', userId)
    .order('created_at', { ascending: false })
  
  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

// Usage
const leads = await getMyLeads(userId, { status: 'hot_lead', search: 'ahmed' })
```

### Get Today's Stats
```javascript
const getTodayStats = async (userId) => {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('hr_staff_daily_stats')
    .select('*')
    .eq('staff_user_id', userId)
    .eq('date', today)
    .maybeSingle()
  
  if (error) throw error
  
  // Return default if no stats yet
  return data || {
    total_calls: 0,
    successful_calls: 0,
    leads_joined: 0,
    hot_leads_generated: 0,
    conversion_rate: 0,
    total_call_duration: 0,
  }
}
```

### Clock In
```javascript
const clockIn = async (userId) => {
  const { data, error } = await supabase
    .from('hr_staff_attendance')
    .insert([{
      staff_user_id: userId,
      clock_in_time: new Date().toISOString(),
      is_active: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Clock Out
```javascript
const clockOut = async (userId) => {
  // Get active attendance
  const { data: attendance } = await supabase
    .from('hr_staff_attendance')
    .select('*')
    .eq('staff_user_id', userId)
    .eq('is_active', true)
    .single()
  
  if (!attendance) throw new Error('No active clock-in found')
  
  // Calculate duration
  const clockOutTime = new Date()
  const clockInTime = new Date(attendance.clock_in_time)
  const durationSeconds = Math.floor((clockOutTime - clockInTime) / 1000)
  
  // Update record
  const { data, error } = await supabase
    .from('hr_staff_attendance')
    .update({
      clock_out_time: clockOutTime.toISOString(),
      total_work_duration_seconds: durationSeconds,
      is_active: false
    })
    .eq('id', attendance.id)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Check Clock In Status
```javascript
const checkClockInStatus = async (userId) => {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('hr_staff_attendance')
    .select('*')
    .eq('staff_user_id', userId)
    .gte('clock_in_time', `${today}T00:00:00`)
    .eq('is_active', true)
    .maybeSingle()
  
  if (error) throw error
  
  return {
    isClockedIn: !!data,
    attendance: data,
    duration: data ? getDuration(data.clock_in_time) : 0
  }
}

const getDuration = (clockInTime) => {
  const now = new Date()
  const startTime = new Date(clockInTime)
  return Math.floor((now - startTime) / 1000) // seconds
}
```

### Save Call Tracking
```javascript
const saveCallTracking = async (userId, callData) => {
  // 1. Insert call tracking
  const { data: callRecord, error: callError } = await supabase
    .from('hr_call_tracking')
    .insert([{
      lead_id: callData.leadId,
      staff_user_id: userId,
      name: callData.name,
      phone: callData.phone,
      status: callData.status,
      called_date: new Date().toISOString().split('T')[0],
      callback_date: callData.callbackDate || null,
      joining_date: callData.joiningDate || null,
      notes: callData.notes,
      source: callData.source,
      call_duration: callData.duration,
      created_at: new Date().toISOString()
    }])
    .select()
    .single()
  
  if (callError) throw callError
  
  // 2. Update lead if needed
  const updateData = {}
  if (callData.status) updateData.status = callData.status
  if (callData.joiningDate) updateData.joining_date = callData.joiningDate
  if (callData.callbackDate) updateData.callback_date = callData.callbackDate
  
  if (Object.keys(updateData).length > 0) {
    const { error: leadError } = await supabase
      .from('hr_leads')
      .update(updateData)
      .eq('id', callData.leadId)
    
    if (leadError) console.error('Error updating lead:', leadError)
  }
  
  // 3. Log activity
  await supabase.from('hr_lead_activities').insert([{
    lead_id: callData.leadId,
    staff_user_id: userId,
    activity_type: 'call_completed',
    description: `Call completed - Status: ${callData.status}`,
    metadata: { duration: callData.duration }
  }])
  
  // 4. Trigger daily stats aggregation
  const today = new Date().toISOString().split('T')[0]
  await supabase.rpc('aggregate_daily_stats', {
    p_staff_user_id: userId,
    p_date: today
  })
  
  return callRecord
}

// Usage
const result = await saveCallTracking(userId, {
  leadId: 'lead-uuid',
  name: 'Ahmed Mohammed',
  phone: '+971501234567',
  status: 'hot_lead',
  callbackDate: '2025-11-29',
  joiningDate: null,
  notes: 'Very interested',
  source: 'whatsapp',
  duration: 180 // seconds
})
```

### Get Call History
```javascript
const getCallHistory = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('hr_call_tracking')
    .select('*')
    .eq('staff_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}
```

### Get My WhatsApp Numbers
```javascript
const getMyWhatsAppNumbers = async (userId) => {
  const { data, error } = await supabase
    .from('hr_whatsapp_numbers')
    .select('*')
    .eq('assigned_staff_user_id', userId)
    .eq('is_active', true)
  
  if (error) throw error
  return data
}
```

### Get Daily History
```javascript
const getDailyHistory = async (userId, days = 7) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('hr_staff_daily_stats')
    .select('*')
    .eq('staff_user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}
```

### Get Lead Statuses
```javascript
const getLeadStatuses = async () => {
  const { data, error } = await supabase
    .from('hr_lead_statuses')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) throw error
  return data
}
```

### Get My Targets
```javascript
const getMyTargets = async (userId) => {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('hr_staff_targets')
    .select('*')
    .eq('staff_user_id', userId)
    .gte('end_date', today)
    .order('end_date', { ascending: true })
  
  if (error) throw error
  return data
}
```

---

## 👔 HR MANAGER APIs

### Get All Staff
```javascript
const getAllStaff = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, created_at')
    .eq('role', 'hr_staff')
    .order('name', { ascending: true })
  
  if (error) throw error
  return data
}
```

### Get Staff Details
```javascript
const getStaffDetails = async (staffId) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', staffId)
    .single()
  
  if (userError) throw userError
  
  // Get today's stats
  const today = new Date().toISOString().split('T')[0]
  const { data: todayStats } = await supabase
    .from('hr_staff_daily_stats')
    .select('*')
    .eq('staff_user_id', staffId)
    .eq('date', today)
    .maybeSingle()
  
  // Get assigned leads count
  const { count: leadsCount } = await supabase
    .from('hr_leads')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_staff_user_id', staffId)
  
  // Get assigned WhatsApp numbers
  const { data: whatsappNumbers } = await supabase
    .from('hr_whatsapp_numbers')
    .select('phone')
    .eq('assigned_staff_user_id', staffId)
    .eq('is_active', true)
  
  return {
    user,
    todayStats: todayStats || {},
    leadsCount: leadsCount || 0,
    whatsappNumbers: whatsappNumbers || []
  }
}
```

### Get All Leads
```javascript
const getAllLeads = async (filters = {}) => {
  let query = supabase
    .from('hr_leads')
    .select(`
      *,
      assigned_staff:users!assigned_staff_user_id(id, name)
    `)
    .order('created_at', { ascending: false })
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.staffId) {
    query = query.eq('assigned_staff_user_id', filters.staffId)
  }
  
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}
```

### Assign Lead to Staff
```javascript
const assignLeadToStaff = async (leadId, staffUserId) => {
  const { data, error } = await supabase
    .from('hr_leads')
    .update({ assigned_staff_user_id: staffUserId })
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Bulk Assign Leads
```javascript
const bulkAssignLeads = async (leadIds, staffUserId) => {
  const { data, error } = await supabase
    .from('hr_leads')
    .update({ assigned_staff_user_id: staffUserId })
    .in('id', leadIds)
    .select()
  
  if (error) throw error
  return data
}
```

### Get Team Performance
```javascript
const getTeamPerformance = async (startDate, endDate = null) => {
  const endDateStr = endDate || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('hr_call_tracking')
    .select('staff_user_id, call_duration, status, called_date, source')
    .gte('called_date', startDate)
    .lte('called_date', endDateStr)
    .order('called_date', { ascending: false })
  
  if (error) throw error
  
  // Aggregate by staff
  const staffMetrics = {}
  data.forEach(call => {
    if (!staffMetrics[call.staff_user_id]) {
      staffMetrics[call.staff_user_id] = {
        totalCalls: 0,
        successfulCalls: 0,
        totalDuration: 0,
        joined: 0,
        hotLeads: 0
      }
    }
    
    staffMetrics[call.staff_user_id].totalCalls++
    staffMetrics[call.staff_user_id].totalDuration += call.call_duration || 0
    
    if (['joined', 'hot_lead', 'callback'].includes(call.status)) {
      staffMetrics[call.staff_user_id].successfulCalls++
    }
    
    if (call.status === 'joined') staffMetrics[call.staff_user_id].joined++
    if (call.status === 'hot_lead') staffMetrics[call.staff_user_id].hotLeads++
  })
  
  return staffMetrics
}
```

### Get Team Daily Stats
```javascript
const getTeamDailyStats = async (startDate, staffId = null) => {
  let query = supabase
    .from('hr_staff_daily_stats')
    .select(`
      *,
      staff:users!staff_user_id(name)
    `)
    .gte('date', startDate)
    .order('date', { ascending: false })
  
  if (staffId) {
    query = query.eq('staff_user_id', staffId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}
```

### Get Live Activity
```javascript
const getLiveActivity = async (hoursAgo = 24) => {
  const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('hr_lead_activities')
    .select(`
      *,
      staff:users!staff_user_id(name),
      lead:hr_leads!lead_id(name, phone)
    `)
    .gte('created_at', startTime)
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (error) throw error
  return data
}
```

### Get Staff Attendance (Today)
```javascript
const getTodayAttendance = async () => {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('hr_staff_attendance')
    .select(`
      *,
      staff:users!staff_user_id(name)
    `)
    .gte('clock_in_time', `${today}T00:00:00`)
    .order('clock_in_time', { ascending: false })
  
  if (error) throw error
  return data
}
```

### Create Target
```javascript
const createTarget = async (targetData) => {
  const { data, error } = await supabase
    .from('hr_staff_targets')
    .insert([{
      staff_user_id: targetData.staffUserId,
      target_type: targetData.type, // 'daily', 'weekly', 'monthly'
      metric_name: targetData.metric, // 'calls', 'conversions', 'joined'
      target_value: targetData.value,
      current_value: 0,
      start_date: targetData.startDate,
      end_date: targetData.endDate
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Usage
const target = await createTarget({
  staffUserId: 'staff-uuid',
  type: 'daily',
  metric: 'calls',
  value: 50,
  startDate: '2025-11-28',
  endDate: '2025-11-28'
})
```

### Update Target
```javascript
const updateTarget = async (targetId, updates) => {
  const { data, error } = await supabase
    .from('hr_staff_targets')
    .update(updates)
    .eq('id', targetId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Delete Target
```javascript
const deleteTarget = async (targetId) => {
  const { error } = await supabase
    .from('hr_staff_targets')
    .delete()
    .eq('id', targetId)
  
  if (error) throw error
}
```

### Get All Targets
```javascript
const getAllTargets = async (activeOnly = true) => {
  let query = supabase
    .from('hr_staff_targets')
    .select(`
      *,
      staff:users!staff_user_id(name)
    `)
    .order('end_date', { ascending: true })
  
  if (activeOnly) {
    const today = new Date().toISOString().split('T')[0]
    query = query.gte('end_date', today)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}
```

### Add WhatsApp Number
```javascript
const addWhatsAppNumber = async (phone, staffUserId) => {
  const { data, error } = await supabase
    .from('hr_whatsapp_numbers')
    .insert([{
      phone,
      assigned_staff_user_id: staffUserId,
      is_active: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Reassign WhatsApp Number
```javascript
const reassignWhatsAppNumber = async (numberId, newStaffUserId) => {
  const { data, error } = await supabase
    .from('hr_whatsapp_numbers')
    .update({ assigned_staff_user_id: newStaffUserId })
    .eq('id', numberId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Get Joining Calendar
```javascript
const getJoiningCalendar = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('hr_leads')
    .select(`
      *,
      assigned_staff:users!assigned_staff_user_id(name)
    `)
    .not('joining_date', 'is', null)
    .gte('joining_date', startDate)
    .lte('joining_date', endDate)
    .order('joining_date', { ascending: true })
  
  if (error) throw error
  return data
}

// Usage - Get this month's joining dates
const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  .toISOString().split('T')[0]
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  .toISOString().split('T')[0]

const joiningLeads = await getJoiningCalendar(startOfMonth, endOfMonth)
```

---

## 🔔 Real-time Subscriptions (Optional)

### Subscribe to New Activities
```javascript
const subscribeToActivities = (callback) => {
  const subscription = supabase
    .channel('activities')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hr_lead_activities'
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()
  
  return subscription
}

// Usage
const subscription = subscribeToActivities((activity) => {
  console.log('New activity:', activity)
  // Update UI
})

// Unsubscribe when done
subscription.unsubscribe()
```

### Subscribe to Staff Status Changes
```javascript
const subscribeToAttendance = (callback) => {
  const subscription = supabase
    .channel('attendance')
    .on(
      'postgres_changes',
      {
        event: '*', // All events
        schema: 'public',
        table: 'hr_staff_attendance'
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()
  
  return subscription
}
```

---

## 🛠️ Utility Functions

### Format Phone Number
```javascript
const formatPhoneNumber = (phone) => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Format as +971-XX-XXX-XXXX
  if (cleaned.startsWith('971')) {
    return `+${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`
  }
  
  return phone
}
```

### Format Duration
```javascript
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}
```

### Format Date
```javascript
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

### Calculate Conversion Rate
```javascript
const calculateConversionRate = (successful, total) => {
  if (total === 0) return 0
  return Math.round((successful / total) * 100)
}
```

### Get Status Color
```javascript
const getStatusColor = (status) => {
  const colors = {
    'joined': '#10B981',        // Green
    'hot_lead': '#F59E0B',      // Orange
    'callback': '#8B5CF6',      // Purple
    'contacted': '#3B82F6',     // Blue
    'not_interested': '#EF4444', // Red
    'call_not_picked': '#9CA3AF', // Gray
  }
  return colors[status] || '#6B7280'
}
```

### Get Today's Date String
```javascript
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0]
}
```

### Get Date Range
```javascript
const getDateRange = (days) => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

// Usage
const { startDate, endDate } = getDateRange(7) // Last 7 days
```

---

## 📦 Complete API Service Example

```javascript
// api/hrService.js
import { supabase } from './supabase'

class HRService {
  // Authentication
  async login(email, password) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    return user
  }
  
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
  
  // HR Staff APIs
  async getMyLeads(userId, filters = {}) {
    let query = supabase
      .from('hr_leads')
      .select('*')
      .eq('assigned_staff_user_id', userId)
    
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  
  async getTodayStats(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('hr_staff_daily_stats')
      .select('*')
      .eq('staff_user_id', userId)
      .eq('date', today)
      .maybeSingle()
    
    return data || {}
  }
  
  async saveCall(userId, callData) {
    // Insert call tracking
    const { data: call, error } = await supabase
      .from('hr_call_tracking')
      .insert([{
        lead_id: callData.leadId,
        staff_user_id: userId,
        name: callData.name,
        phone: callData.phone,
        status: callData.status,
        called_date: new Date().toISOString().split('T')[0],
        callback_date: callData.callbackDate || null,
        joining_date: callData.joiningDate || null,
        notes: callData.notes,
        source: callData.source,
        call_duration: callData.duration
      }])
      .select()
      .single()
    
    if (error) throw error
    
    // Update lead
    if (callData.status || callData.joiningDate || callData.callbackDate) {
      const updates = {}
      if (callData.status) updates.status = callData.status
      if (callData.joiningDate) updates.joining_date = callData.joiningDate
      if (callData.callbackDate) updates.callback_date = callData.callbackDate
      
      await supabase
        .from('hr_leads')
        .update(updates)
        .eq('id', callData.leadId)
    }
    
    // Aggregate daily stats
    await supabase.rpc('aggregate_daily_stats', {
      p_staff_user_id: userId,
      p_date: new Date().toISOString().split('T')[0]
    })
    
    return call
  }
  
  // HR Manager APIs
  async getAllStaff() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'hr_staff')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  }
  
  async getTeamPerformance(startDate) {
    const { data, error } = await supabase
      .from('hr_staff_daily_stats')
      .select(`
        *,
        staff:users!staff_user_id(name)
      `)
      .gte('date', startDate)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data
  }
}

export default new HRService()
```

---

This API reference provides all the functions needed to build the mobile app! 🚀

