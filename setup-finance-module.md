# Complete Finance Module Setup Guide

## Overview

This guide will help you set up the complete Finance Management module for your Fleet Management System. The module includes all standard accounting features with double-entry bookkeeping, comprehensive reporting, and fleet-specific functionality.

## 🚀 Quick Setup

### 1. Database Schema Setup

Run the following SQL script to create all necessary tables. The safe version handles existing tables and prevents conflicts:

```bash
# Navigate to your project directory
cd /Users/mishabka/Tawaaq/fleetwave-portal

# Run the complete finance module schema (safe version)
psql -h your-db-host -U your-username -d your-database -f supabase/COMPLETE_FINANCE_MODULE_SCHEMA_SAFE.sql
```

### 2. Verify Installation

After running the schema, verify that all tables were created:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'accounts', 'journal_entries', 'journal_lines',
  'vendors', 'ap_invoices', 'ap_payments',
  'customers', 'ar_invoices', 'ar_receipts',
  'assets', 'depreciation_schedule',
  'banks', 'bank_transactions',
  'expenses', 'payroll', 'tax_codes', 'audit_logs'
);
```

## 📊 Features Included

### 1. Chart of Accounts

- **Hierarchical account structure** with parent-child relationships
- **Account types**: Asset, Liability, Equity, Income, Expense
- **Account codes** for easy identification
- **Normal balance tracking** (Debit/Credit)
- **Active/Inactive status** management

### 2. General Ledger (Double-Entry Bookkeeping)

- **Journal Entries** with automatic numbering
- **Journal Lines** for debit/credit details
- **Balance validation** (debits must equal credits)
- **Entry statuses**: Draft, Posted, Reversed
- **Audit trail** with user tracking

### 3. Accounts Payable

- **Vendor management** with GST numbers
- **Invoice processing** with approval workflow
- **Payment tracking** with multiple payment methods
- **Overdue invoice** monitoring
- **Tax calculation** support

### 4. Accounts Receivable

- **Customer management** with credit limits
- **Invoice generation** for customers
- **Receipt processing** with payment tracking
- **Aging reports** for outstanding receivables

### 5. Fixed Assets (Vehicle Management)

- **Asset register** for vehicles and equipment
- **Depreciation calculation** with multiple methods
- **Monthly depreciation** automation
- **Asset disposal** tracking
- **Net book value** calculations

### 6. Cash & Bank Management

- **Multiple bank accounts** support
- **Bank transaction** import and matching
- **Reconciliation** tools
- **Balance tracking** with real-time updates

### 7. Expense Management

- **Expense categories** (fuel, maintenance, tolls, etc.)
- **Approval workflows** with status tracking
- **Receipt attachments** support
- **Vehicle-specific** expense tracking

### 8. Payroll Integration

- **Employee salary** management
- **Payroll processing** with deductions
- **Payment tracking** and journal entries
- **Cost center** allocation

### 9. Tax Management

- **GST/VAT codes** with different rates
- **Input/Output tax** tracking
- **Tax calculation** automation
- **Tax reporting** and reconciliation

### 10. Financial Reports

- **Trial Balance** with balance validation
- **Profit & Loss** statement with period filtering
- **Balance Sheet** with asset/liability/equity breakdown
- **Cash Flow** analysis (coming soon)
- **Export functionality** for all reports

## 🎯 Fleet-Specific Features

### Vehicle Cost Tracking

- **Cost per kilometer** calculations
- **Fuel expense** tracking per vehicle
- **Maintenance cost** analysis
- **Insurance and depreciation** tracking

### Driver Expense Management

- **Driver-specific** expense categories
- **Mileage tracking** and reimbursement
- **Petty cash** management
- **Expense approval** workflows

### Fleet Analytics

- **Vehicle utilization** metrics
- **Cost analysis** by vehicle
- **Profitability** tracking per route
- **Maintenance cost** trends

## 🔧 Configuration

### 1. Chart of Accounts Setup

The system comes with a pre-configured chart of accounts suitable for fleet operations:

```
Assets:
- Current Assets (1000)
  - Cash and Bank (1100)
  - Accounts Receivable (1200)
  - Inventory (1300)
  - Prepaid Expenses (1400)
- Fixed Assets (1500)
  - Vehicles (1510)
  - Equipment (1520)
  - Accumulated Depreciation (1600)

Liabilities:
- Current Liabilities (2000)
  - Accounts Payable (2100)
  - Accrued Expenses (2200)
  - Short-term Loans (2300)

