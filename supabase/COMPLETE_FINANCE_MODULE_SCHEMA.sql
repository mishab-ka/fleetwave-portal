-- Complete Finance Module Database Schema
-- This file contains all the necessary tables for a comprehensive finance management system
-- Designed for Fleet Management System with vehicle-based operations

-- ============================================================================
-- 1. CHART OF ACCOUNTS (Enhanced)
-- ============================================================================

-- Drop existing accounts table if it exists and recreate with proper structure
DROP TABLE IF EXISTS accounts CASCADE;

CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
    parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    account_level INTEGER DEFAULT 0,
    account_path TEXT,
    is_active BOOLEAN DEFAULT true,
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('Debit', 'Credit')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_parent_id ON accounts(parent_account_id);
CREATE INDEX idx_accounts_code ON accounts(account_code);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- Function to update account paths
CREATE OR REPLACE FUNCTION update_account_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_account_id IS NULL THEN
    NEW.account_path = NEW.name;
    NEW.account_level = 0;
  ELSE
    SELECT account_path INTO NEW.account_path
    FROM accounts 
    WHERE id = NEW.parent_account_id;
    
    NEW.account_path = NEW.account_path || ' > ' || NEW.name;
    NEW.account_level = 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update account paths
CREATE TRIGGER update_account_path_trigger
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_account_path();

-- ============================================================================
-- 2. GENERAL LEDGER (Journal Entries)
-- ============================================================================

-- Journal Entries table
CREATE TABLE journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_no VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_no VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal Lines table (double-entry bookkeeping)
CREATE TABLE journal_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    vehicle_id UUID, -- Reference to vehicle if applicable
    cost_center VARCHAR(100),
    description TEXT,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    tax_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_journal_entries_date ON journal_entries(date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX idx_journal_lines_journal ON journal_lines(journal_entry_id);

-- ============================================================================
-- 3. ACCOUNTS PAYABLE
-- ============================================================================

-- Vendors table
CREATE TABLE vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gst_no VARCHAR(20),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    bank_details JSONB, -- Store bank account details
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AP Invoices table
CREATE TABLE ap_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id),
    invoice_no VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'overdue')),
    description TEXT,
    attachment_urls TEXT[], -- Array of file URLs
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AP Payments table
CREATE TABLE ap_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ap_invoice_id UUID REFERENCES ap_invoices(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'card')),
    reference VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ap_invoices_vendor ON ap_invoices(vendor_id);
CREATE INDEX idx_ap_invoices_status ON ap_invoices(status);
CREATE INDEX idx_ap_invoices_due_date ON ap_invoices(due_date);
CREATE INDEX idx_ap_payments_invoice ON ap_payments(ap_invoice_id);

-- ============================================================================
-- 4. ACCOUNTS RECEIVABLE
-- ============================================================================

-- Customers table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gst_no VARCHAR(20),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AR Invoices table
CREATE TABLE ar_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    invoice_no VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue')),
    description TEXT,
    attachment_urls TEXT[], -- Array of file URLs
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AR Receipts table
CREATE TABLE ar_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ar_invoice_id UUID REFERENCES ar_invoices(id),
    receipt_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'card')),
    reference VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ar_invoices_customer ON ar_invoices(customer_id);
CREATE INDEX idx_ar_invoices_status ON ar_invoices(status);
CREATE INDEX idx_ar_invoices_due_date ON ar_invoices(due_date);
CREATE INDEX idx_ar_receipts_invoice ON ar_receipts(ar_invoice_id);

-- ============================================================================
-- 5. FIXED ASSETS (Vehicles)
-- ============================================================================

-- Assets table
CREATE TABLE assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    vehicle_id UUID, -- Reference to vehicle if applicable
    purchase_date DATE NOT NULL,
    cost DECIMAL(15,2) NOT NULL,
    depreciation_rate DECIMAL(5,2) NOT NULL, -- Annual depreciation rate
    useful_life INTEGER NOT NULL, -- In months
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    net_book_value DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'sold')),
    disposal_date DATE,
    disposal_amount DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Depreciation Schedule table
