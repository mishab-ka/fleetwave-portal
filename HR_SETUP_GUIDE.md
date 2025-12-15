# HR System Setup Guide

## Database Setup

### 1. Run the Simplified Schema

Execute the `HR_SYSTEM_SCHEMA_SIMPLIFIED.sql` file in your Supabase database. This version works with your existing `users` table structure.

### 2. How Role Assignment Works

The system works with your existing `users` table that has a `role` column. Here's how it works:

#### **Admin Users (role = 'admin')**

- Users with `role = 'admin'` in the `users` table get full HR access
- No need to add them to `hr_managers` table
- They can access all HR features automatically

#### **HR Managers**

- Add users to the `hr_managers` table to give them HR Manager access
- These users can manage staff, leads, and system settings
- They don't need to be admins in the main system

#### **HR Staff**

- Add users to the `hr_staff` table to give them HR Staff access
- These users can only see their assigned leads
- They can update lead status and add notes

### 3. Adding Users to HR System

#### **To make someone an HR Manager:**

```sql
INSERT INTO hr_managers (user_id, name, email, phone, department)
VALUES ('user-uuid-here', 'Manager Name', 'manager@company.com', '+1234567890', 'HR');
```

#### **To make someone an HR Staff:**

```sql
INSERT INTO hr_staff (user_id, name, email, phone, department)
VALUES ('user-uuid-here', 'Staff Name', 'staff@company.com', '+1234567890', 'HR');
```

### 4. Role Priority

The system checks roles in this order:

1. **Admin** - If `users.role = 'admin'` → Full HR access
2. **HR Manager** - If user exists in `hr_managers` table → Manager access
3. **HR Staff** - If user exists in `hr_staff` table → Staff access
4. **No Access** - If none of the above → Access denied

### 5. Example Scenarios

#### **Scenario 1: Admin User**

- User has `role = 'admin'` in `users` table
- **Result**: Full HR access (no need to add to hr_managers)

#### **Scenario 2: Regular User as HR Manager**

- User has `role = 'user'` in `users` table
- Added to `hr_managers` table
- **Result**: HR Manager access

#### **Scenario 3: Regular User as HR Staff**

- User has `role = 'user'` in `users` table
- Added to `hr_staff` table
- **Result**: HR Staff access (assigned leads only)

#### **Scenario 4: Admin User also as HR Manager**

- User has `role = 'admin'` in `users` table
- Also added to `hr_managers` table
- **Result**: Admin access (takes priority)

### 6. Testing the Setup

1. **Test Admin Access:**

   - Login with a user that has `role = 'admin'`
   - Navigate to `/admin/hr`
   - Should see "Admin" role and full access

2. **Test HR Manager Access:**

   - Add a user to `hr_managers` table
   - Login with that user
   - Navigate to `/admin/hr`
   - Should see "HR Manager" role and manager access

3. **Test HR Staff Access:**
   - Add a user to `hr_staff` table
   - Login with that user
   - Navigate to `/admin/hr`
   - Should see "HR Staff" role and limited access

### 7. Troubleshooting

#### **"Access Denied" Error**

- Check if user exists in `users` table
- Check if user has correct role or is in HR tables
- Verify user is authenticated

#### **Wrong Role Displayed**

- Check role priority order
- Admin role takes priority over HR Manager/Staff
- Verify user exists in correct table

#### **Database Errors**

- Make sure you ran the simplified schema
- Check that all tables were created successfully
- Verify RLS policies are in place

### 8. Quick Setup Commands

```sql
-- Check if a user exists
SELECT id, role FROM users WHERE email = 'user@example.com';

-- Add user as HR Manager
INSERT INTO hr_managers (user_id, name, email, phone, department)
VALUES ('user-uuid', 'Manager Name', 'manager@company.com', '+1234567890', 'HR');

-- Add user as HR Staff
INSERT INTO hr_staff (user_id, name, email, phone, department)
VALUES ('user-uuid', 'Staff Name', 'staff@company.com', '+1234567890', 'HR');

-- Check HR roles
SELECT
  u.email,
  u.role as system_role,
  CASE
    WHEN hm.id IS NOT NULL THEN 'HR Manager'
    WHEN hs.id IS NOT NULL THEN 'HR Staff'
    ELSE 'No HR Role'
  END as hr_role
FROM users u
LEFT JOIN hr_managers hm ON u.id = hm.user_id
LEFT JOIN hr_staff hs ON u.id = hs.user_id;
```

This setup allows you to use your existing user management system while adding HR-specific roles and permissions.
