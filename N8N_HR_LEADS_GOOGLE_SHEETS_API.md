# n8n HTTP Request Configuration - HR Leads from Google Sheets

## 📋 Overview

This API endpoint allows you to add hiring leads from Google Sheets to your HR system via n8n. Each lead is automatically and randomly assigned to an active HR staff member.

**Key Features:**

- ✅ Automatic random staff assignment
- ✅ **Duplicate phone number filtering** (leads with existing phone numbers are skipped)
- ✅ Batch processing (single or multiple leads)
- ✅ Flexible field handling (optional fields supported)

**Endpoint:** `POST /rest/v1/rpc/add_hr_leads_from_sheets`

---

## 🔧 Step-by-Step n8n Configuration

### Step 1: Add HTTP Request Node

1. Drag "HTTP Request" node to your workflow
2. Double-click to open configuration

### Step 2: Configure Basic Settings

**Method:**

- Select: `POST`

**URL:**

```
https://YOUR_SUPABASE_PROJECT.supabase.co/rest/v1/rpc/add_hr_leads_from_sheets
```

_(Replace `YOUR_SUPABASE_PROJECT` with your actual Supabase project reference)_

### Step 3: Configure Headers (CRITICAL)

**Option A: Using "Send Headers" Section (Recommended)**

1. Scroll down to **"Send Headers"** section
2. Click **"Add Header"** button
3. Add these 3 headers:

   **Header 1:**

   - **Name:** `apikey`
   - **Value:** `YOUR_SUPABASE_ANON_KEY` (get from Supabase Dashboard → Settings → API)

   **Header 2:**

   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_SUPABASE_ANON_KEY` (same key as above)

   **Header 3:**

   - **Name:** `Content-Type`
   - **Value:** `application/json`

**Option B: Using "Options" → "Headers"**

1. Click **"Options"** tab
2. Find **"Headers"** section
3. Click **"Add Header"**
4. Add the same 3 headers as above

### Step 4: Configure Body

1. Scroll to **"Body"** section
2. **Body Content Type:** Select `JSON`
3. **Body:** Use one of the formats below

**⚠️ Important:** When using n8n expressions (like `{{ $json.name }}`), you **must quote them as strings** in JSON.

**Quick Fix:** If you're getting `JSON parameter needs to be valid JSON` error, make sure your expressions are quoted:

- ✅ Correct: `"name": "{{ $json.name }}"`
- ❌ Wrong: `"name": {{ $json.name }}`

See the "Using n8n Expressions" section below for detailed examples.

---

## 📝 Request Body Formats

### Format 1: Single Lead

```json
{
  "p_leads": {
    "name": "John Doe",
    "phone": "+971501234567",
    "email": "john@example.com",
    "source": "google_sheets",
    "status": "new"
  }
}
```

### Format 2: Multiple Leads (Array)

```json
{
  "p_leads": [
    {
      "name": "Jane Smith",
      "phone": "+971501234568",
      "email": "jane@example.com",
      "source": "google_sheets"
    },
    {
      "name": "Bob Johnson",
      "phone": "+971501234569",
      "source": "google_sheets",
      "status": "new"
    }
  ]
}
```

### Field Descriptions

| Field    | Required | Type   | Description                                | Default |
| -------- | -------- | ------ | ------------------------------------------ | ------- |
| `name`   | ✅ Yes   | String | Lead's full name                           | -       |
| `phone`  | ✅ Yes   | String | Lead's phone number (max 20 chars)         | -       |
| `email`  | ❌ No    | String | Lead's email address                       | `null`  |
| `source` | ❌ No    | String | Source of the lead (e.g., "google_sheets") | `null`  |
| `status` | ❌ No    | String | Lead status                                | `"new"` |

---

## 📝 Using n8n Expressions in JSON Body

When using n8n expressions (like `{{ $json.name }}`) in the JSON body, you **must quote them as strings**. Here's the correct way:

### ✅ Correct Format (with quotes):

```json
{
  "p_leads": {
    "name": "{{ $json.name }}",
    "phone": "{{ $json.ph_num }}",
    "email": "{{ $json.email }}",
    "source": "google_sheets"
  }
}
```

### ❌ Incorrect Format (without quotes):

```json
{
  "p_leads": {
    "name": {{ $json.name }},
    "phone": {{ $json.ph_num }}
  }
}
```

**This will cause:** `JSON parameter needs to be valid JSON` error

### Alternative: Using Code Node (Recommended)

Instead of using expressions directly in JSON, use a **Code Node** to build the JSON properly:

**Code Node (JavaScript):**

```javascript
// Get the input data
const inputData = $input.first().json;

