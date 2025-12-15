# ⚠️ URGENT: Run SQL Scripts to Fix Database Errors

## You're Getting These Errors Because SQL Scripts Haven't Been Run Yet!

### Current Errors:

```
❌ column hr_lead_activities.staff_user_id does not exist
❌ Could not find a relationship between 'hr_staff_assignments' and 'users'
```

---

## ✅ SOLUTION: Run 3 SQL Scripts (5 Minutes)

### 🔴 STEP 1: Open Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left menu

### 🔴 STEP 2: Run These 3 Scripts IN ORDER

#### Script 1️⃣: Fix Staff Assignments

```
File: supabase/FIX_HR_STAFF_ASSIGNMENTS.sql
```

1. Open the file
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor
4. Click "Run" button
5. Wait for "Success" message

#### Script 2️⃣: Fix Lead Activities (FIXES YOUR CURRENT ERROR!)

```
File: supabase/FIX_HR_LEAD_ACTIVITIES.sql
```

1. Open the file
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click "Run" button
5. Wait for "Success" message

#### Script 3️⃣: Fix Calendar Function

```
File: supabase/FIX_HR_CALENDAR_FUNCTION.sql
```

1. Open the file
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click "Run" button
5. Wait for "Success" message

---

## ✅ After Running Scripts

1. **Refresh your browser** (F5 or Cmd+R)
2. **All errors will be gone!**
3. **Everything will work:**
   - ✅ Staff management
   - ✅ Lead activities logging
   - ✅ Calendar display
   - ✅ Auto lead distribution

---

## Why Am I Getting These Errors?

The code is trying to use database tables and columns that don't exist yet!

- The **code is ready** ✅
- The **database needs setup** ⏳ (that's what the SQL scripts do)

---

## This Takes Only 5 Minutes!

1. Open Supabase Dashboard (1 min)
2. Run Script 1 (1 min)
3. Run Script 2 (1 min)
4. Run Script 3 (1 min)
5. Refresh browser (1 min)

**Total: 5 minutes and you're done!** 🎉

---

## Still Seeing Errors After Running Scripts?

### Check 1: Did all scripts run successfully?

Look for "Success" or green checkmark in Supabase SQL Editor

### Check 2: Did you refresh your browser?

Press F5 or Cmd+R to reload the page

### Check 3: Verify tables exist

Run this in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('hr_staff_assignments', 'hr_lead_activities');
```

Should return both table names.

---

## 🚨 DO THIS NOW:

1. ✅ I fixed the code error (`Users` icon import)
2. ⏳ **YOU need to run the 3 SQL scripts**
3. ✅ Then refresh browser
4. ✅ Everything will work!

---

**The SQL scripts are already created and ready in your `supabase/` folder!**

Just copy-paste-run them in Supabase Dashboard → SQL Editor! 🚀
