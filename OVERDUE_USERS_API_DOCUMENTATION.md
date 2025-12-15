# Overdue Users API Documentation

## Overview

API endpoints to retrieve overdue users for n8n automation (WhatsApp notifications, SMS, etc.)

---

## Endpoints

### 1. Basic Overdue Users API

**Function:** `get_overdue_users(p_days_overdue)`

**Returns:** Users with overdue rent payments

**Parameters:**

- `p_days_overdue` (INTEGER, optional): Minimum days overdue (default: 1)

**Response Fields:**

- `user_id` (UUID): User ID
- `name` (TEXT): Driver name
- `phone_number` (TEXT): Phone number for WhatsApp/SMS
- `email_id` (TEXT): Email address
- `driver_id` (TEXT): Driver ID
- `overdue_date` (DATE): Date when payment became overdue
- `overdue_amount` (DECIMAL): Total overdue amount (sum of all overdue reports)
- `report_id` (UUID): Most recent overdue report ID
- `rent_date` (DATE): Date of the overdue report
- `days_overdue` (INTEGER): Number of days overdue
- `status` (TEXT): Report status

---

### 2. Overdue Users with Balance API

**Function:** `get_overdue_users_with_balance(p_days_overdue)`

**Returns:** Users with overdue rent payments + penalty/refund balance

**Parameters:**

- `p_days_overdue` (INTEGER, optional): Minimum days overdue (default: 1)

**Response Fields:**

- All fields from basic API, plus:
- `penalty_balance` (DECIMAL): Net penalty/refund balance
- `total_due` (DECIMAL): Total amount due (overdue + penalties)

---

## How to Use in n8n

### Option 1: Supabase REST API (Recommended)

**URL:**

```
POST https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_overdue_users
```

**Headers:**

```
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Body:**

```json
{
  "p_days_overdue": 1
}
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
    "overdue_date": "2025-11-25",
    "overdue_amount": 1500.0,
    "report_id": "789e4567-e89b-12d3-a456-426614174001",
    "rent_date": "2025-11-25",
    "days_overdue": 3,
    "status": "pending_verification"
  }
]
```

---

### Option 2: Supabase Client (JavaScript)

```javascript
const { data, error } = await supabase.rpc("get_overdue_users", {
  p_days_overdue: 1,
});

if (error) {
  console.error("Error:", error);
} else {
  console.log("Overdue users:", data);
}
```

---

## n8n Workflow Example

### Step 1: HTTP Request Node

- **Method:** POST
- **URL:** `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/get_overdue_users`
- **Headers:**
  - `apikey`: Your Supabase anon key
  - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
  - `Content-Type`: `application/json`
- **Body:**
  ```json
  {
    "p_days_overdue": 1
  }
  ```

### Step 2: Loop Over Results

- Use "Split In Batches" or "For Each" node
- Process each overdue user

### Step 3: WhatsApp/SMS Node

- Send notification with:
  - Name: `{{ $json.name }}`
  - Phone: `{{ $json.phone_number }}`
  - Amount: `{{ $json.overdue_amount }}`
  - Date: `{{ $json.overdue_date }}`
  - Days Overdue: `{{ $json.days_overdue }}`

### Example WhatsApp Message Template:

```
Hi {{ name }},

You have an overdue payment of ₹{{ overdue_amount }} from {{ overdue_date }} ({{ days_overdue }} days overdue).

Please make the payment at your earliest convenience.

Thank you.
```

---

## Filtering Options

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

## Data Logic

### What Makes a User "Overdue"?

1. **Report has positive `rent_paid_amount`** (driver owes money)
2. **Report status is NOT 'approved' or 'leave'**
3. **Report date is at least `p_days_overdue` days old**

### Overdue Amount Calculation

- Sums all `rent_paid_amount` from overdue reports per user
- Only includes reports that meet the overdue criteria

### Penalty Balance (with_balance function)

- Calculates net balance from `driver_penalty_transactions`
- Positive = driver owes penalties
- Negative = driver has refunds/credits

---

## Example Use Cases

### 1. Daily Overdue Reminder

- Run daily at 9 AM
- Get users overdue by 1+ days
- Send WhatsApp reminder

### 2. Weekly Escalation

- Run weekly on Monday
- Get users overdue by 7+ days
- Send stronger reminder or escalate to manager

### 3. Monthly Report

- Run monthly
- Get all overdue users
- Generate report for finance team

---

## Testing

### Test in Supabase SQL Editor:

```sql
-- Get all overdue users (1+ days)
SELECT * FROM get_overdue_users(1);

-- Get users overdue by 3+ days
SELECT * FROM get_overdue_users(3);

-- Get with penalty balance
SELECT * FROM get_overdue_users_with_balance(1);
```

### Test with cURL:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/get_overdue_users' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"p_days_overdue": 1}'
```

---

## Security

- Functions use `SECURITY DEFINER` for proper access
- Grants execute to `authenticated` and `anon` roles
- Only returns drivers (role = 'driver')
- No sensitive data exposure beyond what's needed

---

## Performance

- Indexed queries for fast lookups
- Aggregated calculations for efficiency
- Returns only necessary fields

---

## Error Handling

If no overdue users found:

- Returns empty array `[]`
- No error thrown

If database error:

- Check Supabase logs
- Verify function exists
- Check permissions

---

## Setup Instructions

1. **Run SQL Script:**

   ```sql
   -- Copy and paste supabase/GET_OVERDUE_USERS_API.sql
   -- into Supabase SQL Editor
   ```

2. **Verify Function:**

   ```sql
   SELECT * FROM get_overdue_users(1);
   ```

3. **Get API Keys:**

   - Go to Supabase Dashboard
   - Settings → API
   - Copy "anon" key

4. **Test in n8n:**
   - Create HTTP Request node
   - Use POST method
   - Add headers and body as shown above

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
    "overdue_date": "2025-11-25",
    "overdue_amount": 1500.0,
    "report_id": "uuid",
    "rent_date": "2025-11-25",
    "days_overdue": 3,
    "status": "pending_verification"
  }
]
```

### Empty Response (no overdue users):

```json
[]
```

---

## Notes

- **Overdue Date:** Date when the report became overdue (rent_date)
- **Days Overdue:** Calculated as `CURRENT_DATE - rent_date`
- **Overdue Amount:** Sum of all overdue `rent_paid_amount` for the user
- **Status:** Current status of the most recent overdue report
- **Phone Number:** Includes country code (e.g., +971)

---

**Created:** November 28, 2025  
**Status:** ✅ Ready for Production  
**Integration:** ✅ n8n Compatible
