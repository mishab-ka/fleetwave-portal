# Online Drivers API Documentation

## Overview

API endpoints to retrieve all online drivers with their phone numbers and shifts for WhatsApp automation via n8n.

---

## Endpoints

### 1. Basic Online Drivers API

**Function:** `get_online_drivers()`

**Returns:** All drivers currently online

**Parameters:** None

**Response Fields:**

- `user_id` (UUID): User ID
- `name` (TEXT): Driver name
- `phone_number` (TEXT): Phone number for WhatsApp/SMS
- `email_id` (TEXT): Email address
- `driver_id` (TEXT): Driver ID
- `shift` (TEXT): Driver shift (morning/night/24hr)
- `online` (BOOLEAN): Online status (always true for this query)
- `vehicle_number` (TEXT): Assigned vehicle number
- `joining_date` (DATE): Driver joining date

---

### 2. Online Drivers with Activity API

**Function:** `get_online_drivers_with_activity()`

**Returns:** All online drivers + last report submission info

**Parameters:** None

**Response Fields:**

- All fields from basic API, plus:
- `last_report_date` (DATE): Date of last report submission
- `days_since_last_report` (INTEGER): Days since last report

---

## How to Use in n8n

### Option 1: Supabase REST API (Recommended)

**URL:**

```
POST https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_online_drivers
```

**Headers:**

```
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Body:**

```json
{}
```

**Example Response:**

```json
[
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "phone_number": "+971501234567",
    "email_id": "john@example.com",
    "driver_id": "DR001",
    "shift": "morning",
    "online": true,
    "vehicle_number": "ABC-123",
    "joining_date": "2024-01-15"
  },
  {
    "user_id": "789e4567-e89b-12d3-a456-426614174001",
    "name": "Jane Smith",
    "phone_number": "+971502345678",
    "email_id": "jane@example.com",
    "driver_id": "DR002",
    "shift": "night",
    "online": true,
    "vehicle_number": "XYZ-456",
    "joining_date": "2024-02-20"
  }
]
```

---

### Option 2: Supabase Client (JavaScript)

```javascript
const { data, error } = await supabase.rpc("get_online_drivers");

if (error) {
  console.error("Error:", error);
} else {
  console.log("Online drivers:", data);
}
```

---

## n8n Workflow Example

### Step 1: HTTP Request Node

- **Method:** POST
- **URL:** `https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_online_drivers`
- **Headers:**
  - `apikey`: Your Supabase anon key
  - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
  - `Content-Type`: `application/json`
- **Body:** `{}` (empty JSON object)

### Step 2: Split In Batches / For Each

- Process each online driver separately

### Step 3: WhatsApp Node

- **Phone:** `{{ $json.phone_number }}`
- **Message Template:**

  ```
  Hi {{ $json.name }},

  You are currently online and assigned to {{ $json.shift }} shift.
  Vehicle: {{ $json.vehicle_number }}

  Please ensure you submit your daily report on time.

  Thank you!
  ```

---

## WhatsApp Message Templates

### Template 1: Shift Reminder

```
Hi {{ $json.name }},

This is a reminder that you are on {{ $json.shift }} shift today.

Vehicle: {{ $json.vehicle_number }}

Please ensure you submit your report on time.

Thank you!
```

### Template 2: Welcome Message (for new drivers)

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

### Template 4: With Activity Info (using get_online_drivers_with_activity)

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

## Filtering by Shift

If you want to filter by shift in n8n:

### After HTTP Request Node:

Add a "Filter" node:

- **Condition:** `{{ $json.shift }} === "morning"` (or "night" or "24hr")

Or use "IF" node to send different messages based on shift.

---

## Use Cases

### 1. Daily Shift Reminder

- **Trigger:** Cron `0 8 * * *` (8 AM daily)
- **Action:** Get all online drivers → Send shift reminder

### 2. Morning Shift Welcome

- **Trigger:** Cron `0 6 * * *` (6 AM daily)
- **Action:** Get online drivers with shift="morning" → Send welcome message

### 3. Night Shift Reminder

- **Trigger:** Cron `0 18 * * *` (6 PM daily)
- **Action:** Get online drivers with shift="night" → Send reminder

### 4. Report Submission Reminder

- **Trigger:** Cron `0 20 * * *` (8 PM daily)
- **Action:** Get online drivers → Check last report date → Send reminder if needed

---

## Testing

### Test in Supabase SQL Editor:

```sql
-- Get all online drivers
SELECT * FROM get_online_drivers();

-- Get with activity
SELECT * FROM get_online_drivers_with_activity();

-- Count online drivers
SELECT COUNT(*) FROM get_online_drivers();
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

## Response Format

### Success Response:

```json
[
  {
    "user_id": "uuid",
    "name": "Driver Name",
    "phone_number": "+971501234567",
    "email_id": "driver@example.com",
    "driver_id": "DR001",
    "shift": "morning",
    "online": true,
    "vehicle_number": "ABC-123",
    "joining_date": "2024-01-15"
  }
]
```

### Empty Response (no online drivers):

```json
[]
```

---

## Setup Instructions

1. **Run SQL Script:**

   ```sql
   -- Copy and paste supabase/GET_ONLINE_DRIVERS_API.sql
   -- into Supabase SQL Editor
   ```

2. **Verify Function:**

   ```sql
   SELECT * FROM get_online_drivers();
   ```

3. **Get API Keys:**

   - Go to Supabase Dashboard
   - Settings → API
   - Copy "anon" key

4. **Test in n8n:**
   - Create HTTP Request node
   - Use POST method
   - Add headers and empty body `{}`

---

## Notes

- **Online Status:** Only returns drivers where `online = true`
- **Shift Values:** Can be "morning", "night", or "24hr"
- **Phone Number:** Includes country code (e.g., +971)
- **Empty Body:** Function takes no parameters, so send `{}` as body

---

**Created:** November 28, 2025  
**Status:** ✅ Ready for Production  
**Integration:** ✅ n8n Compatible
