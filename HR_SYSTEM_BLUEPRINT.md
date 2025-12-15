# HR Management System Blueprint

## 🏗️ System Architecture Overview

The HR Management System is built on a **role-based access control (RBAC)** architecture using the existing `users` table for role management.

### 📊 Database Structure

```
users table (existing)
├── id (UUID, Primary Key)
├── name (VARCHAR)
├── phone_number (VARCHAR)
├── role (VARCHAR) - 'admin', 'hr_manager', 'hr_staff', 'user'
└── created_at, updated_at

HR System Tables:
├── hr_lead_statuses (lead status definitions)
├── hr_whatsapp_numbers (inquiry phone numbers)
├── hr_leads (potential candidates)
├── hr_lead_activities (call logs, status changes)
├── hr_staff_assignments (manager-staff relationships)
└── get_hr_calendar_data() (RPC function for calendar)
```

## 👥 User Roles & Permissions

### 🔑 Role Hierarchy

```
Admin (Full Access)
├── Can manage all HR data
├── Can create/edit/delete HR managers
├── Can assign HR staff to managers
└── Has access to all tabs

HR Manager (Management Access)
├── Can manage assigned HR staff
├── Can create/edit lead statuses
├── Can manage WhatsApp numbers
├── Can assign leads to staff
└── Can view calendar and reports

HR Staff (Limited Access)
├── Can only see assigned leads
├── Can update lead statuses
├── Can log call activities
└── Can view calendar for assigned leads
```

## 🔄 HR Staff Workflow

### 1. **Staff Assignment Process**

```
Admin/HR Manager → HR Staff Tab → Assign Staff
├── Select from available HR staff users
├── Create assignment in hr_staff_assignments
└── Staff becomes available for lead assignment
```

### 2. **Lead Management Flow**

```
Lead Creation → Assignment → Staff Management → Status Updates
├── Lead added with phone number only
├── HR Manager assigns to specific staff
├── Staff receives lead in "My Leads" tab
├── Staff calls and updates status
└── Status changes tracked in activities
```

### 3. **Daily HR Staff Operations**

```
Morning Routine:
├── Check "My Leads" for assigned leads
├── Review call-back dates
├── Plan daily calling schedule
└── Update lead statuses

Calling Process:
├── Click "Call" button → Opens phone dialer
├── Log call outcome in activities
├── Update lead status (hot/cold/callback/joined)
├── Set call-back date if needed
└── Record joining date if successful
```

## 📱 HR Staff Interface

### **My Leads Tab (HR Staff View)**

```
Lead List Table:
├── Phone Number (searchable)
├── Current Status (with color coding)
├── Assigned Date
├── Last Call Date
├── Call-back Date
├── Joining Date
└── Actions (Call, Edit, View History)

Filters:
├── Search by phone number
├── Filter by status
├── Filter by date ranges
└── Sort by priority/date
```

### **Call Management**

```
Call Button → Phone Integration:
├── Direct dial to lead's number
├── Log call attempt
├── Update status based on outcome
├── Schedule follow-up if needed
└── Record notes/observations
```

## 📊 Lead Status Management

### **Default Statuses**

```
1. New (Blue) - Just added, not contacted
2. Contacted (Green) - Initial contact made
3. Hot Lead (Orange) - High interest, priority
4. Cold Lead (Gray) - Low interest
5. Callback (Purple) - Scheduled for follow-up
6. Joined (Green) - Successfully recruited
7. Not Interested (Red) - Declined
8. Call Not Picked (Red) - No answer
```

### **Status Flow**

```
New → Contacted → [Hot Lead/Cold Lead] → [Callback/Joined/Not Interested]
```

## 📅 Calendar System

### **Monthly Calendar View**

```
Calendar Features:
├── Shows joining dates with lead names
├── Color-coded by status
├── Staff assignment visible
├── Filter by status/date range
└── Click events for details

Event Display:
├── Lead name and phone
├── Assigned staff member
├── Current status
└── Joining date/time
```

## 🔧 HR Manager Operations

### **Staff Management**

```
HR Staff Tab:
├── View all assigned staff
├── Assign new staff members
├── Remove staff assignments
├── Monitor staff performance
└── Track staff workload
```

### **Lead Distribution**

```
Leads Management Tab:
├── View all leads in system
├── Assign leads to staff
├── Reassign leads between staff
├── Monitor lead progression
└── Generate reports
```

### **System Configuration**

```
WhatsApp Numbers Tab:
├── Add inquiry phone numbers
├── Manage multiple numbers
├── Track number usage
└── Monitor inquiry sources

Lead Statuses Tab:
├── Create custom statuses
├── Set status colors
├── Define status order
├── Enable/disable statuses
└── Manage status workflow
```

## 📈 Reporting & Analytics

### **Overview Dashboard**

```
Key Metrics:
├── Total leads count
├── HR staff count
├── WhatsApp numbers count
├── Status distribution
├── Recent activity feed
└── Performance indicators
```

### **Lead Status Distribution**

```
Visual Charts:
├── Status count breakdown
├── Conversion rates
├── Staff performance metrics
├── Monthly trends
└── Success rates
```

## 🔐 Security & Permissions

### **Row Level Security (RLS)**

```
Database Policies:
├── HR Managers can only see their assigned staff
├── HR Staff can only see their assigned leads
├── Admins have full access to all data
├── Users can only access their own records
└── Proper authentication required
```

### **Access Control**

```
Permission Matrix:
├── Create: Admin, HR Manager
├── Read: Based on role and assignments
├── Update: Own records + assigned data
├── Delete: Admin only for critical operations
└── Export: Role-based data filtering
```

## 🚀 Getting Started Guide

### **For Admins:**

1. Run `HR_SYSTEM_REDESIGNED.sql` to set up database
2. Create user accounts for HR managers
3. Set user roles to 'hr_manager' in users table
4. Create HR staff accounts and set role to 'hr_staff'
5. Access HR system via `/admin/hr`

### **For HR Managers:**

1. Login with hr_manager role
2. Go to HR Staff tab → Assign staff members
3. Go to Leads Management → Add new leads
4. Assign leads to specific staff members
5. Monitor progress via Calendar and Overview

### **For HR Staff:**

1. Login with hr_staff role
2. Go to "My Leads" tab
3. Review assigned leads
4. Make calls and update statuses
5. Use Calendar to track joining dates

## 🔄 Data Flow Diagram

```
Lead Input → HR Manager → Staff Assignment → HR Staff → Status Updates → Calendar
     ↓              ↓              ↓              ↓              ↓
Phone Number → Lead Creation → Staff Selection → Call Management → Joining Date
     ↓              ↓              ↓              ↓              ↓
WhatsApp → Lead Assignment → Staff Notification → Status Change → Calendar Event
```

## 📱 Mobile Responsiveness

### **Mobile Features:**

- Touch-friendly buttons
- Swipe navigation
- Optimized call buttons
- Responsive tables
- Mobile calendar view
- Touch dialing integration

## 🎯 Key Benefits

### **For HR Managers:**

- Centralized lead management
- Staff performance tracking
- Automated lead distribution
- Real-time status monitoring
- Comprehensive reporting

### **For HR Staff:**

- Focused lead list
- Easy call management
- Status tracking
- Calendar integration
- Mobile-friendly interface

### **For Organization:**

- Streamlined recruitment process
- Better lead conversion
- Improved staff productivity
- Data-driven decisions
- Scalable system architecture