CREATE TABLE depreciation_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month
    depreciation_amount DECIMAL(15,2) NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    is_posted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_assets_vehicle ON assets(vehicle_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_depreciation_schedule_asset ON depreciation_schedule(asset_id);
CREATE INDEX idx_depreciation_schedule_month ON depreciation_schedule(month);

-- ============================================================================
-- 6. CASH & BANK MANAGEMENT
-- ============================================================================

-- Banks table
CREATE TABLE banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    account_no VARCHAR(50) NOT NULL,
    branch VARCHAR(255),
    ifsc_code VARCHAR(20),
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank Transactions table
CREATE TABLE bank_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id UUID REFERENCES banks(id),
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    reference VARCHAR(100),
    journal_entry_id UUID REFERENCES journal_entries(id),
    is_reconciled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bank_transactions_bank ON bank_transactions(bank_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_type ON bank_transactions(type);

-- ============================================================================
-- 7. EXPENSE MANAGEMENT
-- ============================================================================

-- Expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('fuel', 'maintenance', 'toll', 'parking', 'petty_cash', 'other')),
    vehicle_id UUID, -- Reference to vehicle if applicable
    expense_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'posted')),
    attachment_urls TEXT[], -- Array of receipt URLs
    submitted_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_type ON expenses(type);

-- ============================================================================
-- 8. PAYROLL (Simplified)
-- ============================================================================

