# HR Management System

## Overview

The HR Management System is a comprehensive solution for managing human resources, lead tracking, and staff coordination. It provides separate portals for HR Managers and HR Staff with role-based access control.

## Features

### 🎯 Core Functionality

- **HR Manager Portal**: Complete management interface for HR operations
- **HR Staff Portal**: Dedicated interface for staff to manage assigned leads
- **Calendar View**: Monthly calendar showing joining dates and lead statuses
- **Lead Management**: Track leads through various statuses with full lifecycle management
- **WhatsApp Integration**: Manage inquiry numbers and communication
- **Role-Based Access**: Secure access control based on user roles

### 📊 HR Manager Features

#### Staff Management

- Add and manage HR staff members
- Assign leads to specific staff members
- Track staff performance and activity
- View staff assignments and workload distribution

#### WhatsApp Number Management

- Add and manage WhatsApp inquiry numbers
- Organize numbers by name and description
- Track which numbers are active
- Monitor inquiry sources

#### Lead Status Management

- Create custom lead statuses
- Set status colors and descriptions
- Manage system vs. custom statuses
- Track status distribution and analytics

#### Analytics & Reporting

- Overview dashboard with key metrics
- Lead status distribution charts
- Recent activity tracking
- Staff performance insights

### 👥 HR Staff Features

#### Lead Management

- View assigned leads only
- Search and filter leads by various criteria
- Update lead status and information
- Add notes and track interactions

#### Call Management

- Record call activities
- Track call dates and outcomes
- Add call notes and follow-up information
- Schedule callback dates

#### Status Updates

- Change lead status with validation
- Set callback and joining dates
- Track status change history
- View lead progression timeline

#### Calendar Integration

- View joining dates in calendar format
- Filter calendar by status and staff
- Track upcoming joining dates
- Monitor lead progression

### 📅 Calendar Features

#### Monthly View

- Full month calendar display
- Color-coded events by status
- Staff assignment visibility
- Date-based filtering

#### Event Management

- View all joining dates
- Filter by status and staff member
- Search functionality
- Event details and actions

#### Filtering & Search

- Search by lead name or staff
- Filter by status type
- Filter by staff member
- Date range filtering

## Database Schema

### Core Tables

#### `hr_managers`

- HR Manager profiles and permissions
- Links to user authentication
- Department and contact information

#### `hr_staff`

- HR Staff profiles and assignments
- Links to user authentication
- Department and contact information

#### `hr_staff_assignments`

- Links HR Managers to HR Staff
- Assignment tracking and management
- Active/inactive status

#### `hr_whatsapp_numbers`

- WhatsApp inquiry numbers
- Number descriptions and organization
- Manager assignment and tracking

#### `hr_lead_statuses`

- Customizable lead statuses
- System vs. custom statuses
- Color coding and descriptions
- Sort order management

#### `hr_leads`

- Lead information and tracking
- Status and assignment management
- Contact details and notes
- Date tracking (called, callback, joining)

#### `hr_lead_activities`

- Complete activity audit trail
- Status change tracking
- Call and interaction logging
- Staff assignment history

### Views and Functions

#### `hr_lead_summary`

- Comprehensive lead information
- Status and staff details
- Manager assignment visibility
- Optimized for reporting

#### `get_leads_by_staff(staff_user_id)`

- Staff-specific lead retrieval
- Performance optimized
- Security enforced

#### `get_hr_calendar_data(start_date, end_date)`

- Calendar event generation
- Date range filtering
- Status and staff information

## User Roles & Permissions

### Admin (Full System Access)

- **Complete Access**: All HR system features and data
- **Staff Management**: Add, edit, assign staff
- **Number Management**: WhatsApp number administration
- **Status Management**: Create and manage lead statuses
- **Analytics**: Complete system overview and reporting
- **Lead Assignment**: Assign leads to staff members
- **System Administration**: Full database access and management

### HR Manager

- **Full Access**: All HR system features
- **Staff Management**: Add, edit, assign staff
- **Number Management**: WhatsApp number administration
- **Status Management**: Create and manage lead statuses
- **Analytics**: Complete system overview and reporting
- **Lead Assignment**: Assign leads to staff members

### HR Staff

- **Assigned Leads Only**: View only assigned leads
- **Lead Management**: Update status, add notes, record calls
- **Calendar Access**: View joining dates and events
- **Limited Analytics**: Personal performance metrics
- **No System Management**: Cannot modify system settings

## Installation & Setup

### 1. Database Setup

Run the HR system schema:

```sql
-- Execute the HR_SYSTEM_SCHEMA.sql file
-- This creates all necessary tables, indexes, and functions
```

### 2. User Role Assignment

Assign HR roles to users:

```sql
-- For HR Manager
INSERT INTO hr_managers (user_id, name, email, phone, department)
VALUES ('user-uuid', 'Manager Name', 'manager@company.com', '+1234567890', 'HR');

-- For HR Staff
INSERT INTO hr_staff (user_id, name, email, phone, department)
VALUES ('user-uuid', 'Staff Name', 'staff@company.com', '+1234567890', 'HR');
```

### 3. Default Status Setup

The system automatically creates default lead statuses:

- **Confirmed**: Lead has confirmed interest
- **Cold Lead**: Low interest or not responding
- **Hot Lead**: High interest and engaged
- **Call Back**: Scheduled for callback
- **Joined**: Successfully joined the program
- **CNP**: Call Not Picked

### 4. Navigation Integration

The HR system is already integrated into the admin navigation:

- **Path**: `/admin/hr`
- **Icon**: UserPlus
- **Access**: Role-based (Admin, HR Manager, or HR Staff)

