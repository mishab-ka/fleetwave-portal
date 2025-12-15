# HR Staff Leads Context

## Overview

This document captures everything a mobile or automation builder needs to reproduce the `HRStaffLeads.tsx` experience. It covers the data sources, business logic, UI structure, and the call-tracking workflow so the feature can be rebuilt outside this repository (e.g. in a native mobile app or low-code builder).

---

## Data Models & Supabase Tables

### Leads (`hr_leads`)
- `id` (UUID) – primary key
- `name` (string) – optional driver/applicant name
- `phone` (string) – primary identifier shown on cards and used for call/WhatsApp actions
- `status` (string) – current lead status (maps to `hr_lead_statuses.name`)
- `assigned_staff_user_id` (UUID) – Supabase `auth.users.id` for the logged-in HR staff member
- `last_call_date` (date) – optional, shown as “Last” in card info row
- `callback_date` (date) – optional, shown in orange if present
- `joining_date` (date) – optional, updated when candidate joins
- Timestamps: `created_at`, `updated_at`

### Lead Statuses (`hr_lead_statuses`)
- `id` (UUID)
- `name` (string) – machine-readable status used in `hr_leads.status`
- `display_name` (string) – human label on the badge (falls back to name)
- `color` (hex) – mapped to Tailwind-friendly classes for gradients/badges
- `description` (string)
- `is_active` (boolean)

### Lead Activities (`hr_lead_activities`)
Used when logging call outcomes:
- `lead_id`
- `staff_user_id` (Supabase `auth.users.id`)
- `activity_type` (`call_completed`, `status_change`, …)
- `description` (string – call summary, duration text, etc.)

### Call Tracking (`hr_call_tracking`)
Records detailed call metadata:
- `lead_id`
- `staff_user_id`
- `status` – the selected post-call status
- `called_date`, `callback_date`, `joining_date`
- `call_duration` (seconds)
- `notes`, `source`
- `created_at`

All queries are scoped with `.eq("assigned_staff_user_id", user?.id)` to keep data staff-specific.

---

## React State & Hooks (translated)

| Purpose | State / Logic | Notes |
| --- | --- | --- |
| Main dataset | `leads`, `setLeads` | Fetched via Supabase on mount
| Filtered list | `filteredLeads`, `setFilteredLeads` | Derived from search + status filter
| Status catalogue | `leadStatuses`, `setLeadStatuses` | Populates badge metadata & dropdowns
| Search/filter | `searchTerm`, `statusFilter` | Search is phone/name contains; status exact match unless `"all"`
| Pagination | `currentPage`, `itemsPerPage` | Defaults 1 / 10; `totalPages` computed
| Selection | `selectedLeads` (`Set<string>`), `selectAll` | Supports batch export (currently commented)
| Call modal | `isCallDialogOpen`, `selectedLead`, `callStartTime`, `callDuration`, `callData`, `isSaving`, `saveSuccess` | Drives call workflow

Computed helpers:
- `filterLeads()` – runs whenever leads/search/status change
- `paginatedLeads` – `filteredLeads.slice(startIndex, endIndex)`
- `getStatusColor(status)` – maps status color hex → Tailwind classes with fallbacks
- `getStatusIcon(status)` – returns `CheckCircle`, `XCircle`, `Clock`, etc.
- `formatTime(seconds)` – returns `hh:mm:ss`

---

## Lead List Experience (Mobile-Friendly Specs)

### Search & Filter Card
- Container: rounded-2xl, subtle border/shadow, padding `p-4`
- Search input: leading `Search` icon, `h-12`, `bg-gray-50`, transitions to white on focus
- Status dropdown: ShadCN Select styled with same height (12) & rounded corners

### Stats Ribbon
- 3 gradient cards (Total Leads, Joined, Hot Leads)
- Numbers computed from `filteredLeads`
- Colors: blue, green, orange gradients

### Lead Cards
Structure per card:
1. **Header Row**
   - Checkbox (selection) + gradient avatar showing last 2 digits of phone
   - Phone number + created date
   - Status badge: gradient background, icon (`getStatusIcon`), label from `display_name`
2. **Info Row**
   - Last call date (fallback “Never”)
   - Optional callback date in orange
3. **Actions Row**
   - Primary button `Call Now` (`onClick` → open dialog, start timer)
   - Secondary button `WhatsApp` (opens `https://wa.me/{digits}?text=...`)

### Pagination
- Visible when `filteredLeads.length > itemsPerPage`
- Shows range text and items-per-page selector (5/10/20/50)
- Prev/Next buttons & up to 5 numbered pages with active state

---