// Build the request body
const requestBody = {
  p_leads: {
    name: inputData.name || inputData.Name,
    phone: inputData.ph_num || inputData.phone || inputData.Phone,
    email: inputData.email || inputData.Email || "",
    source: inputData.source || inputData.Source || "google_sheets",
    status: inputData.status || "new",
  },
};

// Return the formatted JSON
return {
  json: requestBody,
};
```

Then in your HTTP Request node, set the body to:

```json
{{ $json }}
```

This approach is more reliable and handles edge cases better.

---

## 🔄 Google Sheets Integration Example

### n8n Workflow Structure:

```
Google Sheets Trigger
    ↓
Transform Data (if needed)
    ↓
HTTP Request (add_hr_leads_from_sheets)
    ↓
Handle Response
```

### Example: Transform Google Sheets Data

If your Google Sheets has columns: `Name`, `Phone`, `Email`, `Source`

**Code Node (JavaScript):**

```javascript
// Transform Google Sheets row to API format
const items = $input.all();

const leads = items.map((item) => {
  return {
    name: item.json.Name || item.json.name,
    phone: item.json.Phone || item.json.phone,
    email: item.json.Email || item.json.email || "",
    source: item.json.Source || item.json.source || "google_sheets",
    status: "new",
  };
});

return {
  json: {
    p_leads: leads.length === 1 ? leads[0] : leads,
  },
};
```

### HTTP Request Body (from Code Node):

```json
{
  "p_leads": [
    {
      "name": "John Doe",
      "phone": "+971501234567",
      "email": "john@example.com",
      "source": "google_sheets",
      "status": "new"
    }
  ]
}
```

---

## ✅ Expected Response

### Success Response (Single Lead):

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "phone": "+971501234567",
    "email": "john@example.com",
    "status": "new",
    "source": "google_sheets",
    "assigned_staff_user_id": "456e7890-e89b-12d3-a456-426614174001",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Success Response (Multiple Leads):

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Smith",
    "phone": "+971501234568",
    "email": "jane@example.com",
    "status": "new",
    "source": "google_sheets",
    "assigned_staff_user_id": "456e7890-e89b-12d3-a456-426614174001",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Bob Johnson",
    "phone": "+971501234569",
    "email": null,
    "status": "new",
    "source": "google_sheets",
    "assigned_staff_user_id": "789e0123-e89b-12d3-a456-426614174003",
    "created_at": "2024-01-15T10:30:01Z"
  }
]
```

---

## ⚠️ Error Responses

### Error: No Active Staff

```json
{
  "message": "No active HR staff members found. Please ensure there are staff members with role \"hr_staff\"",
  "code": "P0001"
}
```

**Solution:** Ensure you have users with `role = 'hr_staff'` in your `users` table.

### Error: Missing Required Fields

```json
{
  "message": "null value in column \"name\" of relation \"hr_leads\" violates not-null constraint",
  "code": "23502"
}
```

**Solution:** Ensure `name` and `phone` fields are provided in the request.

### Error: Invalid API Key

```json
{
  "message": "No API key found in request",
  "hint": "No `apikey` request header or url param was found."
}
```

**Solution:** Check that the `apikey` header is correctly configured in n8n.

---

## 🔍 How Staff Assignment Works

1. **Active Staff Detection:**

   - The function queries all users with `role = 'hr_staff'` in the `users` table
   - Only non-deleted users are considered

2. **Random Assignment:**

   - Each lead is randomly assigned to one of the active staff members
   - The assignment is done using PostgreSQL's `random()` function
   - Each lead gets a different random assignment (not round-robin)

3. **Alternative Function:**
   - `add_hr_leads_from_sheets_active_only()` - Only assigns to staff who are currently clocked in
   - Falls back to all hr_staff users if no one is clocked in

---

## 🚫 Duplicate Phone Number Filtering

The function **automatically filters out duplicate phone numbers**. Here's how it works:

### How Duplicate Detection Works

1. **Before Insertion:**

   - The function checks if the phone number already exists in the `hr_leads` table
   - This check is done using the `phone` column

2. **If Duplicate Found:**

   - The lead is **skipped** (not inserted)
   - No error is raised
   - The duplicate lead is not returned in the response

3. **If Not Duplicate:**
   - The lead is inserted normally
   - Assigned to a random staff member
   - Returned in the response

### Example Behavior

**Request with duplicates:**

```json
{
  "p_leads": [
    { "name": "John Doe", "phone": "+971501234567" },
    { "name": "Jane Smith", "phone": "+971501234568" },
    { "name": "Bob Johnson", "phone": "+971501234567" } // Duplicate!
  ]
}
```

**Response (only new leads):**

