# 🚀 HR Monitoring - Quick Start (2 Minutes)

## ⚠️ You're getting errors because the database tables don't exist yet!

---

## 📋 **3 Simple Steps:**

### **1️⃣ Open Supabase SQL Editor**
- Go to: https://supabase.com/dashboard
- Select your project
- Click **"SQL Editor"** in left sidebar
- Click **"New Query"**

---

### **2️⃣ Copy & Run This File**

Open this file in your project:
```
supabase/HR_SCHEMA_CLEAN.sql
```

**Copy ALL of it** and paste into Supabase SQL Editor, then click **"Run"** (or Ctrl+Enter).

Wait 5-10 seconds. You should see: ✅ **"Success. No rows returned"**

---

### **3️⃣ Refresh Your App**

- Go back to your application
- Press **Ctrl+F5** (hard refresh)
- **Done!** ✨ All errors will be gone!

---

## ✅ **What You'll See After Setup:**

### **HR Staff:**
- ⏰ Clock-in/Clock-out widget
- 📊 Your daily targets & progress
- 📈 Your activity timeline
- 🔔 Your performance alerts

### **HR Managers:**
- 👥 **Live Activity** - See all staff in real-time
- 🎯 **Target Management** - Set goals for staff
- 🚨 **Alert Center** - View all alerts
- 📊 **Team Performance** - Analytics dashboard
- ⚙️ **System Settings** - Configure monitoring

---

## 🎯 **That's It!**

Just run the SQL file once, refresh your app, and everything works!

---

## 🆘 **Still Getting Errors?**

### **Verify tables were created:**
Run this in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'hr_%'
ORDER BY table_name;
```

You should see 5 tables:
- ✅ hr_performance_alerts
- ✅ hr_staff_activity_log
- ✅ hr_staff_attendance
- ✅ hr_staff_daily_metrics
- ✅ hr_staff_targets

If you don't see these 5 tables, the SQL didn't run successfully. Try again!

---

**Need the full documentation?** See `HR_PERFORMANCE_MONITORING_README.md`