-- Employees table (extend existing users table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_driver BOOLEAN DEFAULT false;

-- Payroll table
CREATE TABLE payroll (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_salary DECIMAL(10,2) NOT NULL,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    payment_date DATE,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX idx_payroll_status ON payroll(status);

-- ============================================================================
-- 9. TAX MANAGEMENT
-- ============================================================================

-- Tax Codes table
CREATE TABLE tax_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('input', 'output')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 10. AUDIT LOGS
-- ============================================================================

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================================================
-- 11. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ap_invoices_updated_at BEFORE UPDATE ON ap_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ar_invoices_updated_at BEFORE UPDATE ON ar_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON banks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE depreciation_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Finance data is viewable by authenticated users" ON accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON journal_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON journal_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON vendors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON ap_invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON ap_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON ar_invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON ar_receipts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON assets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON depreciation_schedule FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON banks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON bank_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON payroll FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON tax_codes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance data is viewable by authenticated users" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for admin users (full access)
CREATE POLICY "Finance data is editable by admins" ON accounts FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON journal_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON journal_lines FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON vendors FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON ap_invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON ap_payments FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON customers FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON ar_invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON ar_receipts FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON assets FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON depreciation_schedule FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON banks FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON bank_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON payroll FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON tax_codes FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Finance data is editable by admins" ON audit_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- ============================================================================
-- 13. SAMPLE DATA INSERTION
-- ============================================================================

-- Insert basic Chart of Accounts
INSERT INTO accounts (account_code, name, type, normal_balance, description) VALUES
-- Assets
('1000', 'Current Assets', 'Asset', 'Debit', 'All current assets'),
('1100', 'Cash and Bank', 'Asset', 'Debit', 'Cash and bank balances'),
('1200', 'Accounts Receivable', 'Asset', 'Debit', 'Money owed by customers'),
('1300', 'Inventory', 'Asset', 'Debit', 'Vehicle parts and supplies'),
('1400', 'Prepaid Expenses', 'Asset', 'Debit', 'Prepaid insurance, rent, etc.'),
('1500', 'Fixed Assets', 'Asset', 'Debit', 'Vehicles and equipment'),
('1600', 'Accumulated Depreciation', 'Asset', 'Credit', 'Depreciation on fixed assets'),

-- Liabilities
('2000', 'Current Liabilities', 'Liability', 'Credit', 'All current liabilities'),
('2100', 'Accounts Payable', 'Liability', 'Credit', 'Money owed to vendors'),
('2200', 'Accrued Expenses', 'Liability', 'Credit', 'Accrued salaries, taxes, etc.'),
('2300', 'Short-term Loans', 'Liability', 'Credit', 'Short-term borrowings'),

-- Equity
('3000', 'Owner Equity', 'Equity', 'Credit', 'Owner capital and retained earnings'),
('3100', 'Capital', 'Equity', 'Credit', 'Owner capital contributions'),
('3200', 'Retained Earnings', 'Equity', 'Credit', 'Accumulated profits'),

-- Income
('4000', 'Operating Income', 'Income', 'Credit', 'Revenue from operations'),
('4100', 'Freight Revenue', 'Income', 'Credit', 'Revenue from freight services'),
('4200', 'Other Income', 'Income', 'Credit', 'Other sources of income'),

-- Expenses
('5000', 'Operating Expenses', 'Expense', 'Debit', 'All operating expenses'),
('5100', 'Fuel Expenses', 'Expense', 'Debit', 'Vehicle fuel costs'),
('5200', 'Maintenance Expenses', 'Expense', 'Debit', 'Vehicle maintenance costs'),
('5300', 'Insurance Expenses', 'Expense', 'Debit', 'Vehicle and business insurance'),
('5400', 'Salary Expenses', 'Expense', 'Debit', 'Employee salaries'),
('5500', 'Depreciation Expenses', 'Expense', 'Debit', 'Asset depreciation'),
('5600', 'Administrative Expenses', 'Expense', 'Debit', 'Office and admin costs');

-- Insert sample tax codes
INSERT INTO tax_codes (name, rate, type, description) VALUES
('GST_5', 5.00, 'output', 'GST 5% on services'),
('GST_12', 12.00, 'output', 'GST 12% on goods'),
('GST_18', 18.00, 'output', 'GST 18% on services'),
('GST_INPUT_5', 5.00, 'input', 'Input GST 5%'),
('GST_INPUT_12', 12.00, 'input', 'Input GST 12%'),
('GST_INPUT_18', 18.00, 'input', 'Input GST 18%');

-- Insert sample bank
INSERT INTO banks (name, account_no, branch, ifsc_code, current_balance) VALUES
('Main Business Account', '1234567890', 'Main Branch', 'SBIN0001234', 100000.00);

-- Insert sample vendor
INSERT INTO vendors (name, gst_no, contact_person, email, phone, address) VALUES
('ABC Fuel Station', '29ABCDE1234F1Z5', 'John Doe', 'john@abcfuel.com', '9876543210', '123 Main Street, City');

-- Insert sample customer
INSERT INTO customers (name, gst_no, contact_person, email, phone, address, credit_limit) VALUES
('XYZ Logistics', '29XYZDE5678G1H2', 'Jane Smith', 'jane@xyzlogistics.com', '9876543211', '456 Business Park, City', 50000.00);

COMMENT ON TABLE accounts IS 'Chart of Accounts - Main accounting structure';
COMMENT ON TABLE journal_entries IS 'General Ledger - Journal entries for double-entry bookkeeping';
COMMENT ON TABLE journal_lines IS 'Journal entry line items - debit/credit details';
COMMENT ON TABLE vendors IS 'Vendor master data for Accounts Payable';
COMMENT ON TABLE ap_invoices IS 'Accounts Payable invoices from vendors';
COMMENT ON TABLE ap_payments IS 'Payments made to vendors';
COMMENT ON TABLE customers IS 'Customer master data for Accounts Receivable';
COMMENT ON TABLE ar_invoices IS 'Accounts Receivable invoices to customers';
COMMENT ON TABLE ar_receipts IS 'Receipts received from customers';
COMMENT ON TABLE assets IS 'Fixed assets register (vehicles, equipment)';
COMMENT ON TABLE depreciation_schedule IS 'Monthly depreciation calculations';
COMMENT ON TABLE banks IS 'Bank account master data';
COMMENT ON TABLE bank_transactions IS 'Bank transaction details';
COMMENT ON TABLE expenses IS 'Expense management with approval workflow';
COMMENT ON TABLE payroll IS 'Employee payroll processing';
COMMENT ON TABLE tax_codes IS 'Tax codes for GST/VAT calculations';
COMMENT ON TABLE audit_logs IS 'Audit trail for all financial transactions';