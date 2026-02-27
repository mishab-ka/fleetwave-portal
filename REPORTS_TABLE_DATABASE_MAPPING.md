# Reports table → Database mapping

The **Recent Reports** table (Admin Reports page) comes from **one table** in Supabase.

## Database

- **Project:** Supabase (your project)
- **Schema:** `public`
- **Table:** `fleet_reports`

---

## UI column → Database column

| UI column   | Database column       | Type / notes |
|------------|------------------------|--------------|
| **ID**     | *(row number in UI)*   | Not stored; display index (1, 2, 3…) |
| **Date & time** | `submission_date` | Timestamp when report was submitted |
| **Driver** | `driver_name`          | Text |
| **Vehicle** | `vehicle_number`     | Text |
| **Trips**  | `total_trips`         | Integer |
| **Earnings** | `total_earnings`    | Numeric (₹) |
| **Toll**   | `toll`                | Numeric (₹) |
| **C C**    | `total_cashcollect`   | Numeric (₹) – Cash Collected |
| **OF**     | `other_fee`           | Numeric (₹) – Other Fee |
| **RPA**    | `rent_paid_amount`    | Numeric (₹) – Rent Paid Amount |
| **Cash**   | `cash_amount`         | Numeric (₹) – driver paying by cash; shown when `paying_cash` is true |
|             | `paying_cash`         | Boolean – driver paying by cash |
|             | `cash_manager_id`     | UUID – manager who receives cash (optional) |
| **DAE**   | *(computed in UI)*    | `total_earnings - other_fee - 600` (not a DB column) |
| **S S**   | `uber_screenshot`      | URL or null – Uber screenshot |
|             | `payment_screenshot`  | URL or null – Payment screenshot |
| **Status** | `status`              | e.g. `pending_verification`, `approved`, `rejected`, `leave`, `offline` |
| **🔧 / Actions** | *(UI only)*     | Buttons; not stored |

---

## Primary key and other useful columns

- **Primary key:** `id` (UUID)
- **User (driver):** `user_id` (UUID → `users.id`)
- **Rent date:** `rent_date` (date of the shift)
- **Shift:** `shift` (e.g. `morning`, `night`, `24hr`)
- **Rent verified:** `rent_verified` (boolean)
- **Remarks:** `remarks` (text, nullable)
- **Deposit cutting:** `deposit_cutting_amount`
- **CNG / km / service day:** `cng_expense`, `km_runned`, `is_service_day`
- **Driver phone:** `driver_phone`

---

## Where “Cash” is stored

- **Cash column in the table**  
  - **Database column:** `fleet_reports.cash_amount`  
  - **Meaning:** Amount the driver will pay by cash (when “Paying by cash” is checked).  
  - **Shown when:** `fleet_reports.paying_cash` is `true` and `cash_amount` is set.

- **Cash in Hand (summary card)**  
  - **Calculation:** Total amount = **SUM of `fleet_reports.cash_amount`** over the reports that match the current filters (date, status, search, etc.).  
  - **Where it’s stored:** That total is **not** saved in the database. It is computed when the Admin Reports page loads and stored in the **Cash in Hand** block on the same page.  
  - **Formula:** `Cash in Hand = Σ cash_amount` for all filtered rows in `fleet_reports`.

---

## Quick reference: table and main columns

```text
Database: Supabase → public.fleet_reports

Main columns used in the reports table:
  id, submission_date, driver_name, vehicle_number, total_trips,
  total_earnings, toll, total_cashcollect, other_fee, rent_paid_amount,
  paying_cash, cash_amount, cash_manager_id,
  uber_screenshot, payment_screenshot, status
```
