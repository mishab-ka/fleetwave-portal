# Database Updates: New Joining, Rejoining, Going to 24hr

When you click **New Joining**, **Rejoining**, or **Going to 24hr** in Drivers Management, the following database updates happen.

---

## 1. New Joining (when driver is set to Online)

**Trigger:** Admin turns a driver **ON** (online) and selects **"New Joining"** in the modal, then confirms.

**Table:** `public.users`  
**Operation:** `UPDATE` (one row, by driver `id`)

| Column               | Value set |
|----------------------|-----------|
| `online`             | `true`    |
| `driver_status`      | `null`    |
| `joining_type`       | `'new_joining'` |
| `online_from_date`   | Today’s date (YYYY-MM-DD) |
| `offline_from_date`  | `null`    |

---

## 2. Rejoining (when driver is set to Online)

**Trigger:** Admin turns a driver **ON** (online) and selects **"Rejoining"** in the modal, then confirms.

**Table:** `public.users`  
**Operation:** `UPDATE` (one row, by driver `id`)

| Column               | Value set |
|----------------------|-----------|
| `online`             | `true`    |
| `driver_status`      | `null`    |
| `joining_type`       | `'rejoining'` |
| `online_from_date`   | Today’s date (YYYY-MM-DD) |
| `offline_from_date`  | `null`    |

---

## 3. Going to 24hr (when driver is set to Offline with status)

**Trigger:** Admin turns a driver **OFF** (offline) and selects **"Going to 24hr"** in the Leave/Resigning modal.

**Table:** `public.users`  
**Operation:** `UPDATE` (one row, by driver `id`)

| Column               | Value set |
|----------------------|-----------|
| `online`             | `false`   |
| `offline_from_date`  | Today’s date (YYYY-MM-DD) |
| `driver_status`      | `'going_to_24hr'` |

**Note:** This does **not** change the driver’s `shift` to 24hr. It only marks that they are “going to 24hr”. The actual shift (e.g. `shift = '24hr'`) is set elsewhere (e.g. Driver Details / shift dropdown).

---

## Summary

| Action        | Table   | Key columns updated |
|---------------|---------|----------------------|
| **New Joining**   | `users` | `online`, `driver_status`, `joining_type`, `online_from_date`, `offline_from_date` |
| **Rejoining**    | `users` | Same as New Joining; only `joining_type` = `'rejoining'` |
| **Going to 24hr** | `users` | `online`, `offline_from_date`, `driver_status` = `'going_to_24hr'` |

All three actions update only the **`public.users`** table. No other tables are written by these buttons. Activity is also logged via your app’s activity logger (separate from these DB updates).
