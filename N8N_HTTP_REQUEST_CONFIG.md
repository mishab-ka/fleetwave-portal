# n8n HTTP Request Configuration - Step by Step

## ⚠️ Common Error: "No API key found in request"

This error occurs when the `apikey` header is missing. Follow these steps to fix it.

---

## 📋 Complete n8n HTTP Request Configuration

### Step 1: Add HTTP Request Node
1. Drag "HTTP Request" node to your workflow
2. Double-click to open configuration

### Step 2: Configure Basic Settings

**Method:**
- Select: `POST`

**URL:**
```
https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_overdue_users
```

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
3. **Body:**
   ```json
   {
     "p_days_overdue": 1
   }
   ```

### Step 5: Test

1. Click **"Execute Node"** button
2. Check the output
3. If you see data, it's working! ✅
4. If you see error, check headers again

---

## 🖼️ Visual Guide

### Header Configuration:
```
┌─────────────────────────────────────┐
│ Send Headers                        │
├─────────────────────────────────────┤
│ Name: apikey                        │
│ Value: eyJhbGciOiJIUzI1NiIsInR5c... │
│                                     │
│ Name: Authorization                │
│ Value: Bearer eyJhbGciOiJIUzI1...  │
│                                     │
│ Name: Content-Type                  │
│ Value: application/json             │
└─────────────────────────────────────┘
```

### Body Configuration:
```
┌─────────────────────────────────────┐
│ Body                                │
├─────────────────────────────────────┤
│ Body Content Type: JSON             │
│                                     │
│ {                                   │
│   "p_days_overdue": 1               │
│ }                                   │
└─────────────────────────────────────┘
```

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] Method is set to `POST`
- [ ] URL is correct
- [ ] `apikey` header exists (exact spelling, lowercase)
- [ ] `Authorization` header exists with `Bearer` prefix
- [ ] `Content-Type` header is `application/json`
- [ ] Body is valid JSON
- [ ] Supabase anon key is correct

---

## 🔍 How to Get Your Supabase Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Find **"anon"** key under **"Project API keys"**
5. Copy the key (it starts with `eyJ...`)

---

## 🧪 Test Your Configuration

### Expected Success Response:
```json
[
  {
    "user_id": "...",
    "name": "Driver Name",
    "phone_number": "+971...",
    "overdue_amount": 1500.0,
    ...
  }
]
```

### Expected Error (if headers wrong):
```json
{
  "message": "No API key found in request",
  "hint": "No `apikey` request header or url param was found."
}
```

---

## 💡 Pro Tips

1. **Use Credentials:** Save your Supabase key as n8n credential for reuse
2. **Test First:** Always test with `p_days_overdue: 1` first
3. **Check Logs:** If it fails, check n8n execution logs for details
4. **Copy-Paste:** Copy headers exactly as shown (case-sensitive)

---

## 🆘 Still Having Issues?

1. **Double-check header names:**
   - Must be exactly `apikey` (not `api-key` or `API-Key`)
   - Must be exactly `Authorization` (capital A)

2. **Check header values:**
   - No extra spaces
   - No quotes around the key
   - `Bearer` has a space after it: `Bearer KEY`

3. **Verify Supabase key:**
   - Key should be long (starts with `eyJ`)
   - Get fresh key from Supabase Dashboard

4. **Test with cURL first:**
   ```bash
   curl -X POST \
     'https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_overdue_users' \
     -H 'apikey: YOUR_KEY' \
     -H 'Authorization: Bearer YOUR_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"p_days_overdue": 1}'
   ```
   If cURL works but n8n doesn't, it's a header configuration issue.

---

**Need more help?** Check the error message details in n8n execution logs.