## Usage Guide

### For Admins

1. **Access the System**

   - Navigate to Admin → HR
   - System detects your admin role automatically
   - Full access to all HR features

2. **Complete System Management**

   - All HR Manager features available
   - Full database access and management
   - System administration capabilities
   - Override any restrictions

3. **Staff and Lead Management**
   - Add and manage HR staff
   - Assign leads to any staff member
   - View all leads and activities
   - Manage WhatsApp numbers and statuses

### For HR Managers

1. **Access the System**

   - Navigate to Admin → HR
   - System detects your role automatically

2. **Add HR Staff**

   - Go to Manager Portal → HR Staff tab
   - Click "Add Staff" button
   - Fill in staff details

3. **Manage WhatsApp Numbers**

   - Go to Manager Portal → WhatsApp Numbers tab
   - Add inquiry numbers with descriptions
   - Organize by source or campaign

4. **Create Custom Statuses**

   - Go to Manager Portal → Lead Statuses tab
   - Add new statuses with colors
   - Set descriptions and sort order

5. **Assign Leads to Staff**
   - View leads in Manager Portal
   - Use "Assign Leads" button for each staff member
   - Monitor assignment distribution

### For HR Staff

1. **Access Your Portal**

   - Navigate to Admin → HR
   - System shows your assigned leads

2. **Manage Leads**

   - Use search and filters to find leads
   - Update status and add notes
   - Record call activities

3. **Make Calls**

   - Click "Call" button on any lead
   - Record call notes and outcomes
   - Update callback dates

4. **View Calendar**
   - Switch to Calendar tab
   - See joining dates and events
   - Filter by status and date

### Calendar Usage

1. **Navigate Calendar**

   - Use Previous/Next buttons
   - View monthly joining dates
   - See color-coded statuses

2. **Filter Events**

   - Use search to find specific leads
   - Filter by status or staff member
   - View event summaries

3. **Event Details**
   - Click on events for details
   - See lead and staff information
   - Access quick actions

## API Endpoints

### Lead Management

- `GET /hr/leads` - Get leads (filtered by role)
- `POST /hr/leads` - Create new lead
- `PUT /hr/leads/:id` - Update lead
- `DELETE /hr/leads/:id` - Delete lead

### Status Management

- `GET /hr/statuses` - Get all statuses
- `POST /hr/statuses` - Create status
- `PUT /hr/statuses/:id` - Update status
- `DELETE /hr/statuses/:id` - Delete status

### Staff Management

- `GET /hr/staff` - Get staff members
- `POST /hr/staff` - Add staff member
- `PUT /hr/staff/:id` - Update staff
- `DELETE /hr/staff/:id` - Remove staff

### Calendar Data

- `GET /hr/calendar` - Get calendar events
- `GET /hr/calendar/:month` - Get monthly data
- `GET /hr/calendar/events` - Get filtered events

## Security Features

### Row Level Security (RLS)

- **HR Managers**: Full access to all data
- **HR Staff**: Limited to assigned leads only
- **Automatic Filtering**: Data filtered by user role

### Data Protection

- **Audit Trail**: All activities logged
- **User Tracking**: Actions linked to users
- **Permission Validation**: Server-side validation

### Access Control

- **Role-Based**: Different interfaces per role
- **Data Isolation**: Staff see only assigned leads
- **Manager Override**: Managers can access all data

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**

   - Check user role assignment
   - Verify HR Manager/Staff records exist
   - Ensure proper authentication

2. **No Leads Showing**

   - Check lead assignments
   - Verify staff-user relationship
   - Review RLS policies

3. **Calendar Not Loading**

   - Check date range parameters
   - Verify joining date data
   - Review calendar function

4. **Status Updates Failing**
   - Check status ID validity
   - Verify lead assignment
   - Review activity logging

### Database Issues

1. **Missing Tables**

   - Run HR_SYSTEM_SCHEMA.sql
   - Check table creation
   - Verify permissions

2. **RLS Policy Errors**

   - Review policy definitions
   - Check user role assignments
   - Verify authentication context

3. **Function Errors**
   - Check function definitions
   - Verify parameter types
   - Review security settings

## Performance Optimization

### Database Indexes

- Lead status and assignment indexes
- Date-based query optimization
- Staff and manager relationship indexes

### Query Optimization

- Efficient lead retrieval
- Calendar data caching
- Status distribution queries

### UI Performance

- Lazy loading for large datasets
- Optimized filtering
- Efficient calendar rendering

## Future Enhancements

### Planned Features

- **Bulk Operations**: Mass lead updates
- **Advanced Analytics**: Detailed reporting
- **Integration**: CRM system connections
- **Notifications**: Real-time updates
- **Mobile Support**: Responsive design

### Scalability

- **Performance Monitoring**: Query optimization
- **Data Archiving**: Historical data management
- **Load Balancing**: Multi-instance support
- **Caching**: Redis integration

## Support & Maintenance

### Regular Maintenance

- **Database Cleanup**: Archive old activities
- **Performance Monitoring**: Query optimization
- **Security Updates**: RLS policy reviews
- **Backup Verification**: Data integrity checks

### Monitoring

- **User Activity**: Track system usage
- **Performance Metrics**: Response times
- **Error Tracking**: System health
- **Data Quality**: Lead accuracy

## Conclusion

The HR Management System provides a comprehensive solution for managing human resources, lead tracking, and staff coordination. With role-based access control, comprehensive filtering, and calendar integration, it offers a complete solution for HR operations.

The system is designed for scalability, security, and ease of use, making it suitable for organizations of all sizes. Regular maintenance and monitoring ensure optimal performance and data integrity.
