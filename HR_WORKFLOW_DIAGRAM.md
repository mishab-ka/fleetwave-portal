# HR Staff Workflow Diagram

## 🔄 Complete HR Staff Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        HR MANAGEMENT SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     ADMIN       │    │  HR MANAGER     │    │   HR STAFF      │
│                 │    │                 │    │                 │
│ • Full Access   │    │ • Manage Staff  │    │ • My Leads Only │
│ • Create Users  │    │ • Assign Leads  │    │ • Make Calls    │
│ • System Config │    │ • Monitor Team  │    │ • Update Status │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                               │
│                                                                 │
│  users table (roles) → hr_staff_assignments → hr_leads         │
│         ↓                    ↓                    ↓            │
│  admin/hr_manager/    manager-staff        lead data +         │
│  hr_staff roles       relationships        assignments         │
└─────────────────────────────────────────────────────────────────┘
```

## 📱 HR Staff Daily Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    HR STAFF DAILY ROUTINE                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MORNING    │    │   CALLING   │    │  STATUS     │    │   EVENING   │
│   CHECK      │    │   LEADS     │    │  UPDATE     │    │   REVIEW    │
│              │    │             │    │             │    │             │
│ • Check      │    │ • Click     │    │ • Update    │    │ • Review    │
│   My Leads   │    │   Call Btn  │    │   Status    │    │   Progress  │
│ • Review     │    │ • Make Call │    │ • Log       │    │ • Plan      │
│   Callbacks  │    │ • Record    │    │   Activity  │    │   Tomorrow  │
│ • Plan Day   │    │   Outcome   │    │ • Set       │    │ • Update    │
│              │    │             │    │   Callback  │    │   Manager   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🔄 Lead Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEAD STATUS FLOW                        │
└─────────────────────────────────────────────────────────────────┘

    NEW LEAD
         │
         ▼
    ┌─────────┐
    │ CONTACTED │ ◄─── Initial call made
    └─────────┘
         │
         ▼
    ┌─────────┐     ┌─────────┐
    │ HOT LEAD │     │ COLD LEAD │ ◄─── Interest level
    └─────────┘     └─────────┘
         │              │
         ▼              ▼
    ┌─────────┐     ┌─────────┐
    │ CALLBACK │     │ NOT     │ ◄─── Follow-up needed
    └─────────┘     │ INTERESTED │
         │         └─────────┘
         ▼
    ┌─────────┐
    │  JOINED  │ ◄─── Success!
    └─────────┘
```

## 📊 HR Manager Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    HR MANAGER OPERATIONS                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ STAFF       │    │ LEADS       │    │ WHATSAPP   │    │ STATUS      │
│ MANAGEMENT  │    │ MANAGEMENT  │    │ NUMBERS    │    │ MANAGEMENT  │
│             │    │             │    │            │    │             │
│ • Assign    │    │ • Add       │    │ • Add       │    │ • Create     │
│   Staff     │    │   Leads     │    │   Numbers   │    │   Statuses   │
│ • Monitor   │    │ • Assign     │    │ • Track     │    │ • Set Colors │
│   Team      │    │   to Staff  │    │   Usage     │    │ • Order      │
│ • Remove    │    │ • Reassign   │    │ • Monitor   │    │ • Enable/    │
│   Staff     │    │   Leads     │    │   Sources   │    │   Disable    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 📅 Calendar Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        CALENDAR SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MONTHLY    │    │   EVENTS    │    │   FILTERS   │    │   ACTIONS   │
│   VIEW       │    │   DISPLAY   │    │             │    │             │
│             │    │             │    │             │    │             │
│ • Calendar   │    │ • Lead Name │    │ • By Status │    │ • Click     │
│   Grid       │    │ • Phone     │    │ • By Date   │    │   Event     │
│ • Navigation │    │ • Staff     │    │ • By Staff  │    │ • View       │
│ • Month/Year│    │ • Status    │    │ • Search    │    │   Details    │
│   Select     │    │ • Date     │    │ • Sort      │    │ • Edit       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🔐 Permission Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                        PERMISSION MATRIX                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    ADMIN    │    │ HR MANAGER  │    │  HR STAFF   │    │    USER     │
│             │    │             │    │             │    │             │
│ ✅ All      │    │ ✅ Staff    │    │ ✅ My       │    │ ❌ No       │
│   Access    │    │   Mgmt      │    │   Leads     │    │   Access    │
│ ✅ Create   │    │ ✅ Lead     │    │ ✅ Call     │    │             │
│   Users     │    │   Assign    │    │   Leads     │    │             │
│ ✅ System   │    │ ✅ Monitor  │    │ ✅ Update   │    │             │
│   Config     │    │   Team      │    │   Status    │    │             │
│ ✅ Reports  │    │ ✅ Calendar │    │ ✅ Calendar │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 📱 Mobile Interface

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE INTERFACE                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   DASHBOARD │    │  MY LEADS   │    │   CALENDAR  │    │   CALLS     │
│             │    │             │    │             │    │             │
│ • Overview  │    │ • List View │    │ • Month     │    │ • Direct    │
│ • Stats     │    │ • Search    │    │   View      │    │   Dial      │
│ • Quick     │    │ • Filter    │    │ • Events    │    │ • Log       │
│   Actions   │    │ • Status    │    │ • Details   │    │   Calls     │
│ • Recent    │    │ • Actions   │    │ • Filter    │    │ • Update    │
│   Activity  │    │ • Call Btn  │    │ • Navigation│    │   Status    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🎯 Key Success Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUCCESS METRICS                          │
└─────────────────────────────────────────────────────────────────┘

📊 LEAD CONVERSION:
├── New → Contacted: 90%+
├── Contacted → Hot Lead: 30%+
├── Hot Lead → Joined: 60%+
└── Overall Conversion: 15%+

📈 STAFF PERFORMANCE:
├── Calls per day: 20-30
├── Response rate: 80%+
├── Follow-up rate: 95%+
└── Success rate: 15%+

📅 TIMELINE METRICS:
├── First contact: < 24 hours
├── Follow-up: < 48 hours
├── Decision: < 1 week
└── Joining: < 2 weeks
```








