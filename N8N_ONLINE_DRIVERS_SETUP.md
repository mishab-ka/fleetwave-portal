# n8n Online Drivers API - Quick Setup

## 🚀 Quick Start

### Step 1: Run SQL Script

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste: `supabase/GET_ONLINE_DRIVERS_API.sql`
4. Click "Run"

### Step 2: Get Your Supabase Keys

1. Go to Supabase Dashboard → Settings → API
2. Copy:
   - **Project URL:** `https://upnhxshwzpbcfmumclwz.supabase.co`
   - **anon key:** `YOUR_ANON_KEY`

### Step 3: Create n8n Workflow

#### Node 1: HTTP Request (Get Online Drivers)

**Configuration:**

- **Method:** POST
- **URL:** `https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_online_drivers`
- **Headers (Add in "Send Headers" section):**
  - **Header 1:**
    - Name: `apikey`
    - Value: `YOUR_SUPABASE_ANON_KEY`
  - **Header 2:**
    - Name: `Authorization`
    - Value: `Bearer YOUR_SUPABASE_ANON_KEY`
  - **Header 3:**
    - Name: `Content-Type`
    - Value: `application/json`
- **Body:**
  - **Body Content Type:** JSON
  - **Body:** `{}` (empty JSON object)

#### Node 2: Split In Batches (Optional)

- Process each driver separately

#### Node 3: WhatsApp Node

- **Phone:** `{{ $json.phone_number }}`
- **Message:**
  ```
  Hi {{ $json.name }},

  You are currently online on {{ $json.shift }} shift.
  Vehicle: {{ $json.vehicle_number }}

  Please ensure you submit your daily report on time.

  Thank you!
  ```

---

## 📋 API Response Format

```json
[
  {
    "user_id": "uuid",
    "name": "John Doe",
    "phone_number": "+971501234567",
    "email_id": "john@example.com",
    "driver_id": "DR001",
    "shift": "morning",
    "online": true,
    "vehicle_number": "ABC-123",
    "joining_date": "2024-01-15"
  }
]
```

---

## 📱 WhatsApp Message Templates

### Template 1: Shift Reminder
```
Hi {{ $json.name }},

This is a reminder that you are on {{ $json.shift }} shift today.

Vehicle: {{ $json.vehicle_number }}

Please ensure you submit your report on time.

Thank you!
```

### Template 2: Welcome Message
```
Hi {{ $json.name }},

Welcome! You are now online and assigned to {{ $json.shift }} shift.

Vehicle: {{ $json.vehicle_number }}

Please remember to submit your daily report.

Thank you!
```

### Template 3: Daily Reminder
```
Hi {{ $json.name }},

Daily Reminder:
- Shift: {{ $json.shift }}
- Vehicle: {{ $json.vehicle_number }}
- Status: Online ✅

Please submit your report before the deadline.

Thank you!
```

---

## 🔧 Filter by Shift

### Filter Morning Shift Drivers:
Add "Filter" node after HTTP Request:
- **Condition:** `{{ $json.shift }} === "morning"`

### Filter Night Shift Drivers:
- **Condition:** `{{ $json.shift }} === "night"`

### Filter 24hr Shift Drivers:
- **Condition:** `{{ $json.shift }} === "24hr"`

---

## ⚡ Automation Schedules

### Morning Shift Reminder (6 AM)
- Trigger: Cron `0 6 * * *`
- Filter: `shift === "morning"`
- Action: Send WhatsApp reminder

### Night Shift Reminder (6 PM)
- Trigger: Cron `0 18 * * *`
- Filter: `shift === "night"`
- Action: Send WhatsApp reminder

### All Online Drivers (8 AM)
- Trigger: Cron `0 8 * * *`
- No filter
- Action: Send daily reminder to all online drivers

---

## 🧪 Testing

### Test in Supabase SQL Editor:
```sql
SELECT * FROM get_online_drivers();
```

### Test with cURL:
```bash
curl -X POST \
  'https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_online_drivers' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## 📊 Advanced: With Activity Info

Use `get_online_drivers_with_activity` for last report info:

**URL:** `https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_online_drivers_with_activity`

**Additional Fields:**
- `last_report_date`: Date of last report
- `days_since_last_report`: Days since last report

**Message Template:**
```
Hi {{ $json.name }},

You are online on {{ $json.shift }} shift.

{{#if $json.last_report_date}}
Last report: {{ $json.last_report_date }} ({{ $json.days_since_last_report }} days ago)
{{else}}
No reports submitted yet.
{{/if}}

Please submit your report today.

Thank you!
```

---

## ✅ Checklist

- [ ] SQL script executed in Supabase
- [ ] Function tested in SQL Editor
- [ ] Supabase keys copied
- [ ] n8n workflow created
- [ ] HTTP Request node configured
- [ ] Headers added correctly
- [ ] Body set to `{}`
- [ ] WhatsApp/SMS node configured
- [ ] Message template added
- [ ] Workflow tested
- [ ] Schedule configured (if needed)

---

## 🔍 Troubleshooting

### Error: "No API key found"
- Make sure `apikey` header is added in "Send Headers" section
- Check header name is exactly `apikey` (lowercase)

### Error: "Function not found"
- Run the SQL script in Supabase
- Verify function exists: `SELECT * FROM get_online_drivers();`

### Empty Response
- Check if any drivers are online: `SELECT COUNT(*) FROM users WHERE role='driver' AND online=true;`
- Verify drivers have `online = true` in database

---

**Ready to use!** 🎉