```json
[
  {
    "id": "...",
    "name": "John Doe",
    "phone": "+971501234567",
    ...
  },
  {
    "id": "...",
    "name": "Jane Smith",
    "phone": "+971501234568",
    ...
  }
  // Bob Johnson is NOT in the response (duplicate filtered out)
]
```

### Important Notes

- ✅ **Silent Filtering:** Duplicates are filtered silently - no errors are raised
- ✅ **Phone-Based:** Duplicate detection is based on the `phone` field only
- ✅ **Case-Sensitive:** Phone number matching is exact (case-sensitive)
- ✅ **Performance:** An index on the `phone` column ensures fast duplicate checks
- ⚠️ **Response:** Only newly inserted leads are returned (duplicates are not included)

### Checking for Duplicates

If you want to know which leads were duplicates, you can compare:

- **Input count:** Number of leads sent in the request
- **Output count:** Number of leads returned in the response
- **Difference:** The number of duplicates filtered out

**Example in n8n:**

```javascript
// After HTTP Request node
const inputCount = $("Code Node").item.json.p_leads.length;
const outputCount = $input.all().length;
const duplicatesCount = inputCount - outputCount;

console.log(`Inserted: ${outputCount}, Duplicates: ${duplicatesCount}`);
```

---

## 🧪 Testing Your Configuration

### Test with cURL:

```bash
curl -X POST \
  'https://YOUR_SUPABASE_PROJECT.supabase.co/rest/v1/rpc/add_hr_leads_from_sheets' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_leads": {
      "name": "Test Lead",
      "phone": "+971501234567",
      "email": "test@example.com",
      "source": "google_sheets"
    }
  }'
```

### Test in n8n:

1. Click **"Execute Node"** button
2. Check the output
3. Verify the lead was created and assigned to a staff member
4. Check your `hr_leads` table in Supabase

---

## 📊 Verification Checklist

Before going live, verify:

- [ ] Method is set to `POST`
- [ ] URL is correct (includes `/rpc/add_hr_leads_from_sheets`)
- [ ] `apikey` header exists (exact spelling, lowercase)
- [ ] `Authorization` header exists with `Bearer` prefix
- [ ] `Content-Type` header is `application/json`
- [ ] Body is valid JSON with `p_leads` key
- [ ] At least one user with `role = 'hr_staff'` exists
- [ ] Required fields (`name`, `phone`) are included
- [ ] Test request returns success response

---

## 🔧 Troubleshooting

### Issue: Leads not being assigned

**Check:**

- Do you have users with `role = 'hr_staff'`?
- Are those users not deleted (`deleted_at IS NULL`)?

**Query to check:**

```sql
SELECT u.id, pu.name, pu.role
FROM auth.users u
INNER JOIN public.users pu ON pu.id = u.id
WHERE pu.role = 'hr_staff' AND u.deleted_at IS NULL;
```

### Issue: Wrong staff assignment

**Note:** The assignment is random, not round-robin. Each lead gets a random staff member. If you need round-robin distribution, you'll need to modify the function.

### Issue: Duplicate leads

**✅ Fixed!** The function now automatically filters out duplicate phone numbers. Leads with phone numbers that already exist in the `hr_leads` table will be skipped silently.

**Note:**

- Duplicate detection is based on the `phone` field only
- Duplicates are not returned in the response
- No errors are raised for duplicates
- To see how many duplicates were filtered, compare input count vs output count

---

## 💡 Pro Tips

1. **Use Credentials:** Save your Supabase key as n8n credential for reuse
2. **Batch Processing:** Send multiple leads in one request for better performance
3. **Error Handling:** Add error handling nodes in n8n to catch and log failures
4. **Monitoring:** Set up alerts in n8n for failed requests
5. **Data Validation:** Validate data in n8n before sending to API

---

## 🔄 Alternative: Active Attendance Only

If you want to only assign to staff who are currently clocked in, use:

**URL:**

```
https://YOUR_SUPABASE_PROJECT.supabase.co/rest/v1/rpc/add_hr_leads_from_sheets_active_only
```

This function:

- First tries to assign to staff with active attendance (`is_active = true` and `clock_out_time IS NULL`)
- Falls back to all `hr_staff` users if no one is clocked in

---

## 📚 Related Documentation

- [N8N HTTP Request Config](./N8N_HTTP_REQUEST_CONFIG.md) - General n8n setup guide
- [HR System README](./HR_SYSTEM_README.md) - HR system overview
- [Supabase Functions](./supabase/ADD_HR_LEADS_FROM_GOOGLE_SHEETS.sql) - Function source code

---

**Need more help?** Check the error message details in n8n execution logs or Supabase function logs.