Equity:
- Owner Equity (3000)
  - Capital (3100)
  - Retained Earnings (3200)

Income:
- Operating Income (4000)
  - Freight Revenue (4100)
  - Other Income (4200)

Expenses:
- Operating Expenses (5000)
  - Fuel Expenses (5100)
  - Maintenance Expenses (5200)
  - Insurance Expenses (5300)
  - Salary Expenses (5400)
  - Depreciation Expenses (5500)
  - Administrative Expenses (5600)
```

### 2. Tax Codes Setup

Pre-configured tax codes for Indian GST:

```
- GST_5: 5% output tax
- GST_12: 12% output tax
- GST_18: 18% output tax
- GST_INPUT_5: 5% input tax
- GST_INPUT_12: 12% input tax
- GST_INPUT_18: 18% input tax
```

### 3. Sample Data

The system includes sample data for:

- 1 Bank account
- 1 Vendor (ABC Fuel Station)
- 1 Customer (XYZ Logistics)
- Basic chart of accounts structure

## 📱 User Interface

### Navigation Structure

```
Finance Management
├── Dashboard (Overview & KPIs)
├── Transactions (Income/Expense tracking)
├── Bank Accounts (Cash management)
├── Categories (Account categorization)
├── Chart of Accounts (Account structure)
├── Journal Entries (Double-entry bookkeeping)
├── Accounts Payable (Vendor management)
├── Assets & Liabilities (Balance sheet items)
└── Reports (Financial statements)
```

### Key Features

- **Responsive design** for mobile and desktop
- **Real-time updates** with refresh triggers
- **Export functionality** for all reports
- **Search and filtering** across all modules
- **Bulk operations** for efficiency
- **Audit trails** for compliance

## 🔒 Security & Permissions

### Row Level Security (RLS)

- **Authenticated users** can view all data
- **Admin users** have full CRUD access
- **Audit logs** track all changes
- **Immutable journal entries** (only reversals allowed)

### Data Validation

- **Double-entry validation** (debits = credits)
- **Account type validation** for transactions
- **Date range validation** for reports
- **Amount validation** with decimal precision

## 🚀 Getting Started

### 1. Access the Finance Module

Navigate to: `Admin Panel > Finance Management`

### 2. Set Up Your Chart of Accounts

1. Go to "Chart of Accounts" tab
2. Review the pre-configured accounts
3. Add any additional accounts needed
4. Set up account hierarchies

### 3. Configure Your First Journal Entry

1. Go to "Journal Entries" tab
2. Click "New Journal Entry"
3. Add debit and credit lines
4. Ensure debits equal credits
5. Post the entry

### 4. Set Up Vendors and Customers

1. Go to "Accounts Payable" tab
2. Add your vendors
3. Create customer records
4. Set up payment terms

### 5. Generate Your First Report

1. Go to "Reports" tab
2. Select date range
3. Generate Trial Balance
4. Review P&L and Balance Sheet

## 📈 Best Practices

### 1. Daily Operations

- **Record all transactions** in real-time
- **Use proper account codes** for categorization
- **Maintain supporting documentation** (receipts, invoices)
- **Reconcile bank accounts** regularly

### 2. Monthly Closing

- **Run depreciation** calculations
- **Accrue expenses** and revenues
- **Generate financial reports**
- **Review and approve** all entries

### 3. Year-End Procedures

- **Complete asset** depreciation
- **Close revenue** and expense accounts
- **Prepare final** financial statements
- **Archive** old data

## 🆘 Troubleshooting

### Common Issues

1. **Journal entries not balancing**

   - Check that total debits equal total credits
   - Verify account types and normal balances
   - Ensure all lines have valid accounts

2. **Reports showing incorrect data**

   - Check date ranges in report parameters
   - Verify journal entries are posted (not draft)
   - Ensure accounts are active

3. **Permission errors**
   - Verify user has admin role
   - Check RLS policies are properly configured
   - Ensure user is authenticated

### Support

For technical support or questions:

- Check the audit logs for error details
- Verify database schema is complete
- Review RLS policies and permissions

## 🎉 Success!

Your complete Finance Management module is now ready! You have a full-featured accounting system with:

✅ Double-entry bookkeeping  
✅ Comprehensive reporting  
✅ Fleet-specific features  
✅ Tax management  
✅ Audit trails  
✅ Mobile-responsive UI

Start by exploring the Dashboard to see your financial overview, then dive into the specific modules based on your needs.
