-- Delete All Finance Module Tables
-- This script removes all finance-related tables and their data
-- WARNING: This will permanently delete all finance data!

-- ============================================================================
-- 1. DISABLE RLS AND DROP POLICIES
-- ============================================================================

-- Disable RLS on all finance tables
ALTER TABLE IF EXISTS accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ap_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ap_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS depreciation_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS banks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tax_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop all finance-related policies
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON accounts;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON journal_lines;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON vendors;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON ap_invoices;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON ap_payments;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON customers;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON ar_invoices;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON ar_receipts;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON assets;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON depreciation_schedule;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON banks;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON bank_transactions;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON expenses;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON payroll;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON tax_codes;
DROP POLICY IF EXISTS "Finance data is viewable by authenticated users" ON audit_logs;

DROP POLICY IF EXISTS "Finance data is editable by admins" ON accounts;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON journal_entries;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON journal_lines;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON vendors;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON ap_invoices;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON ap_payments;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON customers;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON ar_invoices;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON ar_receipts;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON assets;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON depreciation_schedule;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON banks;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON bank_transactions;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON expenses;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON payroll;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON tax_codes;
DROP POLICY IF EXISTS "Finance data is editable by admins" ON audit_logs;

-- ============================================================================
-- 2. DROP TRIGGERS
-- ============================================================================

-- Drop all finance-related triggers
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
DROP TRIGGER IF EXISTS update_ap_invoices_updated_at ON ap_invoices;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_ar_invoices_updated_at ON ar_invoices;
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
DROP TRIGGER IF EXISTS update_banks_updated_at ON banks;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS update_payroll_updated_at ON payroll;
DROP TRIGGER IF EXISTS update_account_path_trigger ON accounts;

-- ============================================================================
-- 3. DROP FUNCTIONS
-- ============================================================================

-- Drop finance-related functions
DROP FUNCTION IF EXISTS update_account_path();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- 4. DROP TABLES (in correct order due to foreign key constraints)
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS tax_codes CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS banks CASCADE;
DROP TABLE IF EXISTS depreciation_schedule CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS ar_receipts CASCADE;
DROP TABLE IF EXISTS ar_invoices CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS ap_payments CASCADE;
DROP TABLE IF EXISTS ap_invoices CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS journal_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- ============================================================================
-- 5. DROP INDEXES (if they still exist)
-- ============================================================================

-- Drop indexes that might still exist
DROP INDEX IF EXISTS idx_accounts_type;
DROP INDEX IF EXISTS idx_accounts_parent_id;
DROP INDEX IF EXISTS idx_accounts_code;
DROP INDEX IF EXISTS idx_accounts_active;
DROP INDEX IF EXISTS idx_journal_entries_date;
DROP INDEX IF EXISTS idx_journal_entries_status;
DROP INDEX IF EXISTS idx_journal_lines_account;
DROP INDEX IF EXISTS idx_journal_lines_journal;
DROP INDEX IF EXISTS idx_ap_invoices_vendor;
DROP INDEX IF EXISTS idx_ap_invoices_status;
DROP INDEX IF EXISTS idx_ap_invoices_due_date;
DROP INDEX IF EXISTS idx_ap_payments_invoice;
DROP INDEX IF EXISTS idx_ar_invoices_customer;
DROP INDEX IF EXISTS idx_ar_invoices_status;
DROP INDEX IF EXISTS idx_ar_invoices_due_date;
DROP INDEX IF EXISTS idx_ar_receipts_invoice;
DROP INDEX IF EXISTS idx_assets_vehicle;
DROP INDEX IF EXISTS idx_assets_status;
DROP INDEX IF EXISTS idx_depreciation_schedule_asset;
DROP INDEX IF EXISTS idx_depreciation_schedule_month;
DROP INDEX IF EXISTS idx_bank_transactions_bank;
DROP INDEX IF EXISTS idx_bank_transactions_date;
DROP INDEX IF EXISTS idx_bank_transactions_type;
DROP INDEX IF EXISTS idx_expenses_vehicle;
DROP INDEX IF EXISTS idx_expenses_status;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_type;
DROP INDEX IF EXISTS idx_payroll_employee;
DROP INDEX IF EXISTS idx_payroll_period;
DROP INDEX IF EXISTS idx_payroll_status;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

-- Check if any finance tables still exist
SELECT 
    'Remaining finance tables:' as info,
    table_name 
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

-- Show success message
SELECT 'SUCCESS: All finance module tables have been deleted!' as result;
