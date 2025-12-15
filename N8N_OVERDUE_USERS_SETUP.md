# n8n Overdue Users Automation - Quick Setup

## 🚀 Quick Start

### Step 1: Run SQL Script

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste: `supabase/GET_OVERDUE_USERS_API.sql`
4. Click "Run"

### Step 2: Get Your Supabase Keys

1. Go to Supabase Dashboard → Settings → API
2. Copy:
   - **Project URL:** `https://YOUR_PROJECT.supabase.co`
   - **anon key:** `YOUR_ANON_KEY`

### Step 3: Create n8n Workflow

#### Node 1: HTTP Request (Get Overdue Users)

**Configuration Steps:**

1. **Method:** Select `POST`

2. **URL:**

   ```
   https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_overdue_users
   ```

3. **Authentication:**

   - **Type:** Select `Generic Credential Type` or `Header Auth`
   - **OR** Use "Send Headers" option (see below)

4. **Headers (IMPORTANT - Add these in "Send Headers" section):**

   - Click "Add Header" button
   - **Header 1:**
     - Name: `apikey`
     - Value: `YOUR_SUPABASE_ANON_KEY` (replace with your actual key)
   - **Header 2:**
     - Name: `Authorization`
     - Value: `Bearer YOUR_SUPABASE_ANON_KEY` (replace with your actual key)
   - **Header 3:**
     - Name: `Content-Type`
     - Value: `application/json`

5. **Body:**
   - **Body Content Type:** Select `JSON`
   - **Body:**
     ```jsonjjjj
     {
       "p_days_overdue": 1
     }
     ```

**⚠️ IMPORTANT:** Make sure the `apikey` header is added correctly. The error occurs when this header is missing.

#### Node 2: Split In Batches (Optional)

- Process each overdue user separately

#### Node 3: WhatsApp/SMS Node

- **Phone:** `{{ $json.phone_number }}`
- **Message:**

  ```
  Hi {{ $json.name }},

  You have an overdue payment of ₹{{ $json.overdue_amount }} from {{ $json.overdue_date }} ({{ $json.days_overdue }} days overdue).

  Please make the payment at your earliest convenience.

  Thank you.
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
    "overdue_date": "2025-11-25",
    "overdue_amount": 1500.0,
    "report_id": "uuid",
    "rent_date": "2025-11-25",
    "days_overdue": 3,
    "status": "pending_verification"
  }
]
```

---

## 🔧 Configuration Options

### Get users overdue by 1+ days:

```json
{ "p_days_overdue": 1 }
```

### Get users overdue by 3+ days:

```json
{ "p_days_overdue": 3 }
```

### Get users overdue by 7+ days:

```json
{ "p_days_overdue": 7 }
```

---

## 📱 WhatsApp Message Templates

### Template 1: Friendly Reminder

```
Hi {{ $json.name }},

This is a friendly reminder that you have an overdue payment of ₹{{ $json.overdue_amount }} from {{ $json.overdue_date }}.

Please make the payment at your earliest convenience.

Thank you!
```

### Template 2: Urgent Reminder

```
Hi {{ $json.name }},

URGENT: You have an overdue payment of ₹{{ $json.overdue_amount }} from {{ $json.overdue_date }} ({{ $json.days_overdue }} days overdue).

Please make the payment immediately to avoid further action.

Thank you.
```

### Template 3: Detailed Reminder

```
Hi {{ $json.name }},

Payment Reminder:
- Amount Due: ₹{{ $json.overdue_amount }}
- Overdue Date: {{ $json.overdue_date }}
- Days Overdue: {{ $json.days_overdue }}
- Status: {{ $json.status }}

Please contact us if you have any questions.

Thank you.
```

---

## ⚡ Automation Schedules

### Daily Reminder (9 AM)

- Trigger: Cron `0 9 * * *`
- Filter: `p_days_overdue: 1`
- Action: Send WhatsApp reminder

### Weekly Escalation (Monday 10 AM)

- Trigger: Cron `0 10 * * 1`
- Filter: `p_days_overdue: 7`
- Action: Send urgent reminder + notify manager

### Monthly Report (1st of month)

- Trigger: Cron `0 8 1 * *`
- Filter: `p_days_overdue: 1`
- Action: Generate report + email finance team

---

## 🧪 Testing

### Test in Supabase SQL Editor:

```sql
SELECT * FROM get_overdue_users(1);
```

### Test with cURL:

```bash
curl -X POST \
  'https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_overdue_users' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"p_days_overdue": 1}'
```

---

## 🔧 Troubleshooting

### Error: "No API key found in request"

**Problem:** The `apikey` header is missing from your HTTP Request node.

**Solution:**

1. Open your HTTP Request node in n8n
2. Go to "Options" or "Send Headers" section
3. Click "Add Header"
4. Add header with:
   - **Name:** `apikey`
   - **Value:** Your Supabase anon key
5. Make sure it's spelled exactly as `apikey` (lowercase, no spaces)
6. Save and test again

### Error: "401 Unauthorized"

**Problem:** Invalid API key or missing Authorization header.

**Solution:**

1. Verify your Supabase anon key is correct
2. Make sure both headers are added:
   - `apikey: YOUR_KEY`
   - `Authorization: Bearer YOUR_KEY`
3. Check that there are no extra spaces in the header values

### Error: "Function not found"

**Problem:** SQL function not created in Supabase.

**Solution:**

1. Go to Supabase SQL Editor
2. Run the SQL script: `supabase/GET_OVERDUE_USERS_API.sql`
3. Verify function exists: `SELECT * FROM get_overdue_users(1);`

---

## 📊 Advanced: Include Penalty Balance

Use `get_overdue_users_with_balance` for complete financial picture:

**URL:** `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/get_overdue_users_with_balance`

**Additional Fields:**

- `penalty_balance`: Net penalty/refund balance
- `total_due`: Total amount due (overdue + penalties)

---

## ✅ Checklist

- [ ] SQL script executed in Supabase
- [ ] Function tested in SQL Editor
- [ ] Supabase keys copied
- [ ] n8n workflow created
- [ ] HTTP Request node configured
- [ ] WhatsApp/SMS node configured
- [ ] Message template added
- [ ] Workflow tested
- [ ] Schedule configured (if needed)

---

**Ready to use!** 🎉