## Data Fetching & Filtering Flow

1. **Component Mount**
   - `fetchLeads()` → `hr_leads` where `assigned_staff_user_id = user.id`
   - `fetchLeadStatuses()` → all active statuses sorted by name
2. **Filtering**
   - `searchTerm`: lowercased search against `phone` (includes) and `name` (includes)
   - `statusFilter`: `"all"` bypasses; otherwise equality check
   - On change, current page resets to 1 and selections clear
3. **Derived Metrics**
   - Card metrics (`Total Leads`, `Joined`, `Hot Leads`) computed off `filteredLeads`
   - `totalPages`, `paginatedLeads` derived lazily

---

## Call Tracking Workflow (Step-by-Step)

1. **Open Modal**
   - Invoked by `Call Now` button
   - Sets `selectedLead`, pre-fills `callData` with lead info + today’s date, resets timer and flags
   - `callStartTime = new Date()`; `callDuration` resets to `0`

2. **Timer Effect**
   - `useEffect` runs every second while modal open & `callStartTime` defined
   - Duration = `(now - callStartTime) / 1000`

3. **Form Fields** (all stored in `callData`)
   - Name, Phone, Status (dropdown), Source (dropdown), Called Date, Callback Date, Joining Date, Notes (textarea)

4. **Saving** (`saveCallData`)
   - Aborts if already saving or no `selectedLead`
   - Sets `isSaving = true`
   - Inserts record into `hr_call_tracking`
   - Builds `updateData` object for lead (status, joining_date, callback_date if changed) and calls `.update()` on `hr_leads`
   - Inserts activity log into `hr_lead_activities`
   - Shows success banner (`saveSuccess = true`), closes modal after 1.5s, resets timer, refreshes leads

5. **UI States**
   - Saving state: spinner + animated progress bar + disabled buttons
   - Success state: gradient confirmation card, “Call data saved successfully”, disables save button
   - Cancel button always closes modal (disabled while saving)

6. **Navigation Actions**
   - `Start Call Now` button triggers `window.open('tel:{phone}', '_self')`
   - WhatsApp action uses sanitized digits (`lead.phone.replace(/\D/g, "")`)

---

## API & Authorization Requirements

All Supabase queries must include the user session from `useAuth()` to ensure row-level security works:
- Staff can only `SELECT` leads where `assigned_staff_user_id = auth.uid()`
- Staff can `INSERT` call tracking records with their user ID
- Lead status updates allowed when staff is assigned to the lead

Ensure RLS policies exist in Supabase (`supabase/FIX_HR_STAFF_ASSIGNMENTS.sql` etc.) so staff only touch their own records.

---

## Mobile App Builder Prompt (Ready-To-Use)

Use this prompt to reproduce the call tracking modal and lead list inside a mobile builder:

> "Create a full-screen modal titled 'Call Tracking' that opens from a lead card. It must display the lead phone number, provide a primary 'Start Call Now' button linking to tel:{phone}, and show a gradient timer card with hh:mm:ss format and a pulsing 'Recording…' indicator. Include a two-column (or single column on phones) form with fields for Name, Phone Number, Status (dropdown from active statuses), Source (dropdown: WhatsApp, Facebook, Instagram, LinkedIn, Referral, Website, Other), Called Date, Callback Date, Joining Date, and Notes (textarea). While saving, show a spinner with animated progress and disable all actions. On success, show a green confirmation card and auto-close after 1.5 seconds. Footer includes Cancel (outline) and Save Call Data (gradient) buttons. Persist form to Supabase tables hr_call_tracking, hr_leads, and hr_lead_activities exactly as documented. Ensure modal scrolls on small screens and uses rounded-3xl edges with depth.""

You can combine this with the lead-list specification above to recreate the entire HR Staff Leads experience in a mobile-native environment.

---

## Quick Reference Summary

| Feature | Implementation Notes |
| --- | --- |
| Lead Fetching | `supabase.from('hr_leads').select('*').eq('assigned_staff_user_id', user.id)` |
| Status Catalog | `supabase.from('hr_lead_statuses').select('*').eq('is_active', true)` |
| Search & Filter | Phone/name substring matching + single status filter |
| Pagination | Configurable `itemsPerPage`, page buttons, range text |
| Selection | `Set<string>` for lead IDs, optional export helpers |
| Call Modal | Timer, form, Supabase insert/update, success banner |
| Activity Logging | `hr_lead_activities` receives description + type |
| WhatsApp CTA | `https://wa.me/{digits}?text={encoded message}` |

This context document is now the single source of truth for the HR Staff Leads workflow when building outside this repository.
